import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Enforce Port 3000 for AI Studio container proxy
const PORT = 3000;

app.use(express.json());

// Initialize server-side Gemini client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// -------------------------------------------------------------
// Online Multiplayer Rooms In-Memory Store
// -------------------------------------------------------------
interface ServerRoom {
  code: string;
  mode: 'duel' | 'turns' | 'secret_word';
  hostName: string;
  guestName?: string;
  hostId: string;
  guestId?: string;
  hostReady: boolean;
  guestReady: boolean;
  status: 'waiting' | 'in_progress' | 'round_over' | 'finished';
  currentRound: number;
  totalRounds: number;
  currentTurn: 'host' | 'guest';
  scores: {
    host: number;
    guest: number;
  };
  secretWord: string; // True secret word held securely on server
  category: string;
  hint?: string;
  guessedLetters: string[];
  mistakes: number;
  maxMistakes: number;
  creatorOfWord?: 'host' | 'guest';
  winner?: 'host' | 'guest' | 'draw' | null;
  lastActivity: number;
}

const rooms = new Map<string, ServerRoom>();

// Clean up stale rooms older than 3 hours
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.lastActivity > 3 * 60 * 60 * 1000) {
      rooms.delete(code);
    }
  }
}, 10 * 60 * 1000);

function generateRoomCode(): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return rooms.has(code) ? generateRoomCode() : code;
}

function normalizeCharServer(char: string): string {
  if (!char) return '';
  const upper = char.toUpperCase();
  if (upper === 'Ñ') return 'Ñ';
  return upper.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getSanitizedRoomView(room: ServerRoom, playerId?: string) {
  const isRoundFinished = room.status === 'round_over' || room.status === 'finished';
  const isWordCreator = (room.creatorOfWord === 'host' && room.hostId === playerId) ||
                        (room.creatorOfWord === 'guest' && room.guestId === playerId);

  const guessedSet = new Set(room.guessedLetters.map(l => normalizeCharServer(l)));

  // Generate display mask
  const displayWord = Array.from(room.secretWord || '').map(char => {
    if (char === ' ' || char === '-' || char === '\'') return char;
    const norm = normalizeCharServer(char);
    if (guessedSet.has(norm) || isRoundFinished || isWordCreator) {
      return char;
    }
    return '_';
  });

  return {
    code: room.code,
    mode: room.mode,
    hostName: room.hostName,
    guestName: room.guestName,
    hostReady: room.hostReady,
    guestReady: room.guestReady,
    status: room.status,
    currentRound: room.currentRound,
    totalRounds: room.totalRounds,
    currentTurn: room.currentTurn,
    scores: room.scores,
    displayWord,
    wordLength: room.secretWord ? room.secretWord.replace(/\s+/g, '').length : 0,
    category: room.category,
    hint: room.hint,
    guessedLetters: room.guessedLetters,
    mistakes: room.mistakes,
    maxMistakes: room.maxMistakes,
    winner: room.winner,
    creatorOfWord: room.creatorOfWord,
    secretWordRevealed: isRoundFinished ? room.secretWord : undefined,
  };
}

// -------------------------------------------------------------
// API Routes: AI Word Generation with Gemini 3.8 Flash
// -------------------------------------------------------------
app.post('/api/words/generate', async (req: Request, res: Response) => {
  try {
    const {
      topic = 'Cultura General',
      difficulty = 'normal',
      count = 10,
      includeHints = true,
      language = 'es',
    } = req.body;

    const requestedCount = Math.max(1, Math.min(Number(count) || 10, 50));

    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API no configurada en el servidor. Revise GEMINI_API_KEY en los secretos del proyecto.',
      });
    }

    const systemPrompt = `Eres un lingüista y diseñador de juegos de palabras experto para el clásico juego del Ahorcado en español.
Genera exactamente ${requestedCount} palabras en español sobre el tema: "${topic}".
Dificultad solicitada: ${difficulty} (facil, normal, dificil, experto).
Reglas estrictas de calidad:
1. Las palabras deben existir en el idioma español. Letras mayúsculas.
2. Evita palabras redundantes o repetidas en el mismo lote.
3. Si includeHints es verdadero, proporciona una pista pedagógica o descriptiva ingeniosa pero SIN revelar o contener la palabra secreta.
4. Las palabras deben tener entre 4 y 16 caracteres.
5. Clasifica cada palabra con su longitud exacta de letras (sin contar espacios).
6. Asigna el nivel de dificultad adecuado.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Genera ${requestedCount} palabras en formato JSON estructurado para el tema: "${topic}".`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: {
                type: Type.STRING,
                description: 'Palabra en español en mayúsculas sin caracteres extraños.',
              },
              category: {
                type: Type.STRING,
                description: 'Tema o categoría a la que pertenece.',
              },
              difficulty: {
                type: Type.STRING,
                description: 'Nivel estimado: facil, normal, dificil o experto.',
              },
              hint: {
                type: Type.STRING,
                description: 'Pista descriptiva sin revelar la palabra secreta.',
              },
              length: {
                type: Type.INTEGER,
                description: 'Cantidad de letras de la palabra.',
              },
              language: {
                type: Type.STRING,
                description: 'Código de idioma, ej: es.',
              },
            },
            required: ['word', 'category', 'difficulty', 'hint', 'length'],
          },
        },
      },
    });

    const text = response.text || '[]';
    let words = JSON.parse(text);

    // Sanitize and validate words
    words = words
      .map((item: any, idx: number) => ({
        id: `ai-${Date.now()}-${idx}`,
        word: String(item.word || '').trim().toUpperCase(),
        category: String(item.category || topic).trim(),
        difficulty: ['facil', 'normal', 'dificil', 'experto'].includes(item.difficulty?.toLowerCase())
          ? item.difficulty.toLowerCase()
          : difficulty,
        hint: includeHints ? String(item.hint || 'Sin pista disponible').trim() : '',
        length: String(item.word || '').replace(/\s+/g, '').length,
        language: language || 'es',
        createdAt: new Date().toISOString(),
        source: 'ai',
      }))
      .filter((item: any) => item.word.length >= 3 && /^[A-ZÁÉÍÓÚÑÜ\s-]+$/.test(item.word));

    return res.json({ words, topic, count: words.length });
  } catch (err: any) {
    console.error('Error in /api/words/generate:', err);
    return res.status(500).json({
      error: 'Hubo un error al generar palabras con IA. ' + (err?.message || ''),
    });
  }
});

