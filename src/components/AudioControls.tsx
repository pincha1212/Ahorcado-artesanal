import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { sound } from '../audio/soundEffects';

export const AudioControls: React.FC = () => {
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [volume, setVolume] = useState(sound.getVolume());
  const [showSlider, setShowSlider] = useState(false);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
    if (!next) {
      sound.playPencilStroke();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    sound.setVolume(v);
    if (isMuted && v > 0) {
      setIsMuted(false);
      sound.setMuted(false);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={toggleMute}
        onMouseEnter={() => setShowSlider(true)}
        aria-label={isMuted ? 'Activar sonido de grafito' : 'Silenciar sonido'}
        className="p-1.5 rounded-full hover:bg-stone-200/60 text-stone-700 transition-colors flex items-center gap-1 text-xs font-hand"
        title={isMuted ? 'Sonido silenciado' : 'Sonido activo'}
      >
        {isMuted ? <VolumeX className="w-5 h-5 text-stone-400" /> : <Volume2 className="w-5 h-5 text-stone-700" />}
      </button>

      {showSlider && (
        <div
          onMouseLeave={() => setShowSlider(false)}
          className="absolute right-0 top-full mt-1 bg-[#fffdfa] border border-stone-300 shadow-md p-2 rounded-lg flex items-center gap-2 z-30 sketch-border-sm"
        >
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            aria-label="Ajustar volumen de efectos"
            className="w-20 accent-stone-700 cursor-pointer h-1.5"
          />
          <span className="text-xs font-hand text-stone-600 w-7">
            {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
          </span>
        </div>
      )}
    </div>
  );
};
