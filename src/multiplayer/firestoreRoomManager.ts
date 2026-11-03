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
import { normalizeChar, isLetterInWord, getDisplayMask, checkWinCondition } from '../game/rules';
import { getRandomWord } from '../data/defaultWords';

// Generate 6-char alphanumeric code (excluding ambiguous 0/O, 1/I)
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate client session UUID
function generatePlayerId(): string {
  return 'ply_' + Math.random().toString(36).substring(2, 10);
}

export class FirestoreRoomManager {
  private activeUnsub: Unsubscribe | null = null;

  /**
   * Creates a new multiplayer room in Firestore.
   */
  async createRoom(
    hostName: string,
    mode: 'duel' | 'turns' | 'custom_word',
    totalRounds: number
  ): Promise<{ code: string; playerId: string; room: OnlineRoomState }> {
    const code = generateRoomCode();
    const playerId = generatePlayerId();
    const docPath = `rooms/${code}`;

    let initialWord = '';
    let initialCategory = '';
    let initialHint = '';
    let status: OnlineRoomState['status'] = 'waiting';

    if (mode !== 'custom_word') {
      const w = getRandomWord();
      initialWord = w.word;
      initialCategory = w.category;
      initialHint = w.hint;
    }

    const room: OnlineRoomState = {
      code,
      hostName: hostName.trim() || 'Anfitrión',
      guestName: '',
      hostId: playerId,
      guestId: '',
      mode,
      status,
      totalRounds: Number(totalRounds) || 3,
      currentRound: 1,
      scores: { host: 0, guest: 0 },
      secretWord: initialWord,
      maskedWord: initialWord ? getDisplayMask(initialWord, new Set()).join(' ') : '',
      category: initialCategory,
      hint: initialHint,
      guessedLetters: [],
      mistakes: 0,
      maxMistakes: 7,
      activePlayer: 'host',
      creatorOfWord: mode === 'custom_word' ? 'host' : '',
      winner: '',
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'rooms', code), room);
      return { code, playerId, room };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
  }

  /**
   * Joins an existing room by code.
   */
  async joinRoom(
    code: string,
    guestName: string
  ): Promise<{ code: string; playerId: string; room: OnlineRoomState }> {
    const cleanCode = code.trim().toUpperCase();
    const docPath = `rooms/${cleanCode}`;

    try {
      const snap = await getDoc(doc(db, 'rooms', cleanCode));
      if (!snap.exists()) {
        throw new Error('La sala no existe o el código es incorrecto.');
      }

      const existingData = snap.data() as OnlineRoomState;

      if (existingData.guestName && existingData.guestName.trim() !== '') {
        // If guest already in, prevent third player
        throw new Error('La sala ya tiene dos jugadores.');
      }

      const playerId = generatePlayerId();
      const updatedStatus: OnlineRoomState['status'] =
        existingData.mode === 'custom_word' && !existingData.secretWord ? 'waiting' : 'playing';

      const updates: Partial<OnlineRoomState> = {
        guestName: guestName.trim() || 'Invitado',
        guestId: playerId,
        status: updatedStatus,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'rooms', cleanCode), updates);

      return {
        code: cleanCode,
        playerId,
        room: { ...existingData, ...updates },
      };
    } catch (err: any) {
      if (err.message && err.message.includes('La sala')) {
        throw err;
      }
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  }

  /**
   * Subscribes to real-time updates of a room with secure error handling.
   */
  subscribeRoom(
    code: string,
    onUpdate: (room: OnlineRoomState) => void,
    onError: (err: any) => void
  ): () => void {
    const docPath = `rooms/${code}`;

    if (this.activeUnsub) {
      this.activeUnsub();
      this.activeUnsub = null;
    }

    this.activeUnsub = onSnapshot(
      doc(db, 'rooms', code),
      snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data() as OnlineRoomState;
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
   * Dispatches a gameplay action to Firestore.
   */
  async sendAction(code: string, playerId: string, action: string, payload?: any): Promise<void> {
    const docPath = `rooms/${code}`;

    try {
      const snap = await getDoc(doc(db, 'rooms', code));
      if (!snap.exists()) return;

      const room = snap.data() as OnlineRoomState;
      const isHost = playerId === room.hostId;
      const isGuest = playerId === room.guestId;
      const playerRole: 'host' | 'guest' = isHost ? 'host' : 'guest';

      const updates: Partial<OnlineRoomState> = {
        updatedAt: new Date().toISOString(),
      };

      if (action === 'set_secret_word') {
        const { word, hint, category } = payload || {};
        if (word && word.trim().length >= 3) {
          const cleanWord = word.trim().toUpperCase();
          updates.secretWord = cleanWord;
          updates.hint = (hint || '').trim();
          updates.category = (category || 'Desafío Entre Amigos').trim();
          updates.guessedLetters = [];
          updates.mistakes = 0;
          updates.maskedWord = getDisplayMask(cleanWord, new Set()).join(' ');
          updates.status = room.guestName ? 'playing' : 'waiting';
        }
      } else if (action === 'guess_letter') {
        const rawLetter = payload?.letter;
        if (!rawLetter || !room.secretWord || room.status !== 'playing') return;

        // If turn-based, only active player can guess
        if (room.mode === 'turns' && room.activePlayer !== playerRole) {
          return;
        }

        const normGuess = normalizeChar(rawLetter);
        const guessedSet = new Set(room.guessedLetters || []);

        if (guessedSet.has(normGuess)) return; // already guessed

        guessedSet.add(normGuess);
        updates.guessedLetters = Array.from(guessedSet);

        const isHit = isLetterInWord(normGuess, room.secretWord);
        let currentMistakes = room.mistakes;

        if (!isHit) {
          currentMistakes += 1;
          updates.mistakes = currentMistakes;
        }

        // Calculate mask
        const newMask = getDisplayMask(room.secretWord, guessedSet);
        updates.maskedWord = newMask.join(' ');

        // Check Win
        const isWon = checkWinCondition(room.secretWord, guessedSet);
        const isLost = currentMistakes >= room.maxMistakes;

        if (isWon || isLost) {
          updates.status = 'round_ended';
          const nextScores = { ...room.scores };

          if (isWon) {
            if (room.mode === 'duel') {
              nextScores[playerRole] = (nextScores[playerRole] || 0) + 1;
              updates.winner = `${playerRole === 'host' ? room.hostName : room.guestName} descubrió la palabra!`;
            } else if (room.mode === 'turns') {
              nextScores[playerRole] = (nextScores[playerRole] || 0) + 1;
              updates.winner = `Punto para ${playerRole === 'host' ? room.hostName : room.guestName}`;
            } else if (room.mode === 'custom_word') {
              const guesserRole = room.creatorOfWord === 'host' ? 'guest' : 'host';
              nextScores[guesserRole] = (nextScores[guesserRole] || 0) + 1;
              updates.winner = `¡Adivinó ${guesserRole === 'host' ? room.hostName : room.guestName}!`;
            }
          } else {
            // Lost by hangman
            if (room.mode === 'custom_word') {
              const creator = room.creatorOfWord || 'host';
              nextScores[creator] = (nextScores[creator] || 0) + 1;
              updates.winner = `¡El ahorcado se completó! Punto para el autor.`;
            } else {
              updates.winner = `Se agotaron los intentos. La palabra era "${room.secretWord}".`;
            }
          }

          updates.scores = nextScores;

          // Check if match is finished
          if (room.currentRound >= room.totalRounds) {
            updates.status = 'match_finished';
          }
        } else if (room.mode === 'turns') {
          // Switch turn if miss or alternate
          updates.activePlayer = room.activePlayer === 'host' ? 'guest' : 'host';
        }
      } else if (action === 'next_round') {
        const nextRoundNum = room.currentRound + 1;
        if (nextRoundNum <= room.totalRounds) {
          updates.currentRound = nextRoundNum;
          updates.guessedLetters = [];
          updates.mistakes = 0;

          if (room.mode === 'custom_word') {
            // Swap creator of word
            const nextCreator = room.creatorOfWord === 'host' ? 'guest' : 'host';
            updates.creatorOfWord = nextCreator;
            updates.secretWord = '';
            updates.maskedWord = '';
            updates.hint = '';
            updates.status = 'waiting';
            updates.winner = '';
          } else {
            const nextW = getRandomWord();
            updates.secretWord = nextW.word;
            updates.category = nextW.category;
            updates.hint = nextW.hint;
            updates.maskedWord = getDisplayMask(nextW.word, new Set()).join(' ');
            updates.status = 'playing';
            updates.winner = '';
            updates.activePlayer = nextRoundNum % 2 === 1 ? 'host' : 'guest';
          }
        }
      } else if (action === 'restart_match') {
        updates.currentRound = 1;
        updates.scores = { host: 0, guest: 0 };
        updates.guessedLetters = [];
        updates.mistakes = 0;
        updates.winner = '';

        if (room.mode === 'custom_word') {
          updates.creatorOfWord = 'host';
          updates.secretWord = '';
          updates.maskedWord = '';
          updates.hint = '';
          updates.status = 'waiting';
        } else {
          const nextW = getRandomWord();
          updates.secretWord = nextW.word;
          updates.category = nextW.category;
          updates.hint = nextW.hint;
          updates.maskedWord = getDisplayMask(nextW.word, new Set()).join(' ');
          updates.status = 'playing';
          updates.activePlayer = 'host';
        }
      }

      await updateDoc(doc(db, 'rooms', code), updates);
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
