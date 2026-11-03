import React, { useState } from 'react';
import { BarChart3, Trophy, Flame, Target, Clock, BookOpen, RotateCcw } from 'lucide-react';
import { getPlayerStats } from '../storage/libraryStorage';
import { PlayerStats } from '../types/game';
import { sound } from '../audio/soundEffects';

export const GameStats: React.FC = () => {
  const [stats, setStats] = useState<PlayerStats>(() => getPlayerStats());

  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
  const totalLetters = stats.correctLetters + stats.incorrectLetters;
  const accuracy = totalLetters > 0 ? Math.round((stats.correctLetters / totalLetters) * 100) : 0;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    if (mins === 0) return `${remSecs}s`;
    return `${mins}m ${remSecs}s`;
  };

  const handleResetStats = () => {
    if (confirm('¿Deseas reiniciar todas tus estadísticas acumuladas a cero?')) {
      const reset: PlayerStats = {
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        wordsDiscovered: 0,
        bestStreak: 0,
        currentStreak: 0,
        correctLetters: 0,
        incorrectLetters: 0,
        favoriteCategories: {},
        difficultyPlayed: { facil: 0, normal: 0, dificil: 0, experto: 0 },
        totalTimeSeconds: 0,
      };
      setStats(reset);
      localStorage.setItem('ahorcado_stats_v1', JSON.stringify(reset));
      sound.playPageFlip();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      <div className="w-full bg-[#fffdf9] border-2 border-stone-800 rounded-xl p-6 sm:p-8 sketch-border notebook-sheet">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between pb-4 mb-6 border-b-2 border-dashed border-stone-300">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 border-2 border-amber-600 rounded-full flex items-center justify-center sketch-border">
              <BarChart3 className="w-6 h-6 text-amber-800" />
            </div>
            <div>
              <h2 className="font-title text-4xl font-bold text-stone-900">
                Registro de Rendimiento
              </h2>
              <p className="font-hand text-stone-600 text-sm">
                Historial de partidas jugadas en tu cuaderno artesanal
              </p>
            </div>
          </div>

          <button
            onClick={handleResetStats}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-hand text-stone-600 hover:text-stone-900 border border-stone-300 rounded bg-[#fbf8ef] hover:bg-stone-100"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reiniciar estadísticas</span>
          </button>
        </div>

        {/* Highlight Score Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8 font-hand">
          <div className="bg-[#fbf8ef] border-2 border-stone-800 rounded-xl p-4 text-center sketch-border-sm">
            <Trophy className="w-6 h-6 text-amber-600 mx-auto mb-1" />
            <p className="text-3xl font-bold text-stone-900">{winRate}%</p>
            <p className="text-xs uppercase text-stone-600 tracking-wider">Tasa de Victoria</p>
            <p className="text-xs text-stone-400 mt-1">{stats.gamesWon} ganadas / {stats.gamesPlayed}</p>
          </div>

          <div className="bg-[#fbf8ef] border-2 border-stone-800 rounded-xl p-4 text-center sketch-border-sm">
            <Flame className="w-6 h-6 text-orange-600 mx-auto mb-1" />
            <p className="text-3xl font-bold text-stone-900">{stats.bestStreak}</p>
            <p className="text-xs uppercase text-stone-600 tracking-wider">Mejor Racha</p>
            <p className="text-xs text-stone-400 mt-1">Racha actual: {stats.currentStreak}</p>
          </div>

          <div className="bg-[#fbf8ef] border-2 border-stone-800 rounded-xl p-4 text-center sketch-border-sm">
            <Target className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
            <p className="text-3xl font-bold text-stone-900">{accuracy}%</p>
            <p className="text-xs uppercase text-stone-600 tracking-wider">Precisión Letras</p>
            <p className="text-xs text-stone-400 mt-1">{stats.correctLetters} aciertos / {totalLetters}</p>
          </div>

          <div className="bg-[#fbf8ef] border-2 border-stone-800 rounded-xl p-4 text-center sketch-border-sm">
            <Clock className="w-6 h-6 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-stone-900">{formatTime(stats.totalTimeSeconds)}</p>
            <p className="text-xs uppercase text-stone-600 tracking-wider">Tiempo Jugado</p>
            <p className="text-xs text-stone-400 mt-1">{stats.wordsDiscovered} palabras salvadas</p>
          </div>
        </div>

        {/* Detailed Breakdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-hand">
          {/* Favorite Categories */}
          <div className="bg-[#fcf8ee] border border-stone-300 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-3 pb-1 border-b border-stone-200">
              <BookOpen className="w-4 h-4 text-amber-700" />
              <h3 className="font-bold text-stone-800 text-lg">Temáticas más Jugadas</h3>
            </div>
            {Object.keys(stats.favoriteCategories).length === 0 ? (
              <p className="text-stone-500 text-sm italic">Aún no has jugado partidas.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(stats.favoriteCategories)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between text-sm">
                      <span className="text-stone-800">{cat}</span>
                      <span className="font-bold bg-amber-200/70 px-2 py-0.5 rounded text-amber-900">
                        {count} partidas
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Difficulty breakdown */}
          <div className="bg-[#fcf8ee] border border-stone-300 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-3 pb-1 border-b border-stone-200">
              <Trophy className="w-4 h-4 text-amber-700" />
              <h3 className="font-bold text-stone-800 text-lg">Partidas por Dificultad</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Fácil</span>
                <span className="font-bold">{stats.difficultyPlayed.facil}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Normal</span>
                <span className="font-bold">{stats.difficultyPlayed.normal}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Difícil</span>
                <span className="font-bold">{stats.difficultyPlayed.dificil}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Experto</span>
                <span className="font-bold">{stats.difficultyPlayed.experto}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
