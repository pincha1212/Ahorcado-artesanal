import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Settings, Lightbulb, RefreshCw, Trophy, Heart, ArrowRight, BookOpen } from 'lucide-react';
import { WordItem, GameSettings, DifficultyLevel } from '../types/game';
import { HangmanCanvas } from './HangmanCanvas';
import { VirtualKeyboard } from './VirtualKeyboard';
import {
  getDisplayMask,
  checkWinCondition,
  checkLossCondition,
  calculateRoundScore,
  normalizeChar,
} from '../game/rules';
import { sound } from '../audio/soundEffects';
import { getSavedWords, recordGameResult } from '../storage/libraryStorage';

interface SoloGameProps {
  onGoToLibrary?: () => void;
  onGoToGenerator?: () => void;
  initialWords?: WordItem[];
}

export const SoloGame: React.FC<SoloGameProps> = ({
  onGoToLibrary,
  onGoToGenerator,
  initialWords,
}) => {
  // Settings State
  const [settings, setSettings] = useState<GameSettings>({
    category: 'all',
    difficulty: 'normal',
    source: initialWords ? 'library' : 'preset',
    roundCount: 'infinite',
    hintsEnabled: true,
    maxAttempts: 7,
  });

  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Pool of available words
  const [allWords, setAllWords] = useState<WordItem[]>(() => {
    return initialWords || getSavedWords();
  });

  // Current match state
  const [currentWordItem, setCurrentWordItem] = useState<WordItem | null>(null);
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [mistakes, setMistakes] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [isLost, setIsLost] = useState(false);
  const [hintRevealed, setHintRevealed] = useState(false);
  const [roundScore, setRoundScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [streak, setStreak] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());

  // Filter eligible words based on current settings
  const eligibleWords = useMemo(() => {
    return allWords.filter(item => {
      if (settings.category !== 'all' && item.category.toLowerCase() !== settings.category.toLowerCase()) {
        return false;
      }
      if (settings.difficulty !== 'normal' && item.difficulty !== settings.difficulty) {
        // If not enough words in this difficulty, allow fallback
        return false;
      }
      return true;
    });
  }, [allWords, settings.category, settings.difficulty]);

  // Select next word
  const startNextWord = useCallback(() => {
    const candidates = eligibleWords.length > 0 ? eligibleWords : allWords;
    if (candidates.length === 0) return;

    // Pick random candidate (avoid identical repeat if more than 1)
    let next: WordItem;
    if (candidates.length === 1) {
      next = candidates[0];
    } else {
      do {
        next = candidates[Math.floor(Math.random() * candidates.length)];
      } while (currentWordItem && next.id === currentWordItem.id && candidates.length > 1);
    }

    setCurrentWordItem(next);
    setGuessedLetters(new Set());
    setMistakes(0);
    setIsWon(false);
    setIsLost(false);
    setHintRevealed(false);
    setRoundScore(0);
    setStartTime(Date.now());
  }, [eligibleWords, allWords, currentWordItem]);

  // Initial load
  useEffect(() => {
    startNextWord();
  }, []);

  // Handle guessing a letter
  const handleGuess = useCallback(
    (letter: string) => {
      if (!currentWordItem || isWon || isLost) return;
      const norm = normalizeChar(letter);
      if (guessedLetters.has(norm)) return;

      const nextGuessed = new Set(guessedLetters);
      nextGuessed.add(norm);
      setGuessedLetters(nextGuessed);

      // Check if letter matches
      const wordNormChars = Array.from(currentWordItem.word).map(c => normalizeChar(c));
      const isHit = wordNormChars.includes(norm);

      if (isHit) {
        sound.playCorrect();
        // Check win
        if (checkWinCondition(currentWordItem.word, nextGuessed)) {
          setIsWon(true);
          const score = calculateRoundScore(
            new Set(wordNormChars).size,
            mistakes,
            settings.maxAttempts,
            hintRevealed,
            currentWordItem.difficulty
          );
          setRoundScore(score);
          setTotalScore(prev => prev + score);
          setStreak(prev => prev + 1);
          sound.playVictory();

          const elapsed = Math.round((Date.now() - startTime) / 1000);
          recordGameResult(true, currentWordItem.category, currentWordItem.difficulty, nextGuessed.size - mistakes, mistakes, elapsed);
        }
      } else {
        sound.playWrong();
        const nextMistakes = mistakes + 1;
        setMistakes(nextMistakes);

        if (checkLossCondition(nextMistakes, settings.maxAttempts)) {
          setIsLost(true);
          setStreak(0);
          sound.playDefeat();

          const elapsed = Math.round((Date.now() - startTime) / 1000);
          recordGameResult(false, currentWordItem.category, currentWordItem.difficulty, nextGuessed.size - nextMistakes, nextMistakes, elapsed);
        }
      }
    },
    [currentWordItem, guessedLetters, isWon, isLost, mistakes, settings.maxAttempts, hintRevealed, startTime]
  );

  // Available unique categories
  const categoriesList = useMemo(() => {
    const set = new Set(allWords.map(w => w.category));
    return Array.from(set);
  }, [allWords]);

  const displayMask = currentWordItem
    ? getDisplayMask(currentWordItem.word, guessedLetters)
    : [];

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      {/* Top Paper Header Ribbon */}
      <div className="w-full flex items-center justify-between pb-3 mb-2 border-b-2 border-dashed border-stone-300">
        <div className="flex items-center gap-2">
          <span className="font-hand font-bold text-lg text-stone-800">
            Ronda {currentRound}
            {settings.roundCount !== 'infinite' && ` / ${settings.roundCount}`}
          </span>
          <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-hand">
            {currentWordItem?.category || 'General'}
          </span>
          <span className="text-xs bg-stone-100 text-stone-700 border border-stone-300 px-2 py-0.5 rounded-full font-hand capitalize">
            {currentWordItem?.difficulty || 'Normal'}
          </span>
        </div>

        {/* Score & Streak */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-amber-800 font-hand font-bold text-base" title="Puntuación total">
            <Trophy className="w-4 h-4 text-amber-600" />
            <span>{totalScore} pts</span>
          </div>

          {streak > 1 && (
            <div className="text-xs bg-orange-100 text-orange-800 font-hand px-2 py-0.5 rounded-full border border-orange-300">
              🔥 Racha: {streak}
            </div>
          )}

          <button
            onClick={() => setIsConfigOpen(true)}
            aria-label="Configurar partida"
            className="p-1.5 rounded-md hover:bg-stone-200/70 text-stone-700 transition-colors"
            title="Configuración de partida"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Play Area */}
      <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-4 items-center">
        {/* Left/Center: Hangman Canvas 2D */}
        <div className="md:col-span-5 flex flex-col items-center justify-center">
          <HangmanCanvas
            mistakes={mistakes}
            maxMistakes={settings.maxAttempts}
            isWon={isWon}
            isLost={isLost}
          />

          {/* Attempts tracker */}
          <div className="flex items-center gap-2 mt-0.5 font-hand text-stone-700 text-sm">
            <span>Intentos restantes:</span>
            <div className="flex gap-1">
              {Array.from({ length: settings.maxAttempts }).map((_, i) => (
                <Heart
                  key={i}
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all ${
                    i < settings.maxAttempts - mistakes
                      ? 'text-red-500 fill-red-500'
                      : 'text-stone-300 line-through opacity-40'
                  }`}
                />
              ))}
            </div>
            <span className="font-bold">({settings.maxAttempts - mistakes}/{settings.maxAttempts})</span>
          </div>
        </div>

        {/* Right: Secret Word Display, Hint and Game State Banner */}
        <div className="md:col-span-7 flex flex-col items-center justify-center gap-3 sm:gap-5">
          {/* Theme badge doodle */}
          <div className="text-center">
            <p className="font-typewriter text-xs uppercase tracking-widest text-stone-500">
              Categoría
            </p>
            <h2 className="font-title text-3xl sm:text-4xl font-bold text-stone-900 underline decoration-wavy decoration-amber-600/40">
              {currentWordItem?.category}
            </h2>
          </div>

          {/* Underlined Secret Word Letters */}
          <div
            className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 py-4 min-h-[70px]"
            data-testid="secret-word-display"
          >
            {displayMask.map((char, index) => {
              if (char === ' ') {
                return <span key={index} className="w-4 sm:w-6" />;
              }

              const isRevealed = char !== '_';
              return (
                <div
                  key={index}
                  className="flex flex-col items-center justify-end w-7 sm:w-10 h-10 sm:h-12 border-b-3 sm:border-b-4 border-stone-800"
                >
                  <span
                    className={`font-hand font-bold text-2xl sm:text-3xl text-stone-900 transition-all duration-200 ${
                      isRevealed ? 'scale-100 opacity-100 text-stone-900' : 'scale-75 opacity-0'
                    }`}
                  >
                    {isRevealed ? char : ''}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="font-hand text-stone-500 text-sm">
            {currentWordItem?.word.replace(/\s+/g, '').length} letras
          </p>

          {/* Hint Section */}
          {settings.hintsEnabled && currentWordItem?.hint && (
            <div className="w-full max-w-md">
              {!hintRevealed ? (
                <button
                  onClick={() => {
                    setHintRevealed(true);
                    sound.playPageFlip();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-[#faf6eb] hover:bg-[#f3eedc] text-amber-900 border border-amber-300 rounded-lg font-hand text-sm sketch-border-sm sketch-shadow-hover transition-all"
                >
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <span>Revelar pista (costo: sin bonificación de pista limpia)</span>
                </button>
              ) : (
                <div className="bg-[#fffbe6] border-l-4 border-amber-500 p-2.5 rounded shadow-sm text-stone-800 font-hand text-sm flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-900">Pista: </span>
                    <span>{currentWordItem.hint}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Outcome Status Banners */}
          {isWon && (
            <div className="w-full max-w-md bg-emerald-50 border-2 border-emerald-600 p-3 rounded-lg text-center sketch-border">
              <h3 className="font-title text-2xl sm:text-3xl font-bold text-emerald-800">
                ¡Felicidades! ¡Descubriste la palabra!
              </h3>
              <p className="font-hand text-emerald-900 mt-1">
                +{roundScore} puntos ganados en esta ronda.
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <button
                  onClick={() => {
                    setCurrentRound(prev => prev + 1);
                    startNextWord();
                    sound.playPageFlip();
                  }}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-hand font-bold text-lg rounded-md sketch-border-sm sketch-shadow-hover flex items-center gap-2"
                >
                  <span>Siguiente palabra</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {isLost && (
            <div className="w-full max-w-md bg-rose-50 border-2 border-rose-600 p-3 rounded-lg text-center sketch-border">
              <h3 className="font-title text-2xl sm:text-3xl font-bold text-rose-800">
                ¡El ahorcado se ha completado!
              </h3>
              <p className="font-hand text-stone-800 mt-1">
                La palabra secreta era:{' '}
                <strong className="text-rose-900 font-bold text-xl uppercase tracking-wider underline">
                  {currentWordItem?.word}
                </strong>
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <button
                  onClick={() => {
                    startNextWord();
                    sound.playPageFlip();
                  }}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-hand font-bold text-lg rounded-md sketch-border-sm sketch-shadow-hover flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Intentar otra palabra</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Virtual Keyboard */}
      <div className="w-full mt-4">
        <VirtualKeyboard
          guessedLetters={guessedLetters}
          secretWord={currentWordItem?.word || ''}
          onGuessLetter={handleGuess}
          disabled={isWon || isLost}
        />
      </div>

      {/* Bottom Actions Bar */}
      <div className="flex items-center justify-between w-full mt-6 pt-3 border-t border-stone-300">
        <button
          onClick={() => {
            sound.playPageFlip();
            startNextWord();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-stone-700 hover:text-stone-900 font-hand text-base rounded hover:bg-stone-200/50"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Cambiar palabra</span>
        </button>

        <div className="flex gap-2">
          {onGoToLibrary && (
            <button
              onClick={onGoToLibrary}
              className="flex items-center gap-1.5 px-3 py-1.5 text-stone-700 hover:text-stone-900 font-hand text-base rounded hover:bg-stone-200/50"
            >
              <BookOpen className="w-4 h-4" />
              <span>Ver Biblioteca</span>
            </button>
          )}
        </div>
      </div>

      {/* Configuration Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#fffef8] border-2 border-stone-800 rounded-xl p-5 w-full max-w-md sketch-border notebook-sheet">
            <h3 className="font-title text-3xl font-bold text-stone-900 border-b border-stone-300 pb-2">
              Configuración de Partida
            </h3>

            <div className="space-y-4 my-4 font-hand text-stone-800">
              {/* Category */}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1">
                  Temática de la partida:
                </label>
                <select
                  value={settings.category}
                  onChange={e => setSettings({ ...settings, category: e.target.value })}
                  className="w-full bg-[#fbf8ef] border border-stone-400 rounded p-1.5 font-hand text-base"
                >
                  <option value="all">Todas las temáticas</option>
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1">
                  Dificultad:
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-sm">
                  {(['facil', 'normal', 'dificil', 'experto'] as DifficultyLevel[]).map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSettings({ ...settings, difficulty: lvl })}
                      className={`py-1 rounded capitalize border text-center ${
                        settings.difficulty === lvl
                          ? 'bg-amber-200 border-amber-800 font-bold'
                          : 'bg-[#faf7ee] border-stone-300 hover:bg-stone-100'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Attempts */}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1">
                  Intentos permitidos:
                </label>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {[6, 7, 8].map(att => (
                    <button
                      key={att}
                      type="button"
                      onClick={() => setSettings({ ...settings, maxAttempts: att })}
                      className={`py-1 rounded border text-center ${
                        settings.maxAttempts === att
                          ? 'bg-stone-800 text-white font-bold'
                          : 'bg-[#faf7ee] border-stone-300'
                      }`}
                    >
                      {att} intentos
                    </button>
                  ))}
                </div>
              </div>

              {/* Hints */}
              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-stone-700">Pistas disponibles:</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.hintsEnabled}
                    onChange={e => setSettings({ ...settings, hintsEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-300">
              <button
                onClick={() => {
                  setIsConfigOpen(false);
                  startNextWord();
                }}
                className="px-4 py-1.5 bg-stone-800 hover:bg-stone-900 text-white font-hand font-bold text-lg rounded-md sketch-border-sm"
              >
                Aplicar y Reiniciar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
