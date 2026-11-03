import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Globe, Users, Copy, Check, Play, RefreshCw, KeyRound, Sparkles, Flame, Cloud } from 'lucide-react';
import { OnlineRoomState } from '../types/game';
import { HangmanCanvas } from './HangmanCanvas';
import { VirtualKeyboard } from './VirtualKeyboard';
import { sound } from '../audio/soundEffects';

import { P2PRoomManager } from '../multiplayer/p2pRoomManager';
import { FirestoreRoomManager } from '../multiplayer/firestoreRoomManager';

export const OnlineMultiplayer: React.FC = () => {
  const [inRoom, setInRoom] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('ahorcado_player_name') || 'Jugador ' + Math.floor(Math.random() * 900 + 100);
  });
  const [roomState, setRoomState] = useState<OnlineRoomState | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [selectedMode, setSelectedMode] = useState<'duel' | 'turns' | 'secret_word'>('duel');
  const [totalRoundsInput, setTotalRoundsInput] = useState(3);
  const [secretWordInput, setSecretWordInput] = useState('');
  const [secretHintInput, setSecretHintInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionType, setConnectionType] = useState<'firestore' | 'server' | 'p2p'>('firestore');

  // Firestore Manager Ref
  const firestoreManagerRef = useRef<FirestoreRoomManager>(new FirestoreRoomManager());
  // P2P Manager Ref
  const p2pManagerRef = useRef<P2PRoomManager | null>(null);
  // Polling interval ref
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize P2P manager
  useEffect(() => {
    p2pManagerRef.current = new P2PRoomManager(
      (updatedState) => {
        setRoomState(updatedState);
      },
      (err) => {
        setErrorMessage(err);
      }
    );

    return () => {
      if (p2pManagerRef.current) {
        p2pManagerRef.current.destroy();
      }
    };
  }, []);

  // Check URL hash for direct invite (e.g. #room=482910)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const match = window.location.hash.match(/room=([0-9]{6})/i);
      if (match && match[1]) {
        setJoinCodeInput(match[1]);
      }
    }
  }, []);

  // Save player name
  const updatePlayerName = (name: string) => {
    setPlayerName(name);
    localStorage.setItem('ahorcado_player_name', name);
  };

  // Poll room updates from server (only in server mode)
  const pollRoom = useCallback(async (code: string, pId: string) => {
    if (connectionType !== 'server') return;
    try {
      const res = await fetch(`/api/online/room/${code}?playerId=${encodeURIComponent(pId)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.room) {
        setRoomState(data.room);
      }
    } catch {
      // transient network error
    }
  }, [connectionType]);

  // Start polling when in room
  useEffect(() => {
    if (inRoom && roomCode && playerId && connectionType === 'server') {
      pollRoom(roomCode, playerId);
      pollIntervalRef.current = setInterval(() => {
        pollRoom(roomCode, playerId);
      }, 1500);

      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
    }
  }, [inRoom, roomCode, playerId, pollRoom, connectionType]);

  // Create room (Primary: Firestore Cloud DB; Fallback: Server or WebRTC P2P)
  const handleCreateRoom = async () => {
    setIsLoading(true);
    setErrorMessage('');

    const mappedMode = selectedMode === 'secret_word' ? 'custom_word' : selectedMode;

    // Attempt 1: Google Cloud Firestore (Primary & Real-time Cloud DB)
    try {
      const { code, playerId: pId, room } = await firestoreManagerRef.current.createRoom(
        playerName,
        mappedMode,
        totalRoundsInput
      );
      setRoomCode(code);
      setPlayerId(pId);
      setRoomState(room);
      setConnectionType('firestore');
      setInRoom(true);
      sound.playPageFlip();

      // Subscribe to real-time room events
      firestoreManagerRef.current.subscribeRoom(
        code,
        (updatedRoom) => {
          setRoomState(updatedRoom);
        },
        (err) => {
          console.error('Firestore subscription error:', err);
        }
      );
      setIsLoading(false);
      return;
    } catch (err: any) {
      console.warn('Firestore create room fallback:', err);
    }

    // Attempt 2: Express Server API
    try {
      const res = await fetch('/api/online/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName: playerName,
          mode: selectedMode,
          totalRounds: totalRoundsInput,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRoomCode(data.code);
        setPlayerId(data.playerId);
        setRoomState(data.room);
        setConnectionType('server');
        setInRoom(true);
        sound.playPageFlip();
        setIsLoading(false);
        return;
      }
    } catch {
      // Server not reachable (expected on static GitHub Pages)
    }

    // Attempt 3: Serverless WebRTC P2P via PeerJS
    try {
      if (p2pManagerRef.current) {
        const { code, playerId: pId } = await p2pManagerRef.current.createRoom(
          playerName,
          selectedMode,
          totalRoundsInput
        );
        setRoomCode(code);
        setPlayerId(pId);
        setConnectionType('p2p');
        setInRoom(true);
        sound.playPageFlip();
      }
    } catch (err: any) {
      setErrorMessage('No se pudo iniciar la sala online: ' + (err?.message || 'Error de conexión'));
    } finally {
      setIsLoading(false);
    }
  };

  // Join room (Primary: Firestore Cloud DB; Fallback: Server or WebRTC P2P)
  const handleJoinRoom = async () => {
    const cleanCode = joinCodeInput.trim().replace(/\D/g, '').slice(0, 6);
    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMessage('Ingresa un código numérico de 6 dígitos (ej: 482910).');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');

    // Attempt 1: Google Cloud Firestore
    try {
      const { code, playerId: pId, room } = await firestoreManagerRef.current.joinRoom(
        cleanCode,
        playerName
      );
      setRoomCode(code);
      setPlayerId(pId);
      setRoomState(room);
      setConnectionType('firestore');
      setInRoom(true);
      sound.playPageFlip();

      firestoreManagerRef.current.subscribeRoom(
        code,
        (updatedRoom) => {
          setRoomState(updatedRoom);
        },
        (err) => {
          console.error('Firestore subscription error:', err);
        }
      );
      setIsLoading(false);
      return;
    } catch (err: any) {
      if (err.message && (err.message.includes('sala') || err.message.includes('código') || err.message.includes('jugadores'))) {
        setErrorMessage(err.message);
        setIsLoading(false);
        return;
      }
      console.warn('Firestore join room fallback:', err);
    }

    // Attempt 2: Server API
    try {
      const res = await fetch('/api/online/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: cleanCode,
          guestName: playerName,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRoomCode(data.code);
        setPlayerId(data.playerId);
        setRoomState(data.room);
        setConnectionType('server');
        setInRoom(true);
        sound.playPageFlip();
        setIsLoading(false);
        return;
      }
    } catch {
      // Server not reachable (on GitHub Pages)
    }

    // Attempt 3: Serverless WebRTC P2P
    try {
      if (p2pManagerRef.current) {
        const { code, playerId: pId } = await p2pManagerRef.current.joinRoom(cleanCode, playerName);
        setRoomCode(code);
        setPlayerId(pId);
        setConnectionType('p2p');
        setInRoom(true);
        sound.playPageFlip();
      }
    } catch (err: any) {
      setErrorMessage('No se pudo conectar a la sala: ' + (err?.message || 'Código no encontrado'));
    } finally {
      setIsLoading(false);
    }
  };

  // Send room action (dispatches via Firestore, Server API or P2PRoomManager)
  const sendRoomAction = async (action: string, payload?: any) => {
    if (!roomCode || !playerId) return;

    if (connectionType === 'firestore') {
      try {
        await firestoreManagerRef.current.sendAction(roomCode, playerId, action, payload);
      } catch (err) {
        console.error('Error sending action to Firestore:', err);
      }
      return;
    }

    if (connectionType === 'p2p' && p2pManagerRef.current) {
      p2pManagerRef.current.sendAction(action, payload);
      return;
    }

    try {
      const res = await fetch(`/api/online/room/${roomCode}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, action, payload }),
      });
      const data = await res.json();
      if (data.room) {
        setRoomState(data.room);
      }
    } catch (err) {
      console.error('Error sending room action:', err);
    }
  };

  // Guess letter online
  const handleGuess = (letter: string) => {
    sendRoomAction('guess_letter', { letter });
  };

  // Submit secret word
  const handleSubmitSecretWord = () => {
    if (secretWordInput.trim().length < 3) {
      setErrorMessage('La palabra debe tener al menos 3 letras.');
      return;
    }
    setErrorMessage('');
    sendRoomAction('set_secret_word', {
      word: secretWordInput.trim(),
      hint: secretHintInput.trim(),
      category: 'Desafío Entre Amigos',
    });
    setSecretWordInput('');
    setSecretHintInput('');
    sound.playPencilStroke();
  };

  // Copy room code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Leave room
  const handleLeaveRoom = () => {
    firestoreManagerRef.current.destroy();
    if (p2pManagerRef.current) {
      p2pManagerRef.current.destroy();
    }
    setInRoom(false);
    setRoomState(null);
    setRoomCode('');
    setPlayerId('');
  };

  // Check if current user is the one to write secret word
  const isWordCreator = roomState && (
    (roomState.creatorOfWord === 'host' && roomState.hostName === playerName) ||
    (roomState.creatorOfWord === 'guest' && roomState.guestName === playerName)
  );

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      {!inRoom ? (
        /* LOBBY / ROOM DISCOVERY */
        <div className="w-full max-w-xl bg-[#fffdf9] border-2 border-stone-800 rounded-xl p-6 sm:p-8 sketch-border notebook-sheet">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-amber-100 border-2 border-amber-600 rounded-full flex items-center justify-center mx-auto mb-2 sketch-border">
              <Globe className="w-7 h-7 text-amber-800" />
            </div>
            <h2 className="font-title text-4xl font-bold text-stone-900">
              Salas Online en Tiempo Real
            </h2>
            <p className="font-hand text-stone-600 text-base mt-1">
              Juega a distancia creando una sala privada con código o únete a la de un amigo.
            </p>
          </div>

          {/* Player nickname */}
          <div className="mb-6 font-hand">
            <label className="block font-bold text-stone-800 text-sm mb-1">
              Tu apodo de jugador:
            </label>
            <input
              type="text"
              value={playerName}
              onChange={e => updatePlayerName(e.target.value)}
              maxLength={20}
              className="w-full bg-[#fbf8ef] border-2 border-stone-400 rounded-lg p-2.5 font-hand text-lg text-stone-900 focus:outline-hidden focus:border-stone-800"
            />
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded text-red-700 font-hand text-sm">
              {errorMessage}
            </div>
          )}

          {/* Cloud Database & Real-Time Multiplayer Badge */}
          <div className="mb-5 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl flex items-start gap-3 text-xs font-hand text-stone-800 shadow-xs sketch-border-sm">
            <Flame className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-950 text-sm flex items-center gap-1.5 flex-wrap">
                <span>Partidas en la Nube con Google Cloud Firestore</span>
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">Nube Activa</span>
              </div>
              <p className="text-stone-700 mt-1 leading-relaxed">
                Las salas se sincronizan al instante en la colección <strong className="text-amber-900">games</strong> de Google Cloud Firestore. Puedes compartir el código numérico de 6 dígitos con quien quieras para jugar juntos desde cualquier navegador, móvil o GitHub Pages.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-dashed border-stone-300">
            {/* Create Room Box */}
            <div className="bg-[#fcf8ee] border border-stone-300 p-4 rounded-xl flex flex-col justify-between">
              <div>
                <h3 className="font-title text-2xl font-bold text-stone-900 mb-2">
                  Crear Nueva Sala
                </h3>
                <div className="space-y-3 font-hand text-sm mb-4">
                  <div>
                    <label className="block text-stone-700 font-bold mb-1">
                      Modalidad de juego:
                    </label>
                    <select
                      value={selectedMode}
                      onChange={e => setSelectedMode(e.target.value as any)}
                      className="w-full bg-white border border-stone-300 rounded p-1.5 font-hand"
                    >
                      <option value="duel">Duelo Directo (Cooperativo/Competitivo)</option>
                      <option value="turns">Por Turnos Alternados</option>
                      <option value="secret_word">Palabra Secreta Cruzada</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-stone-700 font-bold mb-1">
                      Rondas totales:
                    </label>
                    <select
                      value={totalRoundsInput}
                      onChange={e => setTotalRoundsInput(Number(e.target.value))}
                      className="w-full bg-white border border-stone-300 rounded p-1.5 font-hand"
                    >
                      <option value={1}>1 Ronda (Muerte súbita)</option>
                      <option value={3}>3 Rondas</option>
                      <option value={5}>5 Rondas</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={isLoading}
                className="w-full py-2.5 bg-stone-800 hover:bg-stone-900 text-white font-hand font-bold text-lg rounded-lg sketch-border-sm sketch-shadow-hover transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Crear Sala</span>
              </button>
            </div>

            {/* Join Room Box */}
            <div className="bg-[#fcf8ee] border border-stone-300 p-4 rounded-xl flex flex-col justify-between">
              <div>
                <h3 className="font-title text-2xl font-bold text-stone-900 mb-2">
                  Unirse a una Sala
                </h3>
                <p className="font-hand text-stone-600 text-xs mb-3">
                  Ingresa el código numérico de 6 dígitos que te compartió el creador de la sala.
                </p>
                <div className="font-hand mb-4">
                  <label className="block text-stone-700 font-bold text-sm mb-1">
                    Código de Sala (6 dígitos):
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={joinCodeInput}
                    onChange={e => setJoinCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Ej: 482910"
                    maxLength={6}
                    className="w-full bg-white border-2 border-stone-400 rounded-lg p-2 font-typewriter text-2xl uppercase tracking-widest text-center"
                  />
                </div>
              </div>

              <button
                onClick={handleJoinRoom}
                disabled={isLoading || !joinCodeInput.trim()}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-hand font-bold text-lg rounded-lg sketch-border-sm sketch-shadow-hover transition-all flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>Entrar a la Sala</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ACTIVE ONLINE ROOM */
        <div className="w-full flex flex-col items-center">
          {/* Room Top Header */}
          <div className="w-full bg-[#fbf8ef] border-2 border-stone-800 rounded-xl p-3 sm:p-4 mb-4 sketch-border shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Room Code with Copy */}
              <div className="flex items-center gap-2">
                <span className="font-hand text-stone-600 text-sm">Código de Sala:</span>
                <span className="font-typewriter text-2xl font-bold tracking-widest text-stone-900 bg-amber-100 px-2.5 py-0.5 rounded border border-amber-300">
                  {roomCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-1 rounded bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 transition-colors"
                  title="Copiar código de sala"
                  aria-label="Copiar código de sala"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Match Players & Scores */}
              <div className="flex items-center gap-4 font-hand font-bold text-base sm:text-lg">
                <div className="flex items-center gap-1.5 text-blue-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                  <span>{roomState?.hostName}:</span>
                  <span className="text-xl text-blue-950">{roomState?.scores?.host ?? 0}</span>
                </div>
                <span className="text-stone-400">vs</span>
                <div className="flex items-center gap-1.5 text-rose-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
                  <span>{roomState?.guestName || 'Esperando amigo...'}:</span>
                  <span className="text-xl text-rose-950">{roomState?.scores?.guest ?? 0}</span>
                </div>
              </div>

              {/* Leave Room Button */}
              <button
                onClick={handleLeaveRoom}
                className="text-xs font-hand text-stone-600 hover:text-stone-900 border border-stone-300 px-2.5 py-1 rounded bg-white hover:bg-stone-100 transition-colors"
              >
                Salir de Sala
              </button>
            </div>

            {/* Connection mode & round info */}
            <div className="w-full flex items-center justify-between text-xs font-hand text-stone-500 mt-2.5 pt-2 border-t border-dashed border-stone-300">
              <span className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  connectionType === 'firestore' ? 'bg-amber-500 animate-pulse' :
                  connectionType === 'p2p' ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'
                }`} />
                <span className="font-semibold text-stone-700">
                  {connectionType === 'firestore'
                    ? '🔥 Nube Google Cloud Firestore (Sincronización en Tiempo Real)'
                    : connectionType === 'p2p'
                    ? '🌐 Conexión WebRTC P2P Directa (Serverless)'
                    : '🚀 Servidor Node.js Express'}
                </span>
              </span>
              <span>Ronda {roomState?.currentRound || 1} de {roomState?.totalRounds || 1}</span>
            </div>
          </div>

          {/* WAITING ROOM (if guest hasn't joined yet) */}
          {roomState?.status === 'waiting' && !roomState.guestName && (
            <div className="w-full max-w-md bg-[#fffdf9] border-2 border-stone-800 rounded-xl p-8 sketch-border notebook-sheet text-center">
              <RefreshCw className="w-10 h-10 text-amber-600 animate-spin mx-auto mb-3" />
              <h3 className="font-title text-3xl font-bold text-stone-900 mb-1">
                Esperando a tu oponente...
              </h3>
              <p className="font-hand text-stone-600 text-base mb-4">
                Pídele a tu amigo que ingrese a la pestaña <strong className="text-stone-800">Multijugador Online</strong> y escriba este código:
              </p>
              <div className="font-typewriter text-4xl font-bold tracking-widest text-amber-900 bg-amber-50 border-2 border-amber-300 py-3 rounded-lg mb-4">
                {roomCode}
              </div>
              <button
                onClick={handleCopyCode}
                className="px-4 py-2 bg-stone-800 text-white font-hand rounded-md flex items-center justify-center gap-2 mx-auto"
              >
                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? '¡Código copiado!' : 'Copiar Código'}</span>
              </button>
            </div>
          )}

          {/* SECRET WORD SETUP PROMPT (in secret_word mode) */}
          {roomState?.status === 'waiting' && roomState.guestName && (
            <div className="w-full max-w-md bg-[#fffdf9] border-2 border-stone-800 rounded-xl p-6 sketch-border notebook-sheet">
              <h3 className="font-title text-3xl font-bold text-stone-900 mb-2 text-center">
                Elegir Palabra Secreta
              </h3>
              <p className="font-hand text-stone-600 text-center text-sm mb-4">
                Escribe una palabra para que tu compañero intente adivinarla.
              </p>

              <div className="space-y-3 font-hand">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1">
                    Palabra:
                  </label>
                  <input
                    type="password"
                    value={secretWordInput}
                    onChange={e => setSecretWordInput(e.target.value.toUpperCase())}
                    placeholder="Ej: COLIBRÍ"
                    maxLength={25}
                    className="w-full bg-[#fbf8ef] border-2 border-stone-400 rounded-lg p-2 font-hand text-lg uppercase tracking-wider"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1">
                    Pista (opcional):
                  </label>
                  <input
                    type="text"
                    value={secretHintInput}
                    onChange={e => setSecretHintInput(e.target.value)}
                    placeholder="Ej: Pequeña ave que bate alas velozmente"
                    maxLength={80}
                    className="w-full bg-[#fbf8ef] border border-stone-300 rounded-lg p-2 font-hand text-sm"
                  />
                </div>

                {errorMessage && (
                  <p className="text-red-700 text-xs font-hand">{errorMessage}</p>
                )}

                <button
                  onClick={handleSubmitSecretWord}
                  className="w-full py-2.5 bg-stone-800 hover:bg-stone-900 text-white font-hand font-bold text-lg rounded-lg sketch-border-sm mt-2"
                >
                  Enviar Palabra Secreta
                </button>
              </div>
            </div>
          )}

          {/* ACTIVE IN_PROGRESS OR ROUND_OVER SCREEN */}
          {(roomState?.status === 'in_progress' || roomState?.status === 'round_over' || roomState?.status === 'finished') && (
            <div className="w-full flex flex-col items-center">
              <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Canvas */}
                <div className="md:col-span-5 flex flex-col items-center">
                  <HangmanCanvas
                    mistakes={roomState.mistakes}
                    maxMistakes={roomState.maxMistakes}
                    isWon={roomState.status === 'round_over' && roomState.winner !== 'draw'}
                    isLost={roomState.status === 'round_over' && roomState.mistakes >= roomState.maxMistakes}
                  />
                  <p className="font-hand text-stone-600 text-sm mt-1">
                    Intentos restantes: <strong className="text-stone-900">{roomState.maxMistakes - roomState.mistakes}</strong>
                  </p>
                </div>

                {/* Word Display & Status */}
                <div className="md:col-span-7 flex flex-col items-center gap-4">
                  <div className="text-center">
                    <span className="text-xs uppercase tracking-widest font-typewriter text-amber-800">
                      Ronda {roomState.currentRound} de {roomState.totalRounds}
                    </span>
                    <h3 className="font-title text-3xl font-bold text-stone-900">
                      {roomState.category}
                    </h3>
                  </div>

                  {/* Underlined word */}
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 py-4 min-h-[60px]">
                    {(roomState.displayWord || []).map((char, index) => {
                      if (char === ' ') return <span key={index} className="w-4 sm:w-6" />;
                      const isRevealed = char !== '_';
                      return (
                        <div
                          key={index}
                          className="flex flex-col items-center justify-end w-7 sm:w-10 h-10 sm:h-12 border-b-3 sm:border-b-4 border-stone-800"
                        >
                          <span className="font-hand font-bold text-2xl sm:text-3xl text-stone-900">
                            {isRevealed ? char : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {roomState.hint && (
                    <div className="bg-[#fffbe6] border-l-4 border-amber-500 p-2 rounded shadow-xs text-stone-800 font-hand text-sm max-w-md w-full">
                      <span className="font-bold text-amber-900">Pista: </span>
                      <span>{roomState.hint}</span>
                    </div>
                  )}

                  {/* Turn indicator in turns mode */}
                  {roomState.mode === 'turns' && roomState.status === 'in_progress' && (
                    <div className={`text-sm font-hand px-3.5 py-1 rounded-full border shadow-xs transition-all ${
                      (!roomState.currentTurn || (roomState.currentTurn === 'host' ? playerId === roomState.hostId : playerId === roomState.guestId))
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-400 font-bold'
                        : 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                    }`}>
                      {(!roomState.currentTurn || (roomState.currentTurn === 'host' ? playerId === roomState.hostId : playerId === roomState.guestId))
                        ? '✏️ ¡Es tu turno de arriesgar una letra!'
                        : `⏳ Esperando a que ${roomState.currentTurn === 'host' ? roomState.hostName : roomState.guestName} elija una letra...`}
                    </div>
                  )}

                  {/* Round Over Banner */}
                  {roomState.status === 'round_over' && (
                    <div className="w-full max-w-md bg-amber-50 border-2 border-amber-600 p-3 rounded-lg text-center sketch-border">
                      <h4 className="font-title text-2xl font-bold text-amber-900">
                        {roomState.winner === 'draw'
                          ? '¡Ronda terminada sin ganador!'
                          : `¡Punto para ${roomState.winner === 'host' ? roomState.hostName : roomState.guestName}!`}
                      </h4>
                      {roomState.secretWordRevealed && (
                        <p className="font-hand text-stone-700 text-sm mt-1">
                          Palabra secreta: <strong className="font-bold uppercase tracking-wider text-stone-900">{roomState.secretWordRevealed}</strong>
                        </p>
                      )}
                      <button
                        onClick={() => sendRoomAction('next_round')}
                        className="mt-3 px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white font-hand font-bold rounded sketch-border-sm"
                      >
                        {roomState.currentRound >= roomState.totalRounds ? 'Ver Resultado Final' : 'Siguiente Ronda'}
                      </button>
                    </div>
                  )}

                  {/* Final Match Finished Banner */}
                  {roomState.status === 'finished' && (
                    <div className="w-full max-w-md bg-emerald-50 border-2 border-emerald-600 p-4 rounded-lg text-center sketch-border">
                      <h4 className="font-title text-3xl font-bold text-emerald-900">
                        ¡Fin de la Partida!
                      </h4>
                      <p className="font-hand text-lg text-emerald-950 mt-1">
                        {roomState.winner === 'draw'
                          ? '¡Empate total!'
                          : `¡Ganador del Cuaderno: ${roomState.winner === 'host' ? roomState.hostName : roomState.guestName}!`}
                      </p>
                      <button
                        onClick={handleLeaveRoom}
                        className="mt-3 px-4 py-2 bg-emerald-800 text-white font-hand font-bold rounded sketch-border-sm"
                      >
                        Volver al Menú
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Keyboard */}
              <div className="w-full mt-4">
                <VirtualKeyboard
                  guessedLetters={new Set(roomState.guessedLetters)}
                  secretWord={(roomState.displayWord || []).join('')}
                  onGuessLetter={handleGuess}
                  disabled={
                    roomState.status !== 'in_progress' ||
                    (roomState.mode === 'turns' && Boolean(roomState.currentTurn) && (
                      roomState.currentTurn === 'host' ? playerId !== roomState.hostId : playerId !== roomState.guestId
                    ))
                  }
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
