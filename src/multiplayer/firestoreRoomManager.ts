import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { OnlineRoomState } from '../types/game';
import { normalizeChar, isLetterInWord, checkWinCondition } from '../game/rules';
import { getRandomWord } from '../data/defaultWords';

/**
 * Generates a unique 6-digit numeric invitation code (e.g., "482910").
 */
export function generateGameCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generates client session ID
 */
function generatePlayerId(): string {
  return 'ply_' + Math.random().toString(36).substring(2, 10);
}

/**
 * Builds display array for word with underscores and revealed characters
 */
function buildDisplayWord(secretWord: string, guessedSet: Set<string>): string[] {
  if (!secretWord) return [];
  return Array.from(secretWord).map(char => {
    if (char === ' ') return ' ';
    const norm = normalizeChar(char);
    return guessedSet.has(norm) ? char : '_';
  });
}

export class FirestoreRoomManager {
  private activeUnsub: Unsubscribe | null = null;

  /**
   * Creates a new multiplayer game document in the Firestore 'games' collection
   * using a unique 6-digit code.
   */
  async createRoom(
    hostName: string,
    mode: 'duel' | 'turns' | 'custom_word' | 'secret_word',
    totalRounds: number
  ): Promise<{ code: string; playerId: string; room: OnlineRoomState }> {
    const code = generateGameCode();
    const playerId = generatePlayerId();
    const docPath = `games/${code}`;

    let initialWord = '';
    let initialCategory = '';
    let initialHint = '';
    const initialMode = mode === 'secret_word' ? 'custom_word' : mode;

    if (initialMode !== 'custom_word') {
      const w = getRandomWord();
      initialWord = w.word.toUpperCase();
      initialCategory = w.category;
      initialHint = w.hint;
    }

    const emptyGuessed = new Set<string>();
    const displayWord = buildDisplayWord(initialWord, emptyGuessed);

    const room: OnlineRoomState = {
      code,
      hostName: hostName.trim() || 'Anfitrión',
      guestName: '',
      hostId: playerId,
      guestId: '',
      hostReady: true,
      guestReady: false,
      mode: initialMode,
      status: 'waiting',
      totalRounds: Math.max(1, Math.min(Number(totalRounds) || 3, 10)),
      currentRound: 1,
      currentTurn: 'host',
      activePlayer: 'host',
      scores: { host: 0, guest: 0 },
      secretWord: initialWord,
      maskedWord: displayWord.join(' '),
      displayWord: displayWord,
      category: initialCategory || 'Desafío Entre Amigos',
      hint: initialHint,
      guessedLetters: [],
      mistakes: 0,
      maxMistakes: 7,
      creatorOfWord: initialMode === 'custom_word' ? 'host' : '',
      winner: '',
      secretWordRevealed: '',
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'games', code), room);
      return { code, playerId, room };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
  }

  /**
   * Joins an existing game room in Firestore 'games' by 6-digit code.
   */
  async joinRoom(
    code: string,
    guestName: string
  ): Promise<{ code: string; playerId: string; room: OnlineRoomState }> {
    const cleanCode = code.trim().replace(/\D/g, '').slice(0, 6);
    if (cleanCode.length !== 6) {
      throw new Error('El código de sala debe contener exactamente 6 dígitos.');
    }
    const docPath = `games/${cleanCode}`;

    try {
      const snap = await getDoc(doc(db, 'games', cleanCode));
      if (!snap.exists()) {
        throw new Error(`La sala con código ${cleanCode} no existe o ya caducó.`);
      }

      const existingData = snap.data() as OnlineRoomState;

      if (existingData.guestName && existingData.guestName.trim() !== '') {
        throw new Error('Esta sala ya cuenta con 2 jugadores.');
      }

      const playerId = generatePlayerId();
      // If secret word is already ready, start immediately
      const newStatus = existingData.mode === 'custom_word' && !existingData.secretWord
        ? 'waiting'
        : 'in_progress';

      const updates: Partial<OnlineRoomState> = {
        guestName: guestName.trim() || 'Invitado',
        guestId: playerId,
        guestReady: true,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'games', cleanCode), updates);

      return {
        code: cleanCode,
        playerId,
        room: { ...existingData, ...updates },
      };
    } catch (err: any) {
      if (err.message && (err.message.includes('código') || err.message.includes('sala'))) {
        throw err;
      }
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  }

  /**
   * Subscribes to real-time updates for a 6-digit game in 'games/{code}'.
   */
  subscribeRoom(
    code: string,
    onUpdate: (room: OnlineRoomState) => void,
    onError: (err: any) => void
  ): () => void {
    const cleanCode = code.trim().slice(0, 6);
    const docPath = `games/${cleanCode}`;

    if (this.activeUnsub) {
      this.activeUnsub();
      this.activeUnsub = null;
    }

    this.activeUnsub = onSnapshot(
      doc(db, 'games', cleanCode),
      snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data() as OnlineRoomState;
          // Ensure displayWord is always an array for UI mapping
          if (!data.displayWord || !Array.isArray(data.displayWord)) {
            const guessedSet = new Set(data.guessedLetters || []);
            data.displayWord = buildDisplayWord(data.secretWord || '', guessedSet);
          }
          onUpdate(data);
        }
      },
      error => {
        try {
          handleFirestoreError(error, OperationType.GET, docPath);
        } catch (wrappedErr) {
          onError(wrappedErr);
        }
      }
    );

    return () => {
      if (this.activeUnsub) {
        this.activeUnsub();
        this.activeUnsub = null;
      }
    };
  }

  /**
   * Dispatches a gameplay action to the Firestore 'games' collection,
   * synchronizing guessed letters, mistakes, display word and scores in real time.
   */
  async sendAction(code: string, playerId: string, action: string, payload?: any): Promise<void> {
    const cleanCode = code.trim().slice(0, 6);
    const docPath = `games/${cleanCode}`;

    try {
      const snap = await getDoc(doc(db, 'games', cleanCode));
      if (!snap.exists()) return;

      const room = snap.data() as OnlineRoomState;
      const isHost = playerId === room.hostId;
      const playerRole: 'host' | 'guest' = isHost ? 'host' : 'guest';

      const updates: Partial<OnlineRoomState> = {
        updatedAt: new Date().toISOString(),
      };

      if (action === 'set_secret_word') {
        const { word, hint, category } = payload || {};
        if (word && word.trim().length >= 3) {
          const cleanWord = word.trim().toUpperCase();
          const emptyGuessed = new Set<string>();
          const displayWord = buildDisplayWord(cleanWord, emptyGuessed);

          updates.secretWord = cleanWord;
          updates.hint = (hint || '').trim();
          updates.category = (category || 'Desafío Entre Amigos').trim();
          updates.guessedLetters = [];
          updates.mistakes = 0;
          updates.displayWord = displayWord;
          updates.maskedWord = displayWord.join(' ');
          updates.secretWordRevealed = '';
          updates.status = room.guestName ? 'in_progress' : 'waiting';
        }
      } else if (action === 'guess_letter') {
        const rawLetter = payload?.letter;
        if (!rawLetter || !room.secretWord) return;
        if (room.status !== 'in_progress' && room.status !== 'playing') return;

        // Turn enforcement in 'turns' mode
        if (room.mode === 'turns' && room.currentTurn && room.currentTurn !== playerRole) {
          return;
        }

        const normGuess = normalizeChar(rawLetter);
        const guessedList = [...(room.guessedLetters || [])];
        const guessedSet = new Set(guessedList.map(l => normalizeChar(l)));

        if (guessedSet.has(normGuess)) return; // letter already guessed

        guessedList.push(rawLetter.toUpperCase());
        guessedSet.add(normGuess);
        updates.guessedLetters = guessedList;

        const isHit = isLetterInWord(normGuess, room.secretWord);
        let nextMistakes = room.mistakes || 0;

        if (!isHit) {
          nextMistakes += 1;
          updates.mistakes = nextMistakes;
        }

        // Update display word
        const newDisplay = buildDisplayWord(room.secretWord, guessedSet);
        updates.displayWord = newDisplay;
        updates.maskedWord = newDisplay.join(' ');

        // Check victory / defeat
        const isWon = checkWinCondition(room.secretWord, guessedSet);
        const isLost = nextMistakes >= (room.maxMistakes || 7);

        if (isWon || isLost) {
          const nextScores = { host: room.scores?.host || 0, guest: room.scores?.guest || 0 };
          updates.secretWordRevealed = room.secretWord;

          if (isWon) {
            nextScores[playerRole] = (nextScores[playerRole] || 0) + 1;
            updates.winner = playerRole;
          } else {
            // Lost by hangman
            updates.winner = 'draw';
          }

          updates.scores = nextScores;

          if (room.currentRound >= room.totalRounds) {
            updates.status = 'finished';
          } else {
            updates.status = 'round_over';
          }
        } else if (room.mode === 'turns') {
          // Switch active turn to other player
          const nextTurn: 'host' | 'guest' = room.currentTurn === 'host' ? 'guest' : 'host';
          updates.currentTurn = nextTurn;
          updates.activePlayer = nextTurn;
        }
      } else if (action === 'next_round') {
        const nextRoundNum = (room.currentRound || 1) + 1;
        if (nextRoundNum <= room.totalRounds) {
          updates.currentRound = nextRoundNum;
          updates.guessedLetters = [];
          updates.mistakes = 0;
          updates.winner = '';
          updates.secretWordRevealed = '';

          if (room.mode === 'custom_word') {
            const nextCreator = room.creatorOfWord === 'host' ? 'guest' : 'host';
            updates.creatorOfWord = nextCreator;
            updates.secretWord = '';
            updates.displayWord = [];
            updates.maskedWord = '';
            updates.hint = '';
            updates.status = 'waiting';
          } else {
            const nextW = getRandomWord();
            const wUpper = nextW.word.toUpperCase();
            const emptyGuessed = new Set<string>();
            const newDisplay = buildDisplayWord(wUpper, emptyGuessed);

            updates.secretWord = wUpper;
            updates.category = nextW.category;
            updates.hint = nextW.hint;
            updates.displayWord = newDisplay;
            updates.maskedWord = newDisplay.join(' ');
            updates.status = 'in_progress';
            updates.currentTurn = nextRoundNum % 2 === 1 ? 'host' : 'guest';
            updates.activePlayer = updates.currentTurn;
          }
        }
      } else if (action === 'restart_match') {
        updates.currentRound = 1;
        updates.scores = { host: 0, guest: 0 };
        updates.guessedLetters = [];
        updates.mistakes = 0;
        updates.winner = '';
        updates.secretWordRevealed = '';

        if (room.mode === 'custom_word') {
          updates.creatorOfWord = 'host';
          updates.secretWord = '';
          updates.displayWord = [];
          updates.maskedWord = '';
          updates.hint = '';
          updates.status = 'waiting';
        } else {
          const nextW = getRandomWord();
          const wUpper = nextW.word.toUpperCase();
          const emptyGuessed = new Set<string>();
          const newDisplay = buildDisplayWord(wUpper, emptyGuessed);

          updates.secretWord = wUpper;
          updates.category = nextW.category;
          updates.hint = nextW.hint;
          updates.displayWord = newDisplay;
          updates.maskedWord = newDisplay.join(' ');
          updates.status = 'in_progress';
          updates.currentTurn = 'host';
          updates.activePlayer = 'host';
        }
      }

      await updateDoc(doc(db, 'games', cleanCode), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
  }

  destroy(): void {
    if (this.activeUnsub) {
      this.activeUnsub();
      this.activeUnsub = null;
    }
  }
}
