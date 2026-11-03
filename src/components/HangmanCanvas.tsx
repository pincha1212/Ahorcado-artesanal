import React, { useEffect, useRef, useState } from 'react';

interface HangmanCanvasProps {
  mistakes: number;
  maxMistakes: number;
  isWon?: boolean;
  isLost?: boolean;
  className?: string;
}

export const HangmanCanvas: React.FC<HangmanCanvasProps> = ({
  mistakes,
  maxMistakes,
  isWon = false,
  isLost = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [animProgress, setAnimProgress] = useState<number>(1);
  const prevMistakesRef = useRef<number>(mistakes);

  // Trigger stroke pencil animation when mistakes change
  useEffect(() => {
    if (mistakes > prevMistakesRef.current) {
      setAnimProgress(0);
      let start: number | null = null;
      const duration = 380; // ms

      const step = (timestamp: number) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        setAnimProgress(progress);
        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };
      requestAnimationFrame(step);
    } else {
      setAnimProgress(1);
    }
    prevMistakesRef.current = mistakes;
  }, [mistakes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI and responsive sizing
    const dpr = window.devicePixelRatio || 1;
    const isMobile = window.innerWidth < 640;
    const width = isMobile ? 240 : 340;
    const height = isMobile ? 240 : 340;
    const scale = isMobile ? 240 / 340 : 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.resetTransform();
    ctx.scale(dpr * scale, dpr * scale);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Sketch graphite styling
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#2d2926'; // Graphite dark charcoal
    ctx.lineWidth = 3.2;

    // Draw hand-drawn wobbly line with jitter
    const drawSketchLine = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      progress: number = 1,
      roughness: number = 1.4
    ) => {
      const curX2 = x1 + (x2 - x1) * progress;
      const curY2 = y1 + (y2 - y1) * progress;
      const dist = Math.hypot(curX2 - x1, curY2 - y1);
      const segments = Math.max(3, Math.floor(dist / 14));

      ctx.beginPath();
      ctx.moveTo(x1, y1);

      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const nx = x1 + (curX2 - x1) * t;
        const ny = y1 + (curY2 - y1) * t;
        // Pseudo-random offset based on coordinates
        const jitter = (Math.sin(nx * 0.2 + ny * 0.3) * roughness);
        ctx.lineTo(nx + jitter, ny + jitter * 0.5);
      }
      ctx.stroke();

      // Second light graphite pass for sketchy handmade look
      ctx.save();
      ctx.strokeStyle = 'rgba(60, 50, 45, 0.45)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x1 + 0.8, y1 - 0.5);
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const nx = x1 + (curX2 - x1) * t;
        const ny = y1 + (curY2 - y1) * t;
        const jitter = (Math.cos(nx * 0.3) * roughness * 0.9);
        ctx.lineTo(nx + jitter, ny - jitter * 0.4);
      }
      ctx.stroke();
      ctx.restore();

      // Return end point for drawing pencil tip if animating
      return { x: curX2, y: curY2 };
    };

    // Draw hand-drawn circle with double sketch line
    const drawSketchCircle = (
      cx: number,
      cy: number,
      r: number,
      progress: number = 1,
      faceMood: 'normal' | 'worried' | 'lost' | 'won' = 'normal'
    ) => {
      const angle = Math.PI * 2 * progress;
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + angle);
      ctx.stroke();

      // Double sketch line
      ctx.save();
      ctx.strokeStyle = 'rgba(60, 50, 45, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx + 0.5, cy + 0.5, r - 0.8, -Math.PI / 2, -Math.PI / 2 + angle);
      ctx.stroke();
      ctx.restore();

      // Draw expressive face if head is drawn enough
      if (progress > 0.8) {
        ctx.save();
        ctx.lineWidth = 2;

        if (faceMood === 'won') {
          // Happy arc eyes
          ctx.beginPath();
          ctx.arc(cx - 7, cy - 4, 3.5, Math.PI, 0);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx + 7, cy - 4, 3.5, Math.PI, 0);
          ctx.stroke();
          // Big smiling mouth
          ctx.beginPath();
          ctx.arc(cx, cy + 2, 8, 0.1, Math.PI - 0.1);
          ctx.stroke();
        } else if (faceMood === 'lost') {
          // 'X' eyes
          const drawX = (ex: number, ey: number) => {
            ctx.beginPath();
            ctx.moveTo(ex - 3, ey - 3);
            ctx.lineTo(ex + 3, ey + 3);
            ctx.moveTo(ex + 3, ey - 3);
            ctx.lineTo(ex - 3, ey + 3);
            ctx.stroke();
          };
          drawX(cx - 7, cy - 5);
          drawX(cx + 7, cy - 5);
          // Wavy mouth
          ctx.beginPath();
          ctx.moveTo(cx - 8, cy + 7);
          ctx.quadraticCurveTo(cx - 4, cy + 3, cx, cy + 6);
          ctx.quadraticCurveTo(cx + 4, cy + 9, cx + 8, cy + 5);
          ctx.stroke();
        } else if (faceMood === 'worried') {
          // Wide dot eyes
          ctx.beginPath();
          ctx.arc(cx - 7, cy - 5, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx + 7, cy - 5, 2, 0, Math.PI * 2);
          ctx.fill();
          // Little 'o' worried mouth
          ctx.beginPath();
          ctx.arc(cx, cy + 6, 3, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Normal curious dots
          ctx.beginPath();
          ctx.arc(cx - 6, cy - 4, 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx + 6, cy - 4, 1.8, 0, Math.PI * 2);
          ctx.fill();
          // Gentle smirk
          ctx.beginPath();
          ctx.arc(cx, cy + 3, 4, 0.2, Math.PI * 0.8);
          ctx.stroke();
        }
        ctx.restore();
      }

      return {
        x: cx + r * Math.cos(-Math.PI / 2 + angle),
        y: cy + r * Math.sin(-Math.PI / 2 + angle),
      };
    };

    // Calculate stage mapping based on maxMistakes (standard 6, 7 or 8)
    // Stages:
    // 1: Base
    // 2: Vertical Pole
    // 3: Horizontal Beam + diagonal strut
    // 4: Rope & Noose
    // 5: Head
    // 6: Body
    // 7: Left & Right Arm (or split if 7/8 mistakes)
    // 8: Left & Right Leg

    // Normalize mistake index to 8 logical parts
    const currentStage = mistakes;
    let tipPos: { x: number; y: number } | null = null;

    // Helper to get progress for stage i
    const getStageProgress = (stageNum: number) => {
      if (mistakes < stageNum) return 0;
      if (mistakes === stageNum) return animProgress;
      return 1;
    };

    // Always draw faint ground line so canvas is anchored from round start
    ctx.save();
    ctx.strokeStyle = 'rgba(70, 60, 50, 0.25)';
    ctx.lineWidth = 1.8;
    drawSketchLine(25, 304, 305, 304, 1, 1.0);
    // Subtle little notebook tufts of grass or soil dashes
    const drawSoilDash = (sx: number, sy: number) => {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - 4, sy + 5);
      ctx.moveTo(sx + 3, sy);
      ctx.lineTo(sx + 5, sy + 6);
      ctx.stroke();
    };
    drawSoilDash(35, 306);
    drawSoilDash(110, 306);
    drawSoilDash(240, 306);
    drawSoilDash(285, 306);
    ctx.restore();

    // 1. BASE PLATFORM
    if (mistakes >= 1) {
      const p = getStageProgress(1);
      drawSketchLine(40, 300, 260, 300, p);
      // Wood cross hatchings
      if (p > 0.4) {
        drawSketchLine(50, 308, 250, 308, (p - 0.4) / 0.6, 0.8);
        drawSketchLine(80, 300, 75, 308, (p - 0.4) / 0.6, 0.6);
        drawSketchLine(150, 300, 146, 308, (p - 0.4) / 0.6, 0.6);
        drawSketchLine(210, 300, 206, 308, (p - 0.4) / 0.6, 0.6);
      }
      if (mistakes === 1 && animProgress < 1) tipPos = { x: 40 + 220 * p, y: 300 };
    }

    // 2. VERTICAL POST
    if (mistakes >= 2) {
      const p = getStageProgress(2);
      const end = drawSketchLine(90, 300, 90, 45, p);
      // Parallel pencil line for thick timber
      if (p > 0.2) {
        drawSketchLine(98, 300, 98, 45, (p - 0.2) / 0.8, 1.0);
      }
      if (mistakes === 2 && animProgress < 1) tipPos = end;
    }

    // 3. TOP BEAM & DIAGONAL BRACE
    if (mistakes >= 3) {
      const p = getStageProgress(3);
      const end = drawSketchLine(85, 45, 235, 45, p);
      if (p > 0.3) {
        drawSketchLine(85, 52, 230, 52, (p - 0.3) / 0.7, 0.8);
        drawSketchLine(90, 105, 145, 45, (p - 0.3) / 0.7, 1.2);
      }
      if (mistakes === 3 && animProgress < 1) tipPos = end;
    }

    // 4. ROPE & NOOSE
    if (mistakes >= 4) {
      const p = getStageProgress(4);
      ctx.save();
      ctx.strokeStyle = '#6d5a43'; // Rope ochre tint
      const end = drawSketchLine(210, 52, 210, 105, p, 1.8);
      // Small noose loop
      if (p > 0.7) {
        ctx.beginPath();
        ctx.ellipse(210, 108, 5, 4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      if (mistakes === 4 && animProgress < 1) tipPos = end;
    }

    // 5. HEAD
    if (mistakes >= 5) {
      const p = getStageProgress(5);
      const faceMood = isLost ? 'lost' : isWon ? 'won' : mistakes >= maxMistakes - 1 ? 'worried' : 'normal';
      const end = drawSketchCircle(210, 130, 22, p, faceMood);
      if (mistakes === 5 && animProgress < 1) tipPos = end;
    }

    // 6. TORSO / BODY
    if (mistakes >= 6) {
      const p = getStageProgress(6);
      const end = drawSketchLine(210, 152, 210, 218, p);
      if (mistakes === 6 && animProgress < 1) tipPos = end;
    }

    // 7. ARMS (Left & Right)
    if (mistakes >= 7) {
      const p = getStageProgress(7);
      // Left arm
      drawSketchLine(210, 170, 175, 195, Math.min(1, p * 2));
      // Right arm
      if (p > 0.5) {
        const end = drawSketchLine(210, 170, 245, 195, (p - 0.5) * 2);
        if (mistakes === 7 && animProgress < 1) tipPos = end;
      }
    }

    // 8. LEGS (Left & Right)
    if (mistakes >= 8) {
      const p = getStageProgress(8);
      // Left leg
      drawSketchLine(210, 218, 180, 270, Math.min(1, p * 2));
      // Right leg
      if (p > 0.5) {
        const end = drawSketchLine(210, 218, 240, 270, (p - 0.5) * 2);
        if (mistakes === 8 && animProgress < 1) tipPos = end;
      }
    }

    // Celebratory sparkles or defeat doodle
    if (isWon) {
      ctx.save();
      ctx.fillStyle = '#27ae60';
      ctx.font = 'bold 20px "Caveat", cursive';
      ctx.fillText('¡Salvado!', 180, 35);

      // Star doodles
      const drawLittleStar = (sx: number, sy: number) => {
        ctx.strokeStyle = '#f39c12';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 6);
        ctx.lineTo(sx, sy + 6);
        ctx.moveTo(sx - 6, sy);
        ctx.lineTo(sx + 6, sy);
        ctx.stroke();
      };
      drawLittleStar(165, 115);
      drawLittleStar(255, 115);
      drawLittleStar(200, 85);
      ctx.restore();
    }

    if (isLost) {
      ctx.save();
      ctx.fillStyle = '#c0392b';
      ctx.font = 'bold 22px "Caveat", cursive';
      ctx.fillText('¡Ahorcado!', 170, 35);
      ctx.restore();
    }

    // Draw active animated pencil tip when stroke is progressing
    if (tipPos && animProgress < 1) {
      ctx.save();
      ctx.translate(tipPos.x, tipPos.y);
      ctx.rotate(-Math.PI / 4);

      // Pencil cone tip
      ctx.fillStyle = '#d2b48c'; // Wood
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-6, -16);
      ctx.lineTo(6, -16);
      ctx.closePath();
      ctx.fill();

      // Graphite point
      ctx.fillStyle = '#2c3e50';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-2.5, -6);
      ctx.lineTo(2.5, -6);
      ctx.closePath();
      ctx.fill();

      // Yellow pencil shaft
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(-6, -34, 12, 18);

      ctx.restore();
    }
  }, [mistakes, maxMistakes, isWon, isLost, animProgress]);

  return (
    <div
      className={`relative flex items-center justify-center p-3 select-none ${className}`}
      data-testid="hangman-canvas-container"
      data-state={isWon ? 'won' : isLost ? 'lost' : 'playing'}
    >
      <canvas
        ref={canvasRef}
        className="w-[240px] h-[240px] sm:w-[340px] sm:h-[340px] max-w-full drop-shadow-sm cursor-default"
      />
    </div>
  );
};
