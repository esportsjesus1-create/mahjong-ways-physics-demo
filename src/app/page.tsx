'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { generateSpin, EntropyResponse, SimulationState, runLocalSimulation } from '@/lib/three-body-api';

const ThreeBodyVisualization = dynamic(
  () => import('@/components/ThreeBodyVisualization'),
  { ssr: false, loading: () => <LoadingPlaceholder /> }
);

function LoadingPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading visualization...</p>
      </div>
    </div>
  );
}

function EntropyDisplay({ entropy, spinId }: { entropy: { value: number; hex: string } | null; spinId: string | null }) {
  if (!entropy) return null;
  
  return (
    <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4 border border-red-500/30">
      <h3 className="text-red-400 text-sm font-semibold mb-2 uppercase tracking-wider">Entropy Generated</h3>
      <div className="space-y-2">
        <div>
          <span className="text-gray-500 text-xs">Value:</span>
          <p className="text-green-400 font-mono text-lg">{entropy.value.toFixed(6)}</p>
        </div>
        <div>
          <span className="text-gray-500 text-xs">Hash:</span>
          <p className="text-yellow-400 font-mono text-xs break-all">{entropy.hex}</p>
        </div>
        {spinId && (
          <div>
            <span className="text-gray-500 text-xs">Spin ID:</span>
            <p className="text-blue-400 font-mono text-xs">{spinId}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SpinButton({ onClick, isSpinning, disabled }: { onClick: () => void; isSpinning: boolean; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isSpinning}
      className={`
        relative overflow-hidden
        w-48 h-48 rounded-full
        font-bold text-2xl uppercase tracking-widest
        transition-all duration-300 ease-out
        ${isSpinning 
          ? 'bg-gradient-to-br from-yellow-500 via-orange-500 to-red-600 animate-pulse cursor-not-allowed' 
          : 'bg-gradient-to-br from-red-500 via-red-600 to-red-700 hover:from-red-400 hover:via-red-500 hover:to-red-600 hover:scale-105 active:scale-95'
        }
        shadow-lg shadow-red-500/50
        border-4 border-yellow-400/50
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      <span className="relative z-10 drop-shadow-lg text-white">
        {isSpinning ? 'SPINNING...' : 'SPIN'}
      </span>
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
      {!isSpinning && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity"></div>
      )}
    </button>
  );
}

function StatsPanel({ simulationStates, isAnimating }: { simulationStates: SimulationState[]; isAnimating: boolean }) {
  const currentState = simulationStates[simulationStates.length - 1];
  
  if (!currentState) return null;
  
  return (
    <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4 border border-cyan-500/30">
      <h3 className="text-cyan-400 text-sm font-semibold mb-3 uppercase tracking-wider">Physics Stats</h3>
      <div className="grid grid-cols-3 gap-4 text-center">
        {currentState.bodies.map((body, index) => {
          const colors = ['text-red-400', 'text-cyan-400', 'text-yellow-400'];
          const names = ['Body A', 'Body B', 'Body C'];
          return (
            <div key={index} className="space-y-1">
              <p className={`${colors[index]} font-semibold text-xs`}>{names[index]}</p>
              <p className="text-gray-400 text-xs">
                x: {body.position.x.toFixed(2)}
              </p>
              <p className="text-gray-400 text-xs">
                y: {body.position.y.toFixed(2)}
              </p>
              <p className="text-gray-400 text-xs">
                z: {body.position.z.toFixed(2)}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-gray-500 text-xs">Time:</span>
          <span className="text-green-400 font-mono text-sm">{currentState.time.toFixed(3)}s</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-gray-500 text-xs">Entropy:</span>
          <span className="text-purple-400 font-mono text-sm">{currentState.entropy.toFixed(4)}</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-gray-500 text-xs">Status:</span>
          <span className={`font-mono text-sm ${isAnimating ? 'text-yellow-400' : 'text-green-400'}`}>
            {isAnimating ? 'SIMULATING' : 'READY'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [entropyData, setEntropyData] = useState<EntropyResponse | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [spinCount, setSpinCount] = useState(0);

  const handleSpin = useCallback(async () => {
    setIsSpinning(true);
    setIsAnimating(true);
    
    try {
      const data = await generateSpin();
      setEntropyData(data);
      setSpinCount(prev => prev + 1);
    } catch (error) {
      console.error('Error generating spin:', error);
      const fallbackData = runLocalSimulation();
      setEntropyData(fallbackData);
      setSpinCount(prev => prev + 1);
    }
    
    setIsSpinning(false);
  }, []);

  const handleAnimationComplete = useCallback(() => {
    setIsAnimating(false);
  }, []);

  const simulationStates = entropyData?.simulationStates || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 text-white overflow-hidden">
      <header className="absolute top-0 left-0 right-0 z-20 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 via-yellow-500 to-red-500 bg-clip-text text-transparent">
              Three-Body Entropy
            </h1>
            <p className="text-gray-400 text-sm mt-1">Provably Fair Physics-Based RNG</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-xs">Total Spins</p>
            <p className="text-2xl font-bold text-yellow-400">{spinCount}</p>
          </div>
        </div>
      </header>

      <main className="relative h-screen">
        <div className="absolute inset-0">
          <ThreeBodyVisualization
            simulationStates={simulationStates}
            isAnimating={isAnimating}
            animationSpeed={2}
            onAnimationComplete={handleAnimationComplete}
            showPaths={true}
          />
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10">
          <div className="max-w-7xl mx-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div className="hidden md:block">
                {simulationStates.length > 0 && (
                  <StatsPanel simulationStates={simulationStates} isAnimating={isAnimating} />
                )}
              </div>
              
              <div className="flex flex-col items-center justify-center space-y-6">
                <SpinButton
                  onClick={handleSpin}
                  isSpinning={isSpinning}
                  disabled={isAnimating && !isSpinning}
                />
                <p className="text-gray-500 text-sm text-center">
                  {isAnimating 
                    ? 'Watch the chaos unfold...' 
                    : 'Press SPIN to generate entropy'}
                </p>
              </div>
              
              <div className="hidden md:block">
                {entropyData && (
                  <EntropyDisplay
                    entropy={entropyData.finalEntropy}
                    spinId={entropyData.spinId}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="md:hidden absolute top-20 left-0 right-0 z-10 px-4">
          <div className="flex gap-4 overflow-x-auto pb-2">
            {simulationStates.length > 0 && (
              <div className="flex-shrink-0 w-64">
                <StatsPanel simulationStates={simulationStates} isAnimating={isAnimating} />
              </div>
            )}
            {entropyData && (
              <div className="flex-shrink-0 w-64">
                <EntropyDisplay
                  entropy={entropyData.finalEntropy}
                  spinId={entropyData.spinId}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      <div className="absolute bottom-4 left-0 right-0 z-20 text-center">
        <p className="text-gray-600 text-xs">
          Powered by Three-Body Gravitational Dynamics | Cryptographically Verifiable
        </p>
      </div>
    </div>
  );
}
