import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  FolderPlus,
  Plus,
  Search,
  Star,
  Trash2,
  Edit2,
  Play,
  Download,
  Upload,
  Folder,
  Layers,
  Sparkles,
} from 'lucide-react';
import { WordItem, DifficultyLevel } from '../types/game';
import { sound } from '../audio/soundEffects';
import {
  getSavedWords,
  saveWords,
  getSavedCategories,
  saveCategories,
} from '../storage/libraryStorage';
import { validateCustomWord, filterWordCollection } from '../game/rules';

interface WordLibraryProps {
  onPlayCollection: (words: WordItem[]) => void;
  onGoToGenerator: () => void;
}

export const WordLibrary: React.FC<WordLibraryProps> = ({
  onPlayCollection,
  onGoToGenerator,
}) => {
  const [words, setWords] = useState<WordItem[]>(() => getSavedWords());
  const [categories, setCategories] = useState<string[]>(() => getSavedCategories());

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // Modals
  const [isAddWordOpen, setIsAddWordOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<WordItem | null>(null);

  // New word form state
  const [formWord, setFormWord] = useState('');
  const [formCategory, setFormCategory] = useState(categories[0] || 'General');
  const [formDifficulty, setFormDifficulty] = useState<DifficultyLevel>('normal');
  const [formHint, setFormHint] = useState('');
  const [formError, setFormError] = useState('');

  // New category name
  const [newCatName, setNewCatName] = useState('');

  // Counts by category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const w of words) {
      counts[w.category] = (counts[w.category] || 0) + 1;
    }
    return counts;
  }, [words]);

  // Filtered words
  const filteredWords = useMemo(() => {
    return filterWordCollection(words, {
      category: activeCategory,
      difficulty: selectedDifficulty,
      search: searchQuery,
      favoritesOnly,
    });
  }, [words, activeCategory, selectedDifficulty, searchQuery, favoritesOnly]);

  // Toggle favorite
  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = words.map(w => (w.id === id ? { ...w, isFavorite: !w.isFavorite } : w));
    setWords(updated);
    saveWords(updated);
    sound.playPencilStroke();
  };

  // Delete word
  const handleDeleteWord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Eliminar esta palabra de tu biblioteca?')) {
      const updated = words.filter(w => w.id !== id);
      setWords(updated);
      saveWords(updated);
      sound.playWrong();
    }
  };

  // Add category
  const handleCreateCategory = () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      alert('Esta categoría ya existe.');
      return;
    }

    const updated = [...categories, trimmed];
    setCategories(updated);
    saveCategories(updated);
    setNewCatName('');
    setIsAddCategoryOpen(false);
    setActiveCategory(trimmed);
    sound.playPencilStroke();
  };

  // Save new word
  const handleSaveWord = () => {
    const validation = validateCustomWord(formWord, formHint);
    if (!validation.valid) {
      setFormError(validation.error || 'Palabra no válida');
      return;
    }

    const wordUpper = formWord.trim().toUpperCase();

    if (editingWord) {
      const updated = words.map(w =>
        w.id === editingWord.id
          ? {
              ...w,
              word: wordUpper,
              category: formCategory,
              difficulty: formDifficulty,
              hint: formHint.trim(),
              length: wordUpper.replace(/\s+/g, '').length,
            }
          : w
      );
      setWords(updated);
      saveWords(updated);
      setEditingWord(null);
    } else {
      const newWordItem: WordItem = {
        id: `custom-${Date.now()}`,
        word: wordUpper,
        category: formCategory,
        difficulty: formDifficulty,
        hint: formHint.trim(),
        length: wordUpper.replace(/\s+/g, '').length,
        language: 'es',
        createdAt: new Date().toISOString(),
        source: 'custom',
      };
      const updated = [newWordItem, ...words];
      setWords(updated);
      saveWords(updated);
    }

    setFormWord('');
    setFormHint('');
    setFormError('');
    setIsAddWordOpen(false);
    sound.playPencilStroke();
  };

  // Open edit modal
  const handleOpenEdit = (w: WordItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWord(w);
    setFormWord(w.word);
    setFormCategory(w.category);
    setFormDifficulty(w.difficulty);
    setFormHint(w.hint);
    setFormError('');
    setIsAddWordOpen(true);
  };

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ words, categories }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'cuaderno_ahorcado_palabras.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    sound.playPageFlip();
  };

  // Import JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json.words)) {
          setWords(json.words);
          saveWords(json.words);
        }
        if (Array.isArray(json.categories)) {
          setCategories(json.categories);
          saveCategories(json.categories);
        }
        sound.playVictory();
        alert('¡Colección importada con éxito!');
      } catch {
        alert('Archivo JSON no válido.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col">
      {/* Header Banner */}
      <div className="w-full bg-[#fbf8ef] border-2 border-stone-800 rounded-xl p-4 sm:p-5 mb-6 sketch-border shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-amber-800" />
            <div>
              <h2 className="font-title text-3xl sm:text-4xl font-bold text-stone-900">
                Mi Cuaderno de Palabras
              </h2>
              <p className="font-hand text-stone-600 text-sm">
                {words.length} palabras guardadas en {categories.length} colecciones temáticas.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setEditingWord(null);
                setFormWord('');
                setFormHint('');
                setFormCategory(activeCategory !== 'all' ? activeCategory : categories[0] || 'General');
                setIsAddWordOpen(true);
              }}
              className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-hand font-bold text-base rounded-md sketch-border-sm flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Palabra</span>
            </button>

            <button
              onClick={() => setIsAddCategoryOpen(true)}
              className="px-3 py-1.5 bg-[#faf6eb] hover:bg-amber-100 text-amber-900 border border-stone-400 font-hand text-base rounded-md flex items-center gap-1.5"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Nueva Colección</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="p-1.5 bg-white hover:bg-stone-100 border border-stone-300 rounded text-stone-700"
              title="Exportar archivo JSON"
              aria-label="Exportar cuaderno en JSON"
            >
              <Download className="w-4 h-4" />
            </button>

            <label
              className="p-1.5 bg-white hover:bg-stone-100 border border-stone-300 rounded text-stone-700 cursor-pointer"
              title="Importar archivo JSON"
            >
              <Upload className="w-4 h-4" />
              <input type="file" accept=".json" onChange={handleImportJSON} className="sr-only" />
            </label>
          </div>
        </div>
      </div>

      {/* Main Grid: Collections Sidebar + Word List */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Categories List */}
        <div className="md:col-span-4 flex flex-col gap-3">
          <div className="bg-[#fffdf9] border-2 border-stone-800 rounded-xl p-4 sketch-border notebook-sheet">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-300">
              <h3 className="font-title text-2xl font-bold text-stone-900">
                Colecciones
              </h3>
              <span className="text-xs font-hand text-stone-500">{categories.length} carpetas</span>
            </div>

            <div className="space-y-1.5 font-hand text-base">
              <button
                onClick={() => setActiveCategory('all')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                  activeCategory === 'all'
                    ? 'bg-amber-200 text-amber-950 font-bold border border-amber-400'
                    : 'hover:bg-stone-100 text-stone-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-stone-600" />
                  <span>Todas las palabras</span>
                </div>
                <span className="text-xs bg-stone-200 text-stone-800 px-2 py-0.5 rounded-full">
                  {words.length}
                </span>
              </button>

              {categories.map(cat => {
                const count = categoryCounts[cat] || 0;
                const isSelected = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-amber-200 text-amber-950 font-bold border border-amber-400'
                        : 'hover:bg-stone-100 text-stone-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Folder className="w-4 h-4 text-amber-700 shrink-0" />
                      <span className="truncate">{cat}</span>
                    </div>
                    <span className="text-xs bg-stone-200 text-stone-800 px-2 py-0.5 rounded-full shrink-0">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Play Collection Button */}
            {filteredWords.length > 0 && (
              <div className="pt-4 mt-4 border-t border-stone-200">
                <button
                  onClick={() => onPlayCollection(filteredWords)}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-hand font-bold text-lg rounded-lg sketch-border-sm sketch-shadow-hover transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Jugar con esta selección ({filteredWords.length})</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Filter Controls + Word Cards */}
        <div className="md:col-span-8 flex flex-col gap-4">
          {/* Filters Bar */}
          <div className="bg-[#fffdf9] border border-stone-300 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 font-hand">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar palabra o pista..."
                className="w-full bg-[#fbf8ef] border border-stone-300 rounded-lg pl-9 pr-3 py-1.5 text-sm"
              />
            </div>

            {/* Difficulty Filter */}
            <select
              value={selectedDifficulty}
              onChange={e => setSelectedDifficulty(e.target.value)}
              className="bg-[#fbf8ef] border border-stone-300 rounded-lg px-2.5 py-1.5 text-sm capitalize"
            >
              <option value="all">Todas las dificultades</option>
              <option value="facil">Fácil</option>
              <option value="normal">Normal</option>
              <option value="dificil">Difícil</option>
              <option value="experto">Experto</option>
            </select>

            {/* Favorites Toggle */}
            <button
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                favoritesOnly
                  ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold'
                  : 'bg-[#fbf8ef] border-stone-300 text-stone-700'
              }`}
            >
              <Star className={`w-4 h-4 ${favoritesOnly ? 'text-amber-500 fill-amber-500' : ''}`} />
              <span>Favoritos</span>
            </button>
          </div>

          {/* Words List */}
          {filteredWords.length === 0 ? (
            <div className="bg-[#fffdf9] border-2 border-dashed border-stone-300 rounded-xl p-8 text-center font-hand text-stone-600">
              <BookOpen className="w-10 h-10 text-stone-400 mx-auto mb-2" />
              <p className="text-xl">No hay palabras en este filtro.</p>
              <p className="text-sm mt-1 text-stone-500">
                Puedes añadir palabras manualmente o generarlas con la Inteligencia Artificial.
              </p>
              <button
                onClick={onGoToGenerator}
                className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg sketch-border-sm inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>Generar con IA</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredWords.map(w => (
                <div
                  key={w.id}
                  className="bg-[#fffdfa] border-2 border-stone-800 rounded-xl p-3.5 sketch-border-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-typewriter text-xl font-bold text-stone-900 tracking-wider">
                        {w.word}
                      </span>
                      <button
                        onClick={e => handleToggleFavorite(w.id, e)}
                        className="p-1 text-stone-400 hover:text-amber-500"
                        aria-label="Marcar como favorita"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            w.isFavorite ? 'text-amber-500 fill-amber-500' : ''
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full font-hand">
                        {w.category}
                      </span>
                      <span className="text-xs capitalize text-stone-600 font-hand">
                        {w.difficulty} ({w.length} letras)
                      </span>
                    </div>

                    {w.hint && (
                      <p className="font-hand text-stone-700 text-sm mt-2 line-clamp-2 italic">
                        "{w.hint}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-stone-200">
                    <span className="text-[11px] font-hand text-stone-400 uppercase tracking-wider">
                      {w.source === 'ai' ? '🤖 Generada con IA' : '✍️ Cuaderno'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={e => handleOpenEdit(w, e)}
                        className="p-1 hover:bg-stone-100 rounded text-stone-600"
                        title="Editar palabra"
                        aria-label={`Editar palabra ${w.word}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => handleDeleteWord(w.id, e)}
                        className="p-1 hover:bg-red-50 rounded text-red-600"
                        title="Eliminar palabra"
                        aria-label={`Eliminar palabra ${w.word}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Word Modal */}
      {isAddWordOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#fffdf9] border-2 border-stone-800 rounded-xl p-6 w-full max-w-md sketch-border notebook-sheet">
            <h3 className="font-title text-3xl font-bold text-stone-900 mb-4 pb-2 border-b border-stone-300">
              {editingWord ? 'Editar Palabra' : 'Añadir Nueva Palabra'}
            </h3>

            <div className="space-y-3 font-hand text-stone-800">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1">
                  Palabra secreta:
                </label>
                <input
                  type="text"
                  value={formWord}
                  onChange={e => setFormWord(e.target.value.toUpperCase())}
                  placeholder="Ej: COLIBRÍ"
                  maxLength={25}
                  className="w-full bg-[#fbf8ef] border-2 border-stone-400 rounded-lg p-2 font-hand text-xl uppercase tracking-wider text-stone-900"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1">
                  Categoría / Colección:
                </label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  className="w-full bg-[#fbf8ef] border border-stone-300 rounded-lg p-2 font-hand"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1">
                  Dificultad:
                </label>
                <select
                  value={formDifficulty}
                  onChange={e => setFormDifficulty(e.target.value as DifficultyLevel)}
                  className="w-full bg-[#fbf8ef] border border-stone-300 rounded-lg p-2 font-hand capitalize"
                >
                  <option value="facil">Fácil</option>
                  <option value="normal">Normal</option>
                  <option value="dificil">Difícil</option>
                  <option value="experto">Experto</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1">
                  Pista descriptiva (sin decir la palabra):
                </label>
                <textarea
                  value={formHint}
                  onChange={e => setFormHint(e.target.value)}
                  rows={2}
                  placeholder="Pista sutil..."
                  className="w-full bg-[#fbf8ef] border border-stone-300 rounded-lg p-2 font-hand text-sm"
                />
              </div>

              {formError && (
                <p className="text-red-700 bg-red-50 p-2 rounded text-xs">{formError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-stone-300">
              <button
                onClick={() => setIsAddWordOpen(false)}
                className="px-4 py-1.5 text-stone-600 hover:text-stone-900 font-hand"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveWord}
                className="px-5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-hand font-bold text-lg rounded-md sketch-border-sm"
              >
                Guardar Palabra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#fffdf9] border-2 border-stone-800 rounded-xl p-6 w-full max-w-sm sketch-border notebook-sheet">
            <h3 className="font-title text-3xl font-bold text-stone-900 mb-3">
              Nueva Colección
            </h3>
            <div className="font-hand">
              <label className="block text-sm font-bold text-stone-700 mb-1">
                Nombre de la temática:
              </label>
              <input
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Ej: Literatura Española"
                maxLength={30}
                className="w-full bg-[#fbf8ef] border-2 border-stone-400 rounded-lg p-2 font-hand text-lg mb-4"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsAddCategoryOpen(false)}
                className="px-3 py-1 text-stone-600 hover:text-stone-900 font-hand"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateCategory}
                disabled={!newCatName.trim()}
                className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white font-hand font-bold rounded sketch-border-sm"
              >
                Crear Colección
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