// -------------------------------------------------------------
// API Routes: Online Multiplayer Rooms
// -------------------------------------------------------------
app.post('/api/online/create', (req: Request, res: Response) => {
  const { hostName = 'Jugador 1', mode = 'duel', totalRounds = 3 } = req.body;
  const code = generateRoomCode();
  const hostId = `player-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const room: ServerRoom = {
    code,
    mode,
    hostName: hostName.trim() || 'Jugador 1',
    hostId,
    hostReady: true,
    guestReady: false,
    status: 'waiting',
    currentRound: 1,
    totalRounds: Math.max(1, Math.min(Number(totalRounds) || 3, 10)),
    currentTurn: 'host',
    scores: { host: 0, guest: 0 },
    secretWord: '',
    category: 'Amistoso',
    hint: '',
    guessedLetters: [],
    mistakes: 0,
    maxMistakes: 7,
    lastActivity: Date.now(),
  };

  rooms.set(code, room);
  res.json({ code, playerId: hostId, room: getSanitizedRoomView(room, hostId) });
});

app.post('/api/online/join', (req: Request, res: Response) => {
  const { code, guestName = 'Jugador 2' } = req.body;
  const upperCode = String(code || '').trim().toUpperCase();

  const room = rooms.get(upperCode);
  if (!room) {
    return res.status(404).json({ error: 'La sala no existe o ha expirado.' });
  }

  if (room.guestId) {
    return res.status(400).json({ error: 'La sala ya está completa.' });
  }

  const guestId = `player-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  room.guestName = guestName.trim() || 'Jugador 2';
  room.guestId = guestId;
  room.guestReady = true;
  room.status = room.mode === 'secret_word' ? 'waiting' : 'in_progress';
  room.lastActivity = Date.now();

  // If duel or turns and no secret word yet, set a starter word
  if (room.mode !== 'secret_word' && !room.secretWord) {
    const starterWords = [
      { word: 'GALAXIA', category: 'Astronomía', hint: 'Inmenso sistema de estrellas, polvo y gas interestelar.' },
      { word: 'PIRÁMIDE', category: 'Historia', hint: 'Estructura monumental del antiguo Egipto.' },
      { word: 'ORACULO', category: 'Mitología', hint: 'Respuesta dada por una deidad a través de un sacerdote.' },
      { word: 'ACUARELA', category: 'Arte', hint: 'Técnica de pintura sobre papel con colores diluidos en agua.' },
      { word: 'CENTAURO', category: 'Mitología', hint: 'Criatura mítica mitad hombre y mitad caballo.' },
    ];
    const picked = starterWords[Math.floor(Math.random() * starterWords.length)];
    room.secretWord = picked.word;
    room.category = picked.category;
    room.hint = picked.hint;
  }

  res.json({ code: upperCode, playerId: guestId, room: getSanitizedRoomView(room, guestId) });
});

app.get('/api/online/room/:code', (req: Request, res: Response) => {
  const code = req.params.code.toUpperCase();
  const playerId = req.query.playerId as string | undefined;

  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Sala no encontrada.' });
  }

  room.lastActivity = Date.now();
  res.json({ room: getSanitizedRoomView(room, playerId) });
});

