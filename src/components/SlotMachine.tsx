'use client';

import React, { useState, useCallback } from 'react';
import {
  spin,
  SpinResult,
  SymbolId,
  SYMBOLS,
  GRID_ROWS,
  GRID_COLS,
  getAllSymbols
} from '@/lib/mahjong-ways-engine';
import PhysicsVisualization from './PhysicsVisualization';

interface SlotMachineProps {
  initialBalance?: number;
}

const SPIN_DURATION = 2000;
const REEL_DELAY = 200;

export default function SlotMachine({ initialBalance = 1000 }: SlotMachineProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [bet, setBet] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isPhysicsRunning, setIsPhysicsRunning] = useState(false);
  const [grid, setGrid] = useState<SymbolId[][]>(() => {
    const initialGrid: SymbolId[][] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      const rowSymbols: SymbolId[] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        rowSymbols.push('dot_9');
      }
      initialGrid.push(rowSymbols);
    }
    return initialGrid;
  });
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [entropyHex, setEntropyHex] = useState<string>('');
  const [seed, setSeed] = useState<string>('');
  const [reelStates, setReelStates] = useState<boolean[]>(Array(GRID_COLS).fill(false));
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [freeSpins, setFreeSpins] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [totalWon, setTotalWon] = useState(0);

  const generateSeed = useCallback(() => {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return `${timestamp}-${random}`;
  }, []);

  const handleSpin = useCallback(() => {
    if (isSpinning || isPhysicsRunning) return;
    if (balance < bet && freeSpins === 0) return;

    const newSeed = generateSeed();
    setSeed(newSeed);
    setIsPhysicsRunning(true);
    setShowWinAnimation(false);
    setLastResult(null);

    if (freeSpins === 0) {
      setBalance(prev => prev - bet);
    } else {
      setFreeSpins(prev => prev - 1);
    }
  }, [isSpinning, isPhysicsRunning, balance, bet, freeSpins, generateSeed]);

  const handleEntropyComplete = useCallback((hex: string) => {
    setEntropyHex(hex);
    setIsPhysicsRunning(false);
    setIsSpinning(true);

    setReelStates(Array(GRID_COLS).fill(true));

    const result = spin(hex, bet, multiplier);

    for (let col = 0; col < GRID_COLS; col++) {
      setTimeout(() => {
        setReelStates(prev => {
          const newStates = [...prev];
          newStates[col] = false;
          return newStates;
        });

        setGrid(prev => {
          const newGrid = prev.map(row => [...row]);
          for (let row = 0; row < GRID_ROWS; row++) {
            newGrid[row][col] = result.grid[row][col];
          }
          return newGrid;
        });

        if (col === GRID_COLS - 1) {
          setTimeout(() => {
            setIsSpinning(false);
            setLastResult(result);

            if (result.totalWin > 0) {
              setShowWinAnimation(true);
              setBalance(prev => prev + result.totalWin);
              setTotalWon(prev => prev + result.totalWin);
            }

            if (result.freeSpinsTriggered) {
              setFreeSpins(prev => prev + result.freeSpinsCount);
              setMultiplier(2);
            }
          }, 300);
        }
      }, SPIN_DURATION + col * REEL_DELAY);
    }
  }, [bet, multiplier]);

  const handleBetChange = useCallback((newBet: number) => {
    if (!isSpinning && !isPhysicsRunning) {
      setBet(Math.max(1, Math.min(newBet, balance)));
    }
  }, [isSpinning, isPhysicsRunning, balance]);

  const getSymbolDisplay = (symbolId: SymbolId) => {
    const symbol = SYMBOLS[symbolId];
    return (
      <div className="flex flex-col items-center justify-center w-full h-full">
        <span className="text-3xl">{symbol.emoji}</span>
        <span className="text-xs text-slate-400 mt-1 hidden sm:block">{symbol.name}</span>
      </div>
    );
  };

  const isWinningPosition = (row: number, col: number): boolean => {
    if (!lastResult || !showWinAnimation) return false;
    return lastResult.wins.some(win => {
      if (col >= win.positions.length) return false;
      return win.positions[col].includes(row);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-amber-400 mb-2">
          Mahjong Ways
        </h1>
        <p className="text-center text-slate-400 mb-6">
          Physics-Powered Provably Fair Slot
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-xl p-4 border-2 border-amber-600/30 shadow-xl">
              <div className="relative">
                <div className="grid grid-cols-5 gap-1 bg-slate-900 p-2 rounded-lg">
                  {Array.from({ length: GRID_ROWS }).map((_, row) => (
                    <React.Fragment key={row}>
                      {Array.from({ length: GRID_COLS }).map((_, col) => {
                        const isSpinningReel = reelStates[col];
                        const isWinning = isWinningPosition(row, col);
                        
                        return (
                          <div
                            key={`${row}-${col}`}
                            className={`
                              aspect-square bg-slate-800 rounded-lg border-2 
                              flex items-center justify-center
                              transition-all duration-300
                              ${isSpinningReel ? 'animate-pulse border-slate-600' : 'border-slate-700'}
                              ${isWinning ? 'border-amber-400 bg-amber-900/30 animate-bounce' : ''}
                            `}
                          >
                            {isSpinningReel ? (
                              <div className="text-3xl animate-spin">🀄</div>
                            ) : (
                              getSymbolDisplay(grid[row][col])
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>

                {showWinAnimation && lastResult && lastResult.totalWin > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-amber-500/90 text-slate-900 px-8 py-4 rounded-xl text-2xl font-bold animate-pulse shadow-2xl">
                      WIN: ${lastResult.totalWin.toFixed(2)}
                    </div>
                  </div>
                )}

                {lastResult?.freeSpinsTriggered && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-emerald-500/90 text-white px-8 py-4 rounded-xl text-xl font-bold animate-bounce shadow-2xl">
                      FREE SPINS: {lastResult.freeSpinsCount}!
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-700 px-4 py-2 rounded-lg">
                    <span className="text-slate-400 text-sm">Balance</span>
                    <div className="text-xl font-bold text-emerald-400">
                      ${balance.toFixed(2)}
                    </div>
                  </div>

                  <div className="bg-slate-700 px-4 py-2 rounded-lg">
                    <span className="text-slate-400 text-sm">Bet</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleBetChange(bet - 5)}
                        disabled={isSpinning || isPhysicsRunning || bet <= 1}
                        className="w-8 h-8 bg-slate-600 rounded text-white hover:bg-slate-500 disabled:opacity-50"
                      >
                        -
                      </button>
                      <span className="text-xl font-bold text-white w-16 text-center">
                        ${bet}
                      </span>
                      <button
                        onClick={() => handleBetChange(bet + 5)}
                        disabled={isSpinning || isPhysicsRunning || bet >= balance}
                        className="w-8 h-8 bg-slate-600 rounded text-white hover:bg-slate-500 disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSpin}
                  disabled={isSpinning || isPhysicsRunning || (balance < bet && freeSpins === 0)}
                  className={`
                    px-8 py-4 rounded-xl text-xl font-bold
                    transition-all duration-200 transform
                    ${isSpinning || isPhysicsRunning
                      ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 hover:from-amber-400 hover:to-amber-500 hover:scale-105 active:scale-95'
                    }
                    shadow-lg
                  `}
                >
                  {isPhysicsRunning ? 'Generating...' : isSpinning ? 'Spinning...' : freeSpins > 0 ? `FREE SPIN (${freeSpins})` : 'SPIN'}
                </button>
              </div>

              {freeSpins > 0 && (
                <div className="mt-4 bg-emerald-900/50 border border-emerald-500 rounded-lg p-3 text-center">
                  <span className="text-emerald-400 font-bold">
                    Free Spins Remaining: {freeSpins} | Multiplier: {multiplier}x
                  </span>
                </div>
              )}
            </div>

            {lastResult && lastResult.wins.length > 0 && (
              <div className="mt-4 bg-slate-800 rounded-xl p-4 border border-slate-700">
                <h3 className="text-lg font-bold text-amber-400 mb-2">Winning Combinations</h3>
                <div className="space-y-2">
                  {lastResult.wins.map((win, index) => (
                    <div key={index} className="flex items-center justify-between bg-slate-700/50 rounded-lg p-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{SYMBOLS[win.symbolId].emoji}</span>
                        <span className="text-white">{SYMBOLS[win.symbolId].name}</span>
                        <span className="text-slate-400">x{win.count}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-slate-400">{win.ways} ways</span>
                        <span className="text-emerald-400 font-bold">${win.payout.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h3 className="text-lg font-bold text-amber-400 mb-3">Physics Entropy</h3>
              <PhysicsVisualization
                seed={seed}
                isRunning={isPhysicsRunning}
                onComplete={handleEntropyComplete}
                width={350}
                height={250}
              />
              {entropyHex && (
                <div className="mt-3">
                  <span className="text-slate-400 text-sm">Entropy Hash:</span>
                  <div className="font-mono text-xs text-emerald-400 break-all bg-slate-900 p-2 rounded mt-1">
                    {entropyHex}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h3 className="text-lg font-bold text-amber-400 mb-3">Session Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Won:</span>
                  <span className="text-emerald-400 font-bold">${totalWon.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">RTP:</span>
                  <span className="text-white">96.92%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ways to Win:</span>
                  <span className="text-white">1,024</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Grid:</span>
                  <span className="text-white">5x4</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h3 className="text-lg font-bold text-amber-400 mb-3">Paytable</h3>
              <div className="space-y-1 text-xs max-h-48 overflow-y-auto">
                {getAllSymbols()
                  .filter(s => !s.isWild && !s.isScatter)
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 6)
                  .map(symbol => (
                    <div key={symbol.id} className="flex items-center justify-between bg-slate-700/30 rounded p-1">
                      <div className="flex items-center gap-1">
                        <span>{symbol.emoji}</span>
                        <span className="text-slate-300">{symbol.name}</span>
                      </div>
                      <span className="text-amber-400">{symbol.value}x</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h3 className="text-lg font-bold text-amber-400 mb-2">Provably Fair</h3>
              <p className="text-slate-400 text-sm">
                Each spin uses Three-Body physics simulation to generate entropy. 
                The chaotic nature of gravitational interactions ensures truly random, 
                yet verifiable results.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
