import { Peer, DataConnection } from 'peerjs';
import { OnlineRoomState } from '../types/game';
import { normalizeChar } from '../game/rules';

export type RoomConnectionMode = 'server' | 'p2p_webrtc';

interface RoomMessage {
  type: 'SYNC_STATE' | 'ACTION' | 'JOIN_REQUEST' | 'PING' | 'PONG';
  payload?: any;
}

export class P2PRoomManager {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private isHost: boolean = false;
  private roomCode: string = '';
  private playerId: string = '';
  private playerName: string = '';
  private onStateChange: (state: OnlineRoomState) => void;
  private onError: (msg: string) => void;

  // Authoritative host state (held securely in host's browser)
  private trueSecretWord: string = '';
  private localRoomState: OnlineRoomState | null = null;

  constructor(
    onStateChange: (state: OnlineRoomState) => void,
    onError: (msg: string) => void
  ) {
    this.onStateChange = onStateChange;
    this.onError = onError;
  }

  /**
   * Host creates a room using WebRTC Peer
   */
  public async createRoom(
    hostName: string,
    mode: 'duel' | 'turns' | 'secret_word',
    totalRounds: number
  ): Promise<{ code: string; playerId: string }> {
    this.destroy();

    // Generate clean 6-character room code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    this.roomCode = code;
    this.isHost = true;
    this.playerName = hostName;
    this.playerId = `host-${Date.now()}`;

    const starterWords = [
      { word: 'GALAXIA', category: 'Astronomía', hint: 'Inmenso sistema de estrellas, polvo y gas interestelar.' },
      { word: 'PIRÁMIDE', category: 'Historia', hint: 'Estructura monumental del antiguo Egipto a orillas del Nilo.' },
      { word: 'ACUARELA', category: 'Arte', hint: 'Técnica de pintura sobre papel con colores diluidos en agua.' },
      { word: 'CENTAURO', category: 'Mitología', hint: 'Criatura mítica mitad hombre y mitad caballo.' },
      { word: 'FOTOSÍNTESIS', category: 'Ciencia', hint: 'Proceso biológico vegetal que transforma luz solar en energía.' },
      { word: 'MINOTAURO', category: 'Mitología', hint: 'Criatura encerrada en el laberinto de Creta.' },
    ];
    const picked = starterWords[Math.floor(Math.random() * starterWords.length)];
    this.trueSecretWord = mode === 'secret_word' ? '' : picked.word;

    // Initial state
    this.localRoomState = {
      code,
      mode,
      hostName,
      hostReady: true,
      guestReady: false,
      status: 'waiting',
      currentRound: 1,
      totalRounds: Math.max(1, Math.min(totalRounds, 10)),
      currentTurn: 'host',
      scores: { host: 0, guest: 0 },
      displayWord: this.generateMask(this.trueSecretWord, []),
      wordLength: this.trueSecretWord.replace(/\s+/g, '').length,
      category: mode === 'secret_word' ? 'Palabra Secreta' : picked.category,
      hint: mode === 'secret_word' ? '' : picked.hint,
      guessedLetters: [],
      mistakes: 0,
      maxMistakes: 7,
      winner: undefined,
      lastActivity: Date.now(),
    };

    // Initialize WebRTC Peer
    await this.initPeerAsHost(code);
    this.initBroadcastChannel(code);

    if (this.localRoomState) {
      this.onStateChange(this.localRoomState);
    }
    return { code, playerId: this.playerId };
  }

  /**
   * Guest joins an existing room via WebRTC Peer
   */
  public async joinRoom(code: string, guestName: string): Promise<{ code: string; playerId: string }> {
    this.destroy();

    const upperCode = code.trim().toUpperCase();
    this.roomCode = upperCode;
    this.isHost = false;
    this.playerName = guestName;
    this.playerId = `guest-${Date.now()}`;

    await this.initPeerAsGuest(upperCode, guestName);
    this.initBroadcastChannel(upperCode);

    return { code: upperCode, playerId: this.playerId };
  }

