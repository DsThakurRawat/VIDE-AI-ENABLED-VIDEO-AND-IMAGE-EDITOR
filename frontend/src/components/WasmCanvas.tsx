'use client';

import { useRef, useEffect } from 'react';

export function WasmCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 450;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 800, 450);

    ctx.fillStyle = '#333';
    ctx.font = '16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Preview Window', 400, 225);
    ctx.fillStyle = '#555';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('Upload a video to begin', 400, 250);
  }, []);

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-neutral-800 bg-black flex items-center justify-center w-full h-full">
      <canvas
        ref={canvasRef}
        className="block w-full h-full object-contain"
      />
    </div>
  );
}