app.post('/api/online/room/:code/action', (req: Request, res: Response) => {
  const code = req.params.code.toUpperCase();
  const { playerId, action, payload } = req.body;

  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Sala no encontrada.' });
  }

  const isHost = room.hostId === playerId;
  const isGuest = room.guestId === playerId;
  if (!isHost && !isGuest) {
    return res.status(403).json({ error: 'No tienes permiso en esta sala.' });
  }

  room.lastActivity = Date.now();

  if (action === 'set_secret_word') {
    const { word, category = 'Palabra Secreta', hint = '' } = payload || {};
    const trimmedWord = String(word || '').trim().toUpperCase();
    if (trimmedWord.length < 3 || trimmedWord.length > 25) {
      return res.status(400).json({ error: 'Palabra no válida (3 a 25 letras).' });
    }

    room.secretWord = trimmedWord;
    room.category = category;
    room.hint = hint;
    room.creatorOfWord = isHost ? 'host' : 'guest';
    room.currentTurn = isHost ? 'guest' : 'host';
    room.status = 'in_progress';
    room.guessedLetters = [];
    room.mistakes = 0;
    room.winner = null;
  } else if (action === 'guess_letter') {
    if (room.status !== 'in_progress') {
      return res.status(400).json({ error: 'La partida no está en curso.' });
    }

    // In turns mode, enforce currentTurn
    if (room.mode === 'turns') {
      const isMyTurn = (room.currentTurn === 'host' && isHost) || (room.currentTurn === 'guest' && isGuest);
      if (!isMyTurn) {
        return res.status(400).json({ error: 'No es tu turno.' });
      }
    }

    const rawLetter = String(payload?.letter || '').toUpperCase();
    const normLetter = normalizeCharServer(rawLetter);
    if (!normLetter || room.guessedLetters.includes(normLetter)) {
      return res.json({ room: getSanitizedRoomView(room, playerId) });
    }

    room.guessedLetters.push(normLetter);

    // Check if letter in secret word
    const isHit = Array.from(room.secretWord).some(c => normalizeCharServer(c) === normLetter);

    if (isHit) {
      if (isHost) room.scores.host += 10;
      if (isGuest) room.scores.guest += 10;

      // Check win condition
      const guessedSet = new Set(room.guessedLetters.map(l => normalizeCharServer(l)));
      const hasWon = Array.from(room.secretWord).every(char => {
        if (char === ' ' || char === '-' || char === '\'') return true;
        return guessedSet.has(normalizeCharServer(char));
      });

      if (hasWon) {
        room.status = 'round_over';
        const roundWinner = isHost ? 'host' : 'guest';
        room.winner = roundWinner;
        if (roundWinner === 'host') room.scores.host += 50;
        else room.scores.guest += 50;
      }
    } else {
      room.mistakes += 1;
      if (room.mistakes >= room.maxMistakes) {
        room.status = 'round_over';
        // The opposing player or word creator wins
        if (room.mode === 'secret_word') {
          room.winner = room.creatorOfWord;
          if (room.creatorOfWord === 'host') room.scores.host += 50;
          else if (room.creatorOfWord === 'guest') room.scores.guest += 50;
        } else {
          room.winner = 'draw';
        }
      }
    }

    // Switch turn in turns mode
    if (room.mode === 'turns' && room.status === 'in_progress') {
      room.currentTurn = room.currentTurn === 'host' ? 'guest' : 'host';
    }
  } else if (action === 'next_round') {
    if (room.currentRound >= room.totalRounds) {
      room.status = 'finished';
      if (room.scores.host > room.scores.guest) room.winner = 'host';
      else if (room.scores.guest > room.scores.host) room.winner = 'guest';
      else room.winner = 'draw';
    } else {
      room.currentRound += 1;
      room.guessedLetters = [];
      room.mistakes = 0;
      room.winner = null;

      if (room.mode === 'secret_word') {
        // Swap word creator role
        room.creatorOfWord = room.creatorOfWord === 'host' ? 'guest' : 'host';
        room.secretWord = '';
        room.status = 'waiting';
      } else {
        const wordsPool = [
          { word: 'ALQUIMIA', category: 'Historia', hint: 'Antigua disciplina que buscaba transformar plomo en oro.' },
          { word: 'LABERINTO', category: 'Mitología', hint: 'Lugar formado por calles intrincadas del que es difícil salir.' },
          { word: 'HEURÍSTICA', category: 'Ciencia', hint: 'Método práctico para resolver problemas o descubrir.' },
          { word: 'OBSIDIANA', category: 'Geología', hint: 'Roca ígnea volcánica de aspecto vítreo y color oscuro.' },
        ];
        const next = wordsPool[(room.currentRound - 1) % wordsPool.length];
        room.secretWord = next.word;
        room.category = next.category;
        room.hint = next.hint;
        room.status = 'in_progress';
      }
    }
  }

  res.json({ room: getSanitizedRoomView(room, playerId) });
});

// -------------------------------------------------------------
// Vite Middleware / Static Serving
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`> Servidor de El Ahorcado ejecutándose en http://0.0.0.0:${PORT}`);
  });
}

startServer();
