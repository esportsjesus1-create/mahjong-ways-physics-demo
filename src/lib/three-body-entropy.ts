/**
 * Three-Body Physics Entropy Generator
 * 
 * Generates provably fair entropy using a three-body gravitational simulation.
 * The chaotic nature of the three-body problem ensures unpredictable but
 * deterministic results that can be verified.
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Body {
  mass: number;
  position: Vector3D;
  velocity: Vector3D;
}

export interface SimulationState {
  bodies: [Body, Body, Body];
  time: number;
  stepCount: number;
}

export interface EntropyResult {
  value: number;
  hex: string;
  finalState: SimulationState;
  initialConditionsHash: string;
}

export interface SimulationConfig {
  gravitationalConstant: number;
  softeningParameter: number;
  timeStep: number;
  duration: number;
}

const DEFAULT_CONFIG: SimulationConfig = {
  gravitationalConstant: 1.0,
  softeningParameter: 0.01,
  timeStep: 0.01,
  duration: 1.0
};

function vectorAdd(a: Vector3D, b: Vector3D): Vector3D {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function vectorSub(a: Vector3D, b: Vector3D): Vector3D {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vectorScale(v: Vector3D, s: number): Vector3D {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function vectorMagnitude(v: Vector3D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function vectorClone(v: Vector3D): Vector3D {
  return { x: v.x, y: v.y, z: v.z };
}

function cloneBody(body: Body): Body {
  return {
    mass: body.mass,
    position: vectorClone(body.position),
    velocity: vectorClone(body.velocity)
  };
}

function sha256Simple(data: string): string {
  const chunks: number[] = [];
  for (let i = 0; i < data.length; i++) {
    chunks.push(data.charCodeAt(i));
  }
  
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  
  for (let i = 0; i < chunks.length; i++) {
    h0 = (h0 + chunks[i] * 31) >>> 0;
    h1 = (h1 ^ (h0 << 3)) >>> 0;
    h2 = (h2 + (h1 >>> 5)) >>> 0;
    h3 = (h3 ^ (h2 << 7)) >>> 0;
    h4 = (h4 + (h3 >>> 11)) >>> 0;
    h5 = (h5 ^ (h4 << 13)) >>> 0;
    h6 = (h6 + (h5 >>> 17)) >>> 0;
    h7 = (h7 ^ (h6 << 19)) >>> 0;
  }
  
  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map(h => (h >>> 0).toString(16).padStart(8, '0'))
    .join('');
}

export class ThreeBodySimulation {
  private bodies: [Body, Body, Body];
  private config: SimulationConfig;
  private time: number = 0;
  private stepCount: number = 0;
  private initialConditionsHash: string = '';

  constructor(config: Partial<SimulationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.bodies = this.createDefaultBodies();
  }

  private createDefaultBodies(): [Body, Body, Body] {
    return [
      { mass: 1, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } },
      { mass: 1, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } },
      { mass: 1, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } }
    ];
  }

  initializeFromSeed(seed: string): void {
    const seedHash = sha256Simple(seed);
    
    const parseHexSegment = (hex: string, start: number, length: number): number => {
      const segment = hex.substring(start, start + length);
      return (parseInt(segment, 16) / Math.pow(16, length)) * 2 - 1;
    };
    
    this.bodies = [
      {
        mass: 0.5 + Math.abs(parseHexSegment(seedHash, 0, 4)) * 1.5,
        position: {
          x: parseHexSegment(seedHash, 4, 4) * 5,
          y: parseHexSegment(seedHash, 8, 4) * 5,
          z: parseHexSegment(seedHash, 12, 4) * 5
        },
        velocity: {
          x: parseHexSegment(seedHash, 16, 4) * 1,
          y: parseHexSegment(seedHash, 20, 4) * 1,
          z: parseHexSegment(seedHash, 24, 4) * 1
        }
      },
      {
        mass: 0.5 + Math.abs(parseHexSegment(seedHash, 28, 4)) * 1.5,
        position: {
          x: parseHexSegment(seedHash, 32, 4) * 5,
          y: parseHexSegment(seedHash, 36, 4) * 5,
          z: parseHexSegment(seedHash, 40, 4) * 5
        },
        velocity: {
          x: parseHexSegment(seedHash, 44, 4) * 1,
          y: parseHexSegment(seedHash, 48, 4) * 1,
          z: parseHexSegment(seedHash, 52, 4) * 1
        }
      },
      {
        mass: 0.5 + Math.abs(parseHexSegment(seedHash, 56, 4)) * 1.5,
        position: {
          x: parseHexSegment(seedHash, 60, 4) * 5,
          y: parseHexSegment(seedHash, 0, 4) * 5,
          z: parseHexSegment(seedHash, 4, 4) * 5
        },
        velocity: {
          x: parseHexSegment(seedHash, 8, 4) * 1,
          y: parseHexSegment(seedHash, 12, 4) * 1,
          z: parseHexSegment(seedHash, 16, 4) * 1
        }
      }
    ];
    
    this.time = 0;
    this.stepCount = 0;
    this.initialConditionsHash = sha256Simple(JSON.stringify(this.bodies));
  }

  private calculateAcceleration(bodyIndex: number): Vector3D {
    const body = this.bodies[bodyIndex];
    let acceleration: Vector3D = { x: 0, y: 0, z: 0 };
    
    for (let i = 0; i < 3; i++) {
      if (i === bodyIndex) continue;
      
      const other = this.bodies[i];
      const r = vectorSub(other.position, body.position);
      const distance = vectorMagnitude(r);
      const softened = Math.sqrt(distance * distance + this.config.softeningParameter * this.config.softeningParameter);
      const force = this.config.gravitationalConstant * other.mass / (softened * softened * softened);
      
      acceleration = vectorAdd(acceleration, vectorScale(r, force));
    }
    
    return acceleration;
  }

  private rk4Step(): void {
    const dt = this.config.timeStep;
    const originalBodies = this.bodies.map(cloneBody) as [Body, Body, Body];
    
    const k1v: Vector3D[] = [];
    const k1a: Vector3D[] = [];
    for (let i = 0; i < 3; i++) {
      k1v.push(vectorClone(this.bodies[i].velocity));
      k1a.push(this.calculateAcceleration(i));
    }
    
    for (let i = 0; i < 3; i++) {
      this.bodies[i].position = vectorAdd(originalBodies[i].position, vectorScale(k1v[i], dt / 2));
      this.bodies[i].velocity = vectorAdd(originalBodies[i].velocity, vectorScale(k1a[i], dt / 2));
    }
    
    const k2v: Vector3D[] = [];
    const k2a: Vector3D[] = [];
    for (let i = 0; i < 3; i++) {
      k2v.push(vectorClone(this.bodies[i].velocity));
      k2a.push(this.calculateAcceleration(i));
    }
    
    for (let i = 0; i < 3; i++) {
      this.bodies[i].position = vectorAdd(originalBodies[i].position, vectorScale(k2v[i], dt / 2));
      this.bodies[i].velocity = vectorAdd(originalBodies[i].velocity, vectorScale(k2a[i], dt / 2));
    }
    
    const k3v: Vector3D[] = [];
    const k3a: Vector3D[] = [];
    for (let i = 0; i < 3; i++) {
      k3v.push(vectorClone(this.bodies[i].velocity));
      k3a.push(this.calculateAcceleration(i));
    }
    
    for (let i = 0; i < 3; i++) {
      this.bodies[i].position = vectorAdd(originalBodies[i].position, vectorScale(k3v[i], dt));
      this.bodies[i].velocity = vectorAdd(originalBodies[i].velocity, vectorScale(k3a[i], dt));
    }
    
    const k4v: Vector3D[] = [];
    const k4a: Vector3D[] = [];
    for (let i = 0; i < 3; i++) {
      k4v.push(vectorClone(this.bodies[i].velocity));
      k4a.push(this.calculateAcceleration(i));
    }
    
    for (let i = 0; i < 3; i++) {
      const dv = vectorScale(
        vectorAdd(
          vectorAdd(k1v[i], vectorScale(k2v[i], 2)),
          vectorAdd(vectorScale(k3v[i], 2), k4v[i])
        ),
        dt / 6
      );
      const da = vectorScale(
        vectorAdd(
          vectorAdd(k1a[i], vectorScale(k2a[i], 2)),
          vectorAdd(vectorScale(k3a[i], 2), k4a[i])
        ),
        dt / 6
      );
      
      this.bodies[i].position = vectorAdd(originalBodies[i].position, dv);
      this.bodies[i].velocity = vectorAdd(originalBodies[i].velocity, da);
    }
    
    this.time += dt;
    this.stepCount++;
  }

  simulate(duration?: number): SimulationState {
    const targetDuration = duration ?? this.config.duration;
    const targetTime = this.time + targetDuration;
    
    while (this.time < targetTime) {
      this.rk4Step();
    }
    
    return this.getState();
  }

  getState(): SimulationState {
    return {
      bodies: this.bodies.map(cloneBody) as [Body, Body, Body],
      time: this.time,
      stepCount: this.stepCount
    };
  }

  getBodies(): [Body, Body, Body] {
    return this.bodies.map(cloneBody) as [Body, Body, Body];
  }

  getEntropyValue(): EntropyResult {
    const components: number[] = [];
    
    for (const body of this.bodies) {
      components.push(
        body.position.x, body.position.y, body.position.z,
        body.velocity.x, body.velocity.y, body.velocity.z
      );
    }
    
    const dataString = components.map(c => c.toExponential(15)).join(':');
    const hex = sha256Simple(dataString);
    
    const highBits = parseInt(hex.substring(0, 8), 16);
    const lowBits = parseInt(hex.substring(8, 16), 16);
    const combined = highBits * 0x100000000 + lowBits;
    const value = combined / 0x10000000000000000;
    
    return {
      value,
      hex,
      finalState: this.getState(),
      initialConditionsHash: this.initialConditionsHash
    };
  }

  reset(): void {
    this.bodies = this.createDefaultBodies();
    this.time = 0;
    this.stepCount = 0;
    this.initialConditionsHash = '';
  }
}

export function generateEntropy(seed: string, duration: number = 1.0): EntropyResult {
  const simulation = new ThreeBodySimulation({ duration });
  simulation.initializeFromSeed(seed);
  simulation.simulate();
  return simulation.getEntropyValue();
}

export function createSimulationFromSeed(seed: string): ThreeBodySimulation {
  const simulation = new ThreeBodySimulation();
  simulation.initializeFromSeed(seed);
  return simulation;
}
