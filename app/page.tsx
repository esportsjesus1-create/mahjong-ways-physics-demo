"use client";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
      <main className="flex flex-col items-center justify-center gap-8 p-8 text-center">
        <h1 className="text-5xl font-bold text-white">
          Mahjong Ways Physics Demo
        </h1>
        <p className="max-w-2xl text-xl text-slate-300">
          A Next.js + Three.js physics demonstration featuring mahjong tiles
          with entropy-based randomization powered by the Three-Body API.
        </p>
        <div className="mt-8 flex flex-col gap-4 rounded-lg bg-slate-700/50 p-6">
          <h2 className="text-2xl font-semibold text-white">Tech Stack</h2>
          <ul className="flex flex-wrap justify-center gap-3">
            <li className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white">
              Next.js 15
            </li>
            <li className="rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white">
              TypeScript
            </li>
            <li className="rounded-full bg-cyan-600 px-4 py-2 text-sm font-medium text-white">
              Tailwind CSS
            </li>
            <li className="rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white">
              Three.js
            </li>
            <li className="rounded-full bg-pink-600 px-4 py-2 text-sm font-medium text-white">
              React Three Fiber
            </li>
          </ul>
        </div>
        <div className="mt-4 text-slate-400">
          <p>3D scene and physics simulation coming soon...</p>
        </div>
      </main>
    </div>
  );
}