  private initBroadcastChannel(code: string) {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(`ahorcado_channel_${code}`);
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingMessage(event.data);
        };
      } catch {}
    }
  }

  private initPeerAsHost(code: string): Promise<void> {
    return new Promise((resolve) => {
      const peerId = `ahorcado-${code.toLowerCase()}`;
      
      this.peer = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });

      this.peer.on('open', () => {
        resolve();
      });

      this.peer.on('connection', (conn) => {
        this.connection = conn;
        this.setupConnectionListeners(conn);

        // When guest connects, update state
        conn.on('open', () => {
          if (this.localRoomState) {
            this.sendSyncState();
          }
        });
      });

      this.peer.on('error', (err) => {
        console.warn('P2P Host Peer warning:', err);
        // Even if Peer server is blocked, broadcastChannel and direct room will work
        resolve();
      });
    });
  }

  private initPeerAsGuest(code: string, guestName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const targetHostPeerId = `ahorcado-${code.toLowerCase()}`;
      this.peer = new Peer({
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });

      const timeout = setTimeout(() => {
        // Try local broadcast channel if peer timed out
        this.sendMessage({
          type: 'JOIN_REQUEST',
          payload: { guestName, playerId: this.playerId },
        });
        resolve();
      }, 3500);

      this.peer.on('open', () => {
        const conn = this.peer!.connect(targetHostPeerId, {
          reliable: true,
        });
        this.connection = conn;
        this.setupConnectionListeners(conn);

        conn.on('open', () => {
          clearTimeout(timeout);
          conn.send({
            type: 'JOIN_REQUEST',
            payload: { guestName, playerId: this.playerId },
          });
          resolve();
        });
      });

      this.peer.on('error', (err) => {
        console.warn('P2P Guest Peer connection attempt:', err);
        // Fallback to BroadcastChannel for local/multi-tab testing
        this.sendMessage({
          type: 'JOIN_REQUEST',
          payload: { guestName, playerId: this.playerId },
        });
        resolve();
      });
    });
  }

  private setupConnectionListeners(conn: DataConnection) {
    conn.on('data', (data: any) => {
      this.handleIncomingMessage(data);
    });

    conn.on('close', () => {
      // connection lost
    });
  }

  private handleIncomingMessage(msg: RoomMessage) {
    if (!msg || !msg.type) return;

    if (this.isHost) {
      // HOST LOGIC
      if (msg.type === 'JOIN_REQUEST') {
        if (!this.localRoomState) return;
        this.localRoomState.guestName = msg.payload.guestName || 'Jugador 2';
        this.localRoomState.guestReady = true;
        this.localRoomState.status = this.localRoomState.mode === 'secret_word' ? 'waiting' : 'in_progress';
        this.sendSyncState();
      } else if (msg.type === 'ACTION') {
        this.executeHostAction(msg.payload.action, msg.payload.payload, msg.payload.isHostRequest ? 'host' : 'guest');
      }
    } else {
      // GUEST LOGIC
      if (msg.type === 'SYNC_STATE' && msg.payload) {
        this.localRoomState = msg.payload;
        this.onStateChange(msg.payload);
      }
    }
  }

  public sendAction(action: string, payload?: any) {
    if (this.isHost) {
      this.executeHostAction(action, payload, 'host');
    } else {
      this.sendMessage({
        type: 'ACTION',
        payload: { action, payload, isHostRequest: false },
      });
    }
  }

  private executeHostAction(action: string, payload: any, sender: 'host' | 'guest') {
    if (!this.localRoomState) return;

    if (action === 'set_secret_word') {
      const { word, category = 'Desafío Entre Amigos', hint = '' } = payload || {};
      const trimmed = String(word || '').trim().toUpperCase();
      this.trueSecretWord = trimmed;
      this.localRoomState.category = category;
      this.localRoomState.hint = hint;
      this.localRoomState.creatorOfWord = sender;
      this.localRoomState.currentTurn = sender === 'host' ? 'guest' : 'host';
      this.localRoomState.status = 'in_progress';
      this.localRoomState.guessedLetters = [];
      this.localRoomState.mistakes = 0;
      this.localRoomState.winner = undefined;
      this.localRoomState.wordLength = trimmed.replace(/\s+/g, '').length;
      this.localRoomState.displayWord = this.generateMask(trimmed, []);
    } else if (action === 'guess_letter') {
      if (this.localRoomState.status !== 'in_progress') return;

      const normLetter = normalizeChar(String(payload?.letter || ''));
      if (!normLetter || this.localRoomState.guessedLetters.includes(normLetter)) return;

      this.localRoomState.guessedLetters.push(normLetter);

      // Check hit
      const isHit = Array.from(this.trueSecretWord).some(c => normalizeChar(c) === normLetter);

      if (isHit) {
        if (sender === 'host') this.localRoomState.scores.host += 10;
        else this.localRoomState.scores.guest += 10;

        // Check full word discovery
        const guessedSet = new Set(this.localRoomState.guessedLetters.map(l => normalizeChar(l)));
        const hasWon = Array.from(this.trueSecretWord).every(char => {
          if (char === ' ' || char === '-' || char === '\'') return true;
          return guessedSet.has(normalizeChar(char));
        });

        if (hasWon) {
          this.localRoomState.status = 'round_over';
          this.localRoomState.winner = sender;
          if (sender === 'host') this.localRoomState.scores.host += 50;
          else this.localRoomState.scores.guest += 50;
          this.localRoomState.secretWordRevealed = this.trueSecretWord;
        }
      } else {
        this.localRoomState.mistakes += 1;
        if (this.localRoomState.mistakes >= this.localRoomState.maxMistakes) {
          this.localRoomState.status = 'round_over';
          this.localRoomState.secretWordRevealed = this.trueSecretWord;
          if (this.localRoomState.mode === 'secret_word') {
            this.localRoomState.winner = this.localRoomState.creatorOfWord;
            if (this.localRoomState.creatorOfWord === 'host') this.localRoomState.scores.host += 50;
            else if (this.localRoomState.creatorOfWord === 'guest') this.localRoomState.scores.guest += 50;
          } else {
            this.localRoomState.winner = 'draw';
          }
        }
      }

      // In turns mode, switch currentTurn
      if (this.localRoomState.mode === 'turns' && this.localRoomState.status === 'in_progress') {
        this.localRoomState.currentTurn = this.localRoomState.currentTurn === 'host' ? 'guest' : 'host';
      }

      this.localRoomState.displayWord = this.generateMask(
        this.trueSecretWord,
        this.localRoomState.guessedLetters,
        this.localRoomState.status === 'round_over'
      );
    } else if (action === 'next_round') {
      if (this.localRoomState.currentRound >= this.localRoomState.totalRounds) {
        this.localRoomState.status = 'finished';
        if (this.localRoomState.scores.host > this.localRoomState.scores.guest) this.localRoomState.winner = 'host';
        else if (this.localRoomState.scores.guest > this.localRoomState.scores.host) this.localRoomState.winner = 'guest';
        else this.localRoomState.winner = 'draw';
      } else {
        this.localRoomState.currentRound += 1;
        this.localRoomState.guessedLetters = [];
        this.localRoomState.mistakes = 0;
        this.localRoomState.winner = undefined;
        this.localRoomState.secretWordRevealed = undefined;

        if (this.localRoomState.mode === 'secret_word') {
          this.localRoomState.creatorOfWord = this.localRoomState.creatorOfWord === 'host' ? 'guest' : 'host';
          this.trueSecretWord = '';
          this.localRoomState.status = 'waiting';
          this.localRoomState.displayWord = [];
        } else {
          const wordsPool = [
            { word: 'ALQUIMIA', category: 'Historia', hint: 'Antigua disciplina que buscaba transformar plomo en oro.' },
            { word: 'LABERINTO', category: 'Mitología', hint: 'Lugar formado por calles intrincadas del que es difícil salir.' },
            { word: 'HEURÍSTICA', category: 'Ciencia', hint: 'Método práctico para resolver problemas o descubrir.' },
            { word: 'OBSIDIANA', category: 'Geología', hint: 'Roca ígnea volcánica de aspecto vítreo y color oscuro.' },
          ];
          const next = wordsPool[(this.localRoomState.currentRound - 1) % wordsPool.length];
          this.trueSecretWord = next.word;
          this.localRoomState.category = next.category;
          this.localRoomState.hint = next.hint;
          this.localRoomState.status = 'in_progress';
          this.localRoomState.wordLength = next.word.replace(/\s+/g, '').length;
          this.localRoomState.displayWord = this.generateMask(next.word, []);
        }
      }
    }

    this.sendSyncState();
  }

  private generateMask(word: string, guessed: string[], revealAll = false): string[] {
    const set = new Set(guessed.map(c => normalizeChar(c)));
    return Array.from(word || '').map(char => {
      if (char === ' ' || char === '-' || char === '\'') return char;
      const norm = normalizeChar(char);
      if (set.has(norm) || revealAll) return char;
      return '_';
    });
  }

  private sendSyncState() {
    if (!this.localRoomState) return;

    // Notify local host
    this.onStateChange({ ...this.localRoomState });

    // Send to guest (masking secret word if in progress)
    this.sendMessage({
      type: 'SYNC_STATE',
      payload: { ...this.localRoomState },
    });
  }

  private sendMessage(msg: RoomMessage) {
    if (this.connection && this.connection.open) {
      try {
        this.connection.send(msg);
      } catch {}
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(msg);
      } catch {}
    }
  }

  public destroy() {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    this.localRoomState = null;
    this.trueSecretWord = '';
  }
}
