import React, { useEffect, useCallback } from 'react';
import { normalizeChar } from '../game/rules';
import { sound } from '../audio/soundEffects';

interface VirtualKeyboardProps {
  guessedLetters: Set<string>;
  secretWord: string;
  onGuessLetter: (letter: string) => void;
  disabled?: boolean;
}

const KEYBOARD_ROWS = [
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
  ['J', 'K', 'L', 'M', 'N', 'Ñ', 'O', 'P', 'Q'],
  ['R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
];

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  guessedLetters,
  secretWord,
  onGuessLetter,
  disabled = false,
}) => {
  // Set of normalized letters in secret word for quick matching
  const secretNormalizedSet = React.useMemo(() => {
    return new Set(Array.from(secretWord).map(c => normalizeChar(c)));
  }, [secretWord]);

  // Handle guessing a letter
  const handleKeyClick = useCallback(
    (letter: string) => {
      if (disabled) return;
      const norm = normalizeChar(letter);
      if (guessedLetters.has(norm)) return;

      sound.playPencilStroke();
      onGuessLetter(norm);
    },
    [disabled, guessedLetters, onGuessLetter]
  );

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      // Don't intercept if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key.toUpperCase();
      if (/^[A-ZÑ]$/.test(key)) {
        handleKeyClick(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, handleKeyClick]);

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-2 p-2 select-none" data-testid="virtual-keyboard">
      {KEYBOARD_ROWS.map((row, rIdx) => (
        <div key={rIdx} className="flex justify-center gap-1.5 sm:gap-2">
          {row.map(letter => {
            const isGuessed = guessedLetters.has(letter);
            const isCorrect = isGuessed && secretNormalizedSet.has(letter);
            const isIncorrect = isGuessed && !secretNormalizedSet.has(letter);

            let keyStyle = 'bg-[#fcfbf7] text-[#2c2825] hover:bg-[#f0ece1] active:translate-y-0.5 border-[#4a443e]';
            if (isCorrect) {
              keyStyle = 'bg-[#e8f5e9] text-[#1b5e20] border-[#2e7d32] shadow-inner opacity-90';
            } else if (isIncorrect) {
              keyStyle = 'bg-[#fbe9e7] text-[#c62828] border-[#c62828] line-through opacity-55';
            }

            return (
              <button
                key={letter}
                onClick={() => handleKeyClick(letter)}
                disabled={disabled || isGuessed}
                aria-label={`Letra ${letter}`}
                className={`
                  relative font-hand font-bold text-lg sm:text-xl md:text-2xl
                  w-8 h-10 sm:w-10 sm:h-12 md:w-11 md:h-13
                  flex items-center justify-center
                  rounded-md border-2 sketch-border-sm
                  transition-all duration-100
                  ${keyStyle}
                  ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                `}
              >
                <span>{letter}</span>

                {/* Hand-drawn cross mark on incorrect letter */}
                {isIncorrect && (
                  <svg
                    className="absolute inset-0 w-full h-full text-red-600/70 pointer-events-none p-1"
                    viewBox="0 0 40 40"
                  >
                    <path
                      d="M8,10 Q20,20 32,30"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <path
                      d="M32,10 Q20,20 8,30"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                )}

                {/* Hand-drawn circle on correct letter */}
                {isCorrect && (
                  <svg
                    className="absolute inset-0 w-full h-full text-green-700/60 pointer-events-none p-0.5"
                    viewBox="0 0 40 40"
                  >
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="95 5"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};
