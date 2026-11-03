import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  Users,
  Globe,
  Sparkles,
  BookOpen,
  BarChart3,
  ShieldCheck,
  Pencil,
} from 'lucide-react';
import { GameMode, WordItem } from './types/game';
import { SoloGame } from './components/SoloGame';
import { LocalMultiplayer } from './components/LocalMultiplayer';
import { OnlineMultiplayer } from './components/OnlineMultiplayer';
import { AiWordGenerator } from './components/AiWordGenerator';
import { WordLibrary } from './components/WordLibrary';
import { GameStats } from './components/GameStats';
import { AudioControls } from './components/AudioControls';
import { VersionAuditModal } from './components/VersionAuditModal';
import { sound } from './audio/soundEffects';

export default function App() {
  const [activeTab, setActiveTab] = useState<GameMode>('solo');
  const [customGameWords, setCustomGameWords] = useState<WordItem[] | undefined>(undefined);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Check URL query parameters (e.g. ?autostart=1 or ?tab=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as GameMode | null;
    if (tabParam && ['solo', 'local_secret', 'online', 'generator', 'library', 'stats'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  const handleTabChange = (tab: GameMode) => {
    if (tab === activeTab) return;
    sound.playPageFlip();
    setActiveTab(tab);
  };

  const handlePlayCustomWords = (words: WordItem[]) => {
    setCustomGameWords(words);
    setActiveTab('solo');
    sound.playPageFlip();
  };

  return (
    <div className="min-h-screen paper-pattern flex flex-col justify-between text-[#2c2825] font-hand">
      {/* Top Notebook Header */}
      <header className="sticky top-0 z-40 bg-[#f8f5eb]/95 backdrop-blur-xs border-b-2 border-stone-800 shadow-xs">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between">
          {/* Logo & Hand-drawn title */}
          <button
            onClick={() => handleTabChange('solo')}
            className="flex items-center gap-2 group text-left cursor-pointer"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#f4ebd0] border-2 border-stone-800 rounded-lg flex items-center justify-center sketch-border shadow-xs group-hover:rotate-3 transition-transform">
              <Pencil className="w-5 h-5 text-amber-900" />
            </div>
            <div>
              <h1 className="font-title text-2xl sm:text-3xl font-bold text-stone-900 leading-none">
                El Ahorcado
              </h1>
              <p className="text-[11px] sm:text-xs text-stone-600 font-hand tracking-tight">
                Cuaderno Clásico · IA · Multijugador
              </p>
            </div>
          </button>

          {/* Right Header Utilities: Sound and Audit Badge */}
          <div className="flex items-center gap-2 sm:gap-3">
            <AudioControls />

            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#fffdfa] hover:bg-amber-100 border border-stone-400 rounded-lg text-xs font-hand text-stone-800 sketch-border-sm transition-colors cursor-pointer"
              title="Abrir Auditoría de Funciones y Versiones"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span className="font-bold hidden sm:inline">Auditoría</span>
              <span className="font-typewriter bg-amber-200 text-amber-950 px-1 py-0.2 rounded text-[10px]">
                v1.5.0
              </span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Styled Like Paper Binder Tabs */}
        <div className="max-w-6xl mx-auto px-2 sm:px-6 overflow-x-auto scrollbar-none">
          <nav className="flex items-center gap-1 sm:gap-2 pt-1 border-t border-stone-200/60" aria-label="Modos de juego">
            <button
              onClick={() => handleTabChange('solo')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg font-hand text-base sm:text-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'solo'
                  ? 'bg-[#fffef8] border-t-2 border-x-2 border-stone-800 text-stone-950 font-bold -mb-[2px] z-10 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <Gamepad2 className="w-4 h-4 text-amber-700" />
              <span>Un Jugador</span>
            </button>

            <button
              onClick={() => handleTabChange('local_secret')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg font-hand text-base sm:text-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'local_secret'
                  ? 'bg-[#fffef8] border-t-2 border-x-2 border-stone-800 text-stone-950 font-bold -mb-[2px] z-10 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <Users className="w-4 h-4 text-blue-700" />
              <span>Multijugador Local</span>
            </button>

            <button
              onClick={() => handleTabChange('online')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg font-hand text-base sm:text-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'online'
                  ? 'bg-[#fffef8] border-t-2 border-x-2 border-stone-800 text-stone-950 font-bold -mb-[2px] z-10 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <Globe className="w-4 h-4 text-emerald-700" />
              <span>Multijugador Online</span>
            </button>

            <button
              onClick={() => handleTabChange('generator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg font-hand text-base sm:text-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'generator'
                  ? 'bg-[#fffef8] border-t-2 border-x-2 border-stone-800 text-stone-950 font-bold -mb-[2px] z-10 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Generador IA</span>
            </button>

            <button
              onClick={() => handleTabChange('library')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg font-hand text-base sm:text-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'library'
                  ? 'bg-[#fffef8] border-t-2 border-x-2 border-stone-800 text-stone-950 font-bold -mb-[2px] z-10 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <BookOpen className="w-4 h-4 text-purple-700" />
              <span>Mi Biblioteca</span>
            </button>

            <button
              onClick={() => handleTabChange('stats')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg font-hand text-base sm:text-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'stats'
                  ? 'bg-[#fffef8] border-t-2 border-x-2 border-stone-800 text-stone-950 font-bold -mb-[2px] z-10 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-rose-700" />
              <span>Estadísticas</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6 flex flex-col justify-center">
        {activeTab === 'solo' && (
          <SoloGame
            initialWords={customGameWords}
            onGoToLibrary={() => handleTabChange('library')}
            onGoToGenerator={() => handleTabChange('generator')}
          />
        )}

        {activeTab === 'local_secret' && <LocalMultiplayer />}

        {activeTab === 'online' && <OnlineMultiplayer />}

        {activeTab === 'generator' && (
          <AiWordGenerator
            onPlayWithWords={handlePlayCustomWords}
            onGoToLibrary={() => handleTabChange('library')}
          />
        )}

        {activeTab === 'library' && (
          <WordLibrary
            onPlayCollection={handlePlayCustomWords}
            onGoToGenerator={() => handleTabChange('generator')}
          />
        )}

        {activeTab === 'stats' && <GameStats />}
      </main>

      {/* Notebook Paper Footer */}
      <footer className="border-t border-stone-300 py-3 text-center text-xs text-stone-500 font-hand">
        <p>
          El Ahorcado Artesanal · Estética tradicional de lápiz y papel · Hecho con esmero
        </p>
      </footer>

      {/* Version Audit Modal */}
      <VersionAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />
    </div>
  );
}
