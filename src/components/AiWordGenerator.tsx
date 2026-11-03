import React, { useState } from 'react';
import { Sparkles, BookmarkPlus, Play, Check, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { WordItem, DifficultyLevel } from '../types/game';
import { sound } from '../audio/soundEffects';
import { getSavedWords, saveWords } from '../storage/libraryStorage';
import { generateClientWords } from '../game/clientWordGenerator';

interface AiWordGeneratorProps {
  onPlayWithWords: (words: WordItem[]) => void;
  onGoToLibrary: () => void;
}

const POPULAR_TOPICS = [
  'Mitología Griega',
  'Videojuegos Clásicos',
  'Criaturas Fantásticas',
  'Astronomía y Galaxias',
  'Cine y Directores',
  'Instrumentos Musicales',
  'Inventos de la Historia',
  'Fauna Marina',
];

export const AiWordGenerator: React.FC<AiWordGeneratorProps> = ({
  onPlayWithWords,
  onGoToLibrary,
}) => {
  const [topic, setTopic] = useState('Mitología Griega');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('normal');
  const [count, setCount] = useState<number>(10);
  const [includeHints, setIncludeHints] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState(false);
  const [generatedWords, setGeneratedWords] = useState<WordItem[]>([]);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState('');
  const [savedSuccessMessage, setSavedSuccessMessage] = useState('');

  // Handle generation via backend API
  const handleGenerate = async () => {
    if (!topic.trim()) {
      setErrorMessage('Por favor introduce una temática.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSavedSuccessMessage('');
    sound.playPencilStroke();

    try {
      const response = await fetch('/api/words/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          difficulty,
          count,
          includeHints,
          language: 'es',
        }),
      });

      if (!response.ok) {
        throw new Error('Servidor full-stack no disponible');
      }

      const data = await response.json();
      setGeneratedWords(data.words || []);
      const allIds = new Set<string>((data.words || []).map((w: WordItem) => w.id));
      setSelectedWordIds(allIds);
      sound.playPageFlip();
    } catch {
      // Graceful fallback for GitHub Pages or offline environments
      const clientBatch = generateClientWords(topic, difficulty, count, includeHints);
      setGeneratedWords(clientBatch);
      setSelectedWordIds(new Set(clientBatch.map(w => w.id)));
      setSavedSuccessMessage('Generado en modo estático (compatible con GitHub Pages y sin conexión).');
      sound.playPageFlip();
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle selection
  const toggleSelectWord = (id: string) => {
    const next = new Set(selectedWordIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedWordIds(next);
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedWordIds.size === generatedWords.length) {
      setSelectedWordIds(new Set());
    } else {
      setSelectedWordIds(new Set(generatedWords.map(w => w.id)));
    }
  };

  // Save selected words into library
  const handleSaveSelectedToLibrary = () => {
    const wordsToSave = generatedWords.filter(w => selectedWordIds.has(w.id));
    if (wordsToSave.length === 0) return;

    const existing = getSavedWords();
    const existingWordsUpper = new Set(existing.map(w => w.word.toUpperCase()));

    let addedCount = 0;
    const combined = [...existing];

    for (const w of wordsToSave) {
      if (!existingWordsUpper.has(w.word.toUpperCase())) {
        combined.push(w);
        existingWordsUpper.add(w.word.toUpperCase());
        addedCount++;
      }
    }

    saveWords(combined);
    sound.playVictory();
    setSavedSuccessMessage(`¡${addedCount} palabras añadidas a tu Biblioteca Personal!`);
  };

  // Play immediately with this batch
  const handlePlayNow = () => {
    if (generatedWords.length === 0) return;
    const subset = generatedWords.filter(w => selectedWordIds.has(w.id));
    const wordsToUse = subset.length > 0 ? subset : generatedWords;
    sound.playPageFlip();
    onPlayWithWords(wordsToUse);
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      {/* Configuration Card */}
      <div className="w-full bg-[#fffdf9] border-2 border-stone-800 rounded-xl p-6 sm:p-8 sketch-border notebook-sheet mb-6">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-amber-100 border-2 border-amber-600 rounded-full flex items-center justify-center mx-auto mb-2 sketch-border">
            <Sparkles className="w-7 h-7 text-amber-800" />
          </div>
          <h2 className="font-title text-4xl font-bold text-stone-900">
            Generador de Palabras con Inteligencia Artificial
          </h2>
          <p className="font-hand text-stone-600 text-base mt-1 max-w-xl mx-auto">
            Introduce cualquier temática imaginable. El motor de IA generará palabras estructuradas, pistas pedagógicas sin spoiler y dificultades calibradas.
          </p>
        </div>

        {/* Form Inputs */}
        <div className="space-y-4 font-hand text-stone-800">
          {/* Custom Theme Input */}
          <div>
            <label className="block font-bold text-stone-800 text-base mb-1">
              Temática o tema deseado:
            </label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Ej: Mitología nórdica, Dinosaurios, Arquitectura gótica..."
              maxLength={60}
              className="w-full bg-[#fbf8ef] border-2 border-stone-400 rounded-lg p-2.5 font-hand text-xl text-stone-900 focus:outline-hidden focus:border-stone-800"
            />

            {/* Quick suggested pills */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-xs text-stone-500 font-typewriter">Sugerencias:</span>
              {POPULAR_TOPICS.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTopic(item)}
                  className="text-xs bg-[#faf6eb] hover:bg-amber-100 text-stone-700 hover:text-amber-900 border border-stone-300 rounded-full px-2.5 py-0.5 transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Difficulty */}
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-1">
                Dificultad estimada:
              </label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as DifficultyLevel)}
                className="w-full bg-[#fbf8ef] border border-stone-300 rounded-lg p-2 font-hand text-base capitalize"
              >
                <option value="facil">Fácil (Palabras comunes)</option>
                <option value="normal">Normal (Longitud media)</option>
                <option value="dificil">Difícil (Vocabulario rico)</option>
                <option value="experto">Experto (Desafío total)</option>
              </select>
            </div>

            {/* Count */}
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-1">
                Cantidad de palabras:
              </label>
              <select
                value={count}
                onChange={e => setCount(Number(e.target.value))}
                className="w-full bg-[#fbf8ef] border border-stone-300 rounded-lg p-2 font-hand text-base"
              >
                <option value={5}>5 Palabras</option>
                <option value={10}>10 Palabras</option>
                <option value={20}>20 Palabras</option>
                <option value={50}>50 Palabras (Lote amplio)</option>
              </select>
            </div>

            {/* Hints Toggle */}
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={includeHints}
                  onChange={e => setIncludeHints(e.target.checked)}
                  className="w-4 h-4 accent-amber-700 rounded cursor-pointer"
                />
                <span className="text-sm font-bold text-stone-800">
                  Incluir pistas ingeniosas
                </span>
              </label>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-red-700 font-hand text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isLoading || !topic.trim()}
            className="w-full py-3 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-hand font-bold text-xl rounded-lg sketch-border-sm sketch-shadow-hover transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                <span>Generando palabras con Gemini 3.8 Flash...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Generar {count} palabras con IA</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {generatedWords.length > 0 && (
        <div className="w-full bg-[#fffdf9] border-2 border-stone-800 rounded-xl p-6 sketch-border notebook-sheet">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-stone-300">
            <div>
              <h3 className="font-title text-3xl font-bold text-stone-900">
                Lote Generado: {topic}
              </h3>
              <p className="font-hand text-sm text-stone-600">
                {generatedWords.length} palabras estructuradas disponibles ({selectedWordIds.size} seleccionadas)
              </p>
            </div>

            {/* Batch actions */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={toggleSelectAll}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded font-hand text-sm text-stone-800"
              >
                {selectedWordIds.size === generatedWords.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
              </button>

              <button
                onClick={handleSaveSelectedToLibrary}
                disabled={selectedWordIds.size === 0}
                className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-white rounded font-hand font-bold text-sm flex items-center gap-1.5 sketch-border-sm"
              >
                <BookmarkPlus className="w-4 h-4" />
                <span>Guardar seleccionadas</span>
              </button>

              <button
                onClick={handlePlayNow}
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-hand font-bold text-sm flex items-center gap-1.5 sketch-border-sm"
              >
                <Play className="w-4 h-4" />
                <span>Jugar partida ahora</span>
              </button>
            </div>
          </div>

          {savedSuccessMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-400 text-emerald-800 rounded font-hand text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-600" />
                <span>{savedSuccessMessage}</span>
              </div>
              <button
                onClick={onGoToLibrary}
                className="underline font-bold hover:text-emerald-950 text-sm"
              >
                Ir a mi Biblioteca
              </button>
            </div>
          )}

          {/* Structured Words Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left font-hand border-collapse text-sm sm:text-base">
              <thead>
                <tr className="border-b-2 border-stone-800 text-stone-700 bg-[#f9f5e8]">
                  <th className="p-2 w-10 text-center">Sel.</th>
                  <th className="p-2">Palabra</th>
                  <th className="p-2">Dificultad</th>
                  <th className="p-2">Letras</th>
                  <th className="p-2">Pista Pedagógica</th>
                </tr>
              </thead>
              <tbody>
                {generatedWords.map(w => {
                  const isChecked = selectedWordIds.has(w.id);
                  return (
                    <tr
                      key={w.id}
                      onClick={() => toggleSelectWord(w.id)}
                      className={`border-b border-stone-200 cursor-pointer transition-colors ${
                        isChecked ? 'bg-amber-50/60' : 'hover:bg-stone-50'
                      }`}
                    >
                      <td className="p-2 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectWord(w.id)}
                          className="w-4 h-4 accent-amber-700 cursor-pointer"
                        />
                      </td>
                      <td className="p-2 font-bold font-typewriter tracking-wider text-stone-900 text-lg">
                        {w.word}
                      </td>
                      <td className="p-2">
                        <span className="text-xs capitalize px-2 py-0.5 rounded-full border border-stone-300 bg-stone-100">
                          {w.difficulty}
                        </span>
                      </td>
                      <td className="p-2 text-stone-600 font-bold">{w.length}</td>
                      <td className="p-2 text-stone-700 text-sm max-w-xs">{w.hint || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
