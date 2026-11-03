import React, { useState, useCallback } from 'react';
import { Eye, EyeOff, RotateCcw, User, Users, Play, CheckCircle } from 'lucide-react';
import { HangmanCanvas } from './HangmanCanvas';
import { VirtualKeyboard } from './VirtualKeyboard';
import {
  getDisplayMask,
  checkWinCondition,
  checkLossCondition,
  validateCustomWord,
  normalizeChar,
} from '../game/rules';
import { sound } from '../audio/soundEffects';

type LocalMode = 'secret_word' | 'duel_turns';
type Step = 'setup' | 'pass_device' | 'guessing' | 'round_result';

export const LocalMultiplayer: React.FC = () => {
  const [localMode, setLocalMode] = useState<LocalMode>('secret_word');
  const [step, setStep] = useState<Step>('setup');

  const [player1Name, setPlayer1Name] = useState('Jugador 1');
  const [player2Name, setPlayer2Name] = useState('Jugador 2');
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [currentRound, setCurrentRound] = useState(1);
  const [currentWriter, setCurrentWriter] = useState<'p1' | 'p2'>('p1');

  // Secret word setup form state
  const [inputWord, setInputWord] = useState('');
  const [inputCategory, setInputCategory] = useState('');
  const [inputHint, setInputHint] = useState('');
  const [showInputWord, setShowInputWord] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Active round state
  const [activeWord, setActiveWord] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [activeHint, setActiveHint] = useState('');
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [mistakes, setMistakes] = useState(0);
  const maxMistakes = 7;
  const [isWon, setIsWon] = useState(false);
  const [isLost, setIsLost] = useState(false);
  const [roundWinner, setRoundWinner] = useState<string | null>(null);

  // Turn in duel turns mode
  const [duelTurn, setDuelTurn] = useState<'p1' | 'p2'>('p1');

  const guesserName = currentWriter === 'p1' ? player2Name : player1Name;
  const writerName = currentWriter === 'p1' ? player1Name : player2Name;

  // Start round after word entered
  const handleStartRoundFromWord = () => {
    const val = validateCustomWord(inputWord, inputHint);
    if (!val.valid) {
      setValidationError(val.error || 'Palabra no válida');
      return;
    }
    setValidationError('');
    setActiveWord(inputWord.trim().toUpperCase());
    setActiveCategory(inputCategory.trim() || 'Palabra Secreta');
    setActiveHint(inputHint.trim());
    setInputWord('');
    setInputCategory('');
    setInputHint('');
    setGuessedLetters(new Set());
    setMistakes(0);
    setIsWon(false);
    setIsLost(false);
    setRoundWinner(null);

    sound.playPageFlip();
    setStep('pass_device');
  };

  // Begin guessing
  const handleStartGuessing = () => {
    sound.playPageFlip();
    setStep('guessing');
  };

  // Guess letter
  const handleGuess = useCallback(
    (letter: string) => {
      if (isWon || isLost) return;
      const norm = normalizeChar(letter);
      if (guessedLetters.has(norm)) return;

      const nextGuessed = new Set(guessedLetters);
      nextGuessed.add(norm);
      setGuessedLetters(nextGuessed);

      const wordNormChars = Array.from(activeWord).map(c => normalizeChar(c));
      const isHit = wordNormChars.includes(norm);

      if (isHit) {
        sound.playCorrect();
        if (checkWinCondition(activeWord, nextGuessed)) {
          setIsWon(true);
          const winner = localMode === 'secret_word' ? guesserName : duelTurn === 'p1' ? player1Name : player2Name;
          setRoundWinner(winner);
          if (localMode === 'secret_word') {
            if (currentWriter === 'p1') setScores(s => ({ ...s, p2: s.p2 + 1 }));
            else setScores(s => ({ ...s, p1: s.p1 + 1 }));
          } else {
            if (duelTurn === 'p1') setScores(s => ({ ...s, p1: s.p1 + 1 }));
            else setScores(s => ({ ...s, p2: s.p2 + 1 }));
          }
          sound.playVictory();
          setStep('round_result');
        }
      } else {
        sound.playWrong();
        const nextMistakes = mistakes + 1;
        setMistakes(nextMistakes);

        if (checkLossCondition(nextMistakes, maxMistakes)) {
          setIsLost(true);
          const winner = localMode === 'secret_word' ? writerName : 'Nadie (¡Ahorcado!)';
          setRoundWinner(winner);
          if (localMode === 'secret_word') {
            if (currentWriter === 'p1') setScores(s => ({ ...s, p1: s.p1 + 1 }));
            else setScores(s => ({ ...s, p2: s.p2 + 1 }));
          }
          sound.playDefeat();
          setStep('round_result');
        } else if (localMode === 'duel_turns') {
          // Switch turn on miss
          setDuelTurn(prev => (prev === 'p1' ? 'p2' : 'p1'));
        }
      }
    },
    [activeWord, currentWriter, duelTurn, guesserName, guessedLetters, isLost, isWon, localMode, mistakes, player1Name, player2Name, writerName]
  );

  // Next round
  const handleNextRound = () => {
    setCurrentRound(r => r + 1);
    setCurrentWriter(w => (w === 'p1' ? 'p2' : 'p1'));
    setDuelTurn('p1');
    sound.playPageFlip();
    setStep('setup');
  };

  // Reset entire match
  const handleResetMatch = () => {
    setScores({ p1: 0, p2: 0 });
    setCurrentRound(1);
    setCurrentWriter('p1');
    setStep('setup');
  };

  const displayMask = getDisplayMask(activeWord, guessedLetters);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      {/* Scoreboard Header */}
      <div className="w-full bg-[#fbf8ef] border-2 border-stone-800 rounded-xl p-3 sm:p-4 mb-4 sketch-border shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-amber-700" />
            <h2 className="font-title text-2xl sm:text-3xl font-bold text-stone-900">
              Multijugador en el Mismo Cuaderno
            </h2>
          </div>

          <div className="flex items-center gap-4 font-hand font-bold text-lg sm:text-xl">
            <div className="flex items-center gap-1.5 text-blue-900">
              <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
              <span>{player1Name}: </span>
              <span className="text-2xl text-blue-950">{scores.p1}</span>
            </div>
            <span className="text-stone-400">vs</span>
            <div className="flex items-center gap-1.5 text-rose-900">
              <span className="w-3 h-3 rounded-full bg-rose-600 inline-block" />
              <span>{player2Name}: </span>
              <span className="text-2xl text-rose-950">{scores.p2}</span>
            </div>
          </div>

          <button
            onClick={handleResetMatch}
            className="flex items-center gap-1 text-xs font-hand text-stone-600 hover:text-stone-900 border border-stone-300 px-2 py-1 rounded bg-white hover:bg-stone-100"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reiniciar Marcador</span>
          </button>
        </div>
      </div>

      {/* STEP 1: SETUP SECRET WORD */}
      {step === 'setup' && (
        <div className="w-full max-w-lg bg-[#fffdf9] border-2 border-stone-800 rounded-xl p-6 sketch-border notebook-sheet">
          <div className="text-center mb-4">
            <span className="text-xs uppercase tracking-widest font-typewriter text-amber-800">
              Ronda {currentRound}
            </span>
            <h3 className="font-title text-3xl font-bold text-stone-900 mt-1">
              Turno de {writerName}
            </h3>
            <p className="font-hand text-stone-600 text-base mt-1">
              Escribe una palabra secreta en el cuaderno sin que {guesserName} mire la pantalla.
            </p>
          </div>

          <div className="space-y-4 font-hand">
            <div>
              <label className="block font-bold text-stone-700 text-sm mb-1">
                Palabra secreta:
              </label>
              <div className="relative">
                <input
                  type={showInputWord ? 'text' : 'password'}
                  value={inputWord}
                  onChange={e => setInputWord(e.target.value.toUpperCase())}
                  placeholder="Ej: ASTRONAUTA"
                  maxLength={25}
                  className="w-full bg-[#fbf8ef] border-2 border-stone-400 rounded-lg p-2.5 pr-10 font-hand text-xl uppercase tracking-wider text-stone-900 focus:outline-hidden focus:border-stone-800"
                />
                <button
                  type="button"
                  onClick={() => setShowInputWord(!showInputWord)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-700"
                  aria-label="Ver u ocultar palabra"
                >
                  {showInputWord ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-stone-700 text-sm mb-1">
                Categoría o Tema (opcional):
              </label>
              <input
                type="text"
                value={inputCategory}
                onChange={e => setInputCategory(e.target.value)}
                placeholder="Ej: Profesiones, Cine, Animales..."
                maxLength={30}
                className="w-full bg-[#fbf8ef] border border-stone-300 rounded-lg p-2 font-hand text-base"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 text-sm mb-1">
                Pista para ayudar a {guesserName} (opcional):
              </label>
              <input
                type="text"
                value={inputHint}
                onChange={e => setInputHint(e.target.value)}
                placeholder="Ej: Viaja al espacio exterior"
                maxLength={80}
                className="w-full bg-[#fbf8ef] border border-stone-300 rounded-lg p-2 font-hand text-base"
              />
            </div>

            {validationError && (
              <p className="text-red-700 bg-red-50 border border-red-300 p-2 rounded text-sm font-hand">
                {validationError}
              </p>
            )}

            <button
              onClick={handleStartRoundFromWord}
              disabled={!inputWord.trim()}
              className="w-full py-3 bg-stone-800 hover:bg-stone-900 disabled:opacity-40 disabled:cursor-not-allowed text-white font-hand font-bold text-xl rounded-lg sketch-border-sm sketch-shadow-hover transition-all flex items-center justify-center gap-2 mt-4"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Guardar Palabra y Pasar Dispositivo</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PASS DEVICE INTERSTITIAL */}
      {step === 'pass_device' && (
        <div className="w-full max-w-md bg-[#fffdf9] border-2 border-stone-800 rounded-xl p-8 sketch-border notebook-sheet text-center">
          <div className="w-16 h-16 bg-amber-100 border-2 border-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 sketch-border">
            <User className="w-8 h-8 text-amber-800" />
          </div>

          <h3 className="font-title text-4xl font-bold text-stone-900 mb-2">
            ¡Pasa el cuaderno!
          </h3>
          <p className="font-hand text-xl text-stone-700 mb-6">
            Entrégale el dispositivo a <strong className="text-amber-900 font-bold">{guesserName}</strong>.
            <br />
            <span className="text-sm text-stone-500">
              La palabra secreta está oculta y lista para ser adivinada.
            </span>
          </p>

          <button
            onClick={handleStartGuessing}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-hand font-bold text-xl rounded-lg sketch-border-sm sketch-shadow-hover transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            <span>Soy {guesserName}, ¡comenzar!</span>
          </button>
        </div>
      )}

      {/* STEP 3: GUESSING GAMEPLAY */}
      {step === 'guessing' && (
        <div className="w-full flex flex-col items-center">
          <div className="w-full text-center mb-2">
            <span className="font-hand text-lg text-stone-600">
              Adivina: <strong className="text-stone-900">{guesserName}</strong>
            </span>
          </div>

          <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Canvas */}
            <div className="md:col-span-5 flex flex-col items-center">
              <HangmanCanvas mistakes={mistakes} maxMistakes={maxMistakes} isWon={isWon} isLost={isLost} />
              <p className="font-hand text-stone-600 text-sm mt-1">
                Intentos restantes: <strong className="text-stone-900">{maxMistakes - mistakes}</strong> de {maxMistakes}
              </p>
            </div>

            {/* Word & clue */}
            <div className="md:col-span-7 flex flex-col items-center gap-4">
              <div className="text-center">
                <p className="font-typewriter text-xs uppercase tracking-widest text-stone-500">
                  Categoría
                </p>
                <h3 className="font-title text-3xl font-bold text-stone-900">
                  {activeCategory}
                </h3>
              </div>

              {/* Masked letters */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 py-4 min-h-[60px]">
                {displayMask.map((char, index) => {
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

              <p className="font-hand text-stone-500 text-sm">
                {activeWord.replace(/\s+/g, '').length} letras
              </p>

              {activeHint && (
                <div className="bg-[#fffbe6] border-l-4 border-amber-500 p-2.5 rounded shadow-xs text-stone-800 font-hand text-sm max-w-md w-full">
                  <span className="font-bold text-amber-900">Pista de {writerName}: </span>
                  <span>{activeHint}</span>
                </div>
              )}
            </div>
          </div>

          <div className="w-full mt-4">
            <VirtualKeyboard
              guessedLetters={guessedLetters}
              secretWord={activeWord}
              onGuessLetter={handleGuess}
              disabled={isWon || isLost}
            />
          </div>
        </div>
      )}

      {/* STEP 4: ROUND RESULT */}
      {step === 'round_result' && (
        <div className="w-full max-w-md bg-[#fffdf9] border-2 border-stone-800 rounded-xl p-6 sketch-border notebook-sheet text-center">
          <h3 className="font-title text-4xl font-bold text-stone-900 mb-2">
            {isWon ? '¡Palabra descubierta!' : '¡Ahorcado!'}
          </h3>

          <p className="font-hand text-2xl text-amber-900 font-bold mb-3">
            ¡Punto para {roundWinner}!
          </p>

          <div className="bg-[#fcf8ee] border border-stone-300 p-3 rounded-lg mb-4 font-hand">
            <p className="text-sm text-stone-600">La palabra secreta era:</p>
            <p className="text-2xl font-bold text-stone-900 uppercase tracking-widest mt-0.5">
              {activeWord}
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={handleNextRound}
              className="px-6 py-2.5 bg-stone-800 hover:bg-stone-900 text-white font-hand font-bold text-xl rounded-lg sketch-border-sm sketch-shadow-hover"
            >
              Siguiente Ronda (Cambiar Roles)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
