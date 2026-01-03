'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { ThreeBodySimulation, Body } from '@/lib/three-body-entropy';

interface PhysicsVisualizationProps {
  seed: string;
  isRunning: boolean;
  onComplete: (entropyHex: string) => void;
  width?: number;
  height?: number;
}

const COLORS = ['#ff6b6b', '#4ecdc4', '#ffe66d'];
const TRAIL_LENGTH = 50;
const MAX_STEPS = 100;

export default function PhysicsVisualization({
  seed,
  isRunning,
  onComplete,
  width = 400,
  height = 300
}: PhysicsVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<ThreeBodySimulation | null>(null);
  const trailsRef = useRef<Array<Array<{ x: number; y: number }>>>([[], [], []]);
  const animationRef = useRef<number | null>(null);
  const stepsRef = useRef(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const worldToScreen = useCallback((x: number, y: number): { x: number; y: number } => {
    const scale = Math.min(width, height) / 20;
    return {
      x: width / 2 + x * scale,
      y: height / 2 + y * scale
    };
  }, [width, height]);

  const drawBody = useCallback((
    ctx: CanvasRenderingContext2D,
    body: Body,
    color: string,
    trail: Array<{ x: number; y: number }>
  ) => {
    if (trail.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.3;
      
      const startPoint = trail[0];
      ctx.moveTo(startPoint.x, startPoint.y);
      
      for (let i = 1; i < trail.length; i++) {
        ctx.lineTo(trail[i].x, trail[i].y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const screenPos = worldToScreen(body.position.x, body.position.y);
    const radius = Math.max(5, body.mass * 8);

    const gradient = ctx.createRadialGradient(
      screenPos.x, screenPos.y, 0,
      screenPos.x, screenPos.y, radius
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.7, color);
    gradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, radius * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }, [worldToScreen]);

  useEffect(() => {
    if (isRunning && seed) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      simulationRef.current = new ThreeBodySimulation();
      simulationRef.current.initializeFromSeed(seed);
      trailsRef.current = [[], [], []];
      stepsRef.current = 0;

      const animate = () => {
        const canvas = canvasRef.current;
        const simulation = simulationRef.current;
        if (!canvas || !simulation) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
        ctx.fillRect(0, 0, width, height);

        simulation.simulate(0.05);
        stepsRef.current++;

        const bodies = simulation.getBodies();
        bodies.forEach((body, index) => {
          const screenPos = worldToScreen(body.position.x, body.position.y);
          trailsRef.current[index].push(screenPos);
          if (trailsRef.current[index].length > TRAIL_LENGTH) {
            trailsRef.current[index].shift();
          }
        });

        bodies.forEach((body, index) => {
          drawBody(ctx, body, COLORS[index], trailsRef.current[index]);
        });

        const progress = stepsRef.current / MAX_STEPS;
        ctx.fillStyle = '#64748b';
        ctx.fillRect(10, height - 20, (width - 20) * progress, 8);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(10, height - 20, width - 20, 8);

        if (stepsRef.current >= MAX_STEPS) {
          const entropy = simulation.getEntropyValue();
          onCompleteRef.current(entropy.hex);
          return;
        }

        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, seed, width, height, worldToScreen, drawBody]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#64748b';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Three-Body Physics Entropy', width / 2, height / 2 - 10);
    ctx.fillText('Click SPIN to generate entropy', width / 2, height / 2 + 10);
  }, [width, height]);

  return (
    <div className="relative rounded-lg overflow-hidden border-2 border-slate-700">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="bg-slate-900"
      />
      {isRunning && (
        <div className="absolute top-2 left-2 bg-slate-800/80 px-2 py-1 rounded text-xs text-emerald-400 font-mono">
          Generating Entropy...
        </div>
      )}
    </div>
  );
}
