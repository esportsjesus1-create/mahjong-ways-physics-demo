/**
 * Three-Body Entropy API Client
 * Fetches physics data from the three-body entropy RNG API
 * Falls back to local simulation if API is unavailable
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

export interface InitialConditions {
  masses: number[];
  positions: Vector3D[];
  velocities: Vector3D[];
}

export interface SimulationState {
  bodies: Body[];
  time: number;
  entropy: number;
}

export interface EntropyResponse {
  spinId: string;
  timestamp: string;
  initialConditions: InitialConditions;
  simulationStates: SimulationState[];
  finalEntropy: {
    value: number;
    hex: string;
  };
  thetaValues: number[];
}

const API_BASE_URL = 'https://three-body-entropy-rng.vercel.app/api';

/**
 * Generates random initial conditions for three bodies
 */
function generateRandomInitialConditions(): InitialConditions {
  const masses = [1.0, 1.0, 1.0];
  
  const positions: Vector3D[] = [
    { x: -1 + Math.random() * 0.5, y: Math.random() * 0.5, z: Math.random() * 0.3 },
    { x: 1 + Math.random() * 0.5, y: Math.random() * 0.5, z: Math.random() * 0.3 },
    { x: Math.random() * 0.5, y: 1 + Math.random() * 0.5, z: Math.random() * 0.3 },
  ];
  
  const velocities: Vector3D[] = [
    { x: Math.random() * 0.3, y: 0.5 + Math.random() * 0.2, z: Math.random() * 0.1 },
    { x: Math.random() * 0.3, y: -0.5 + Math.random() * 0.2, z: Math.random() * 0.1 },
    { x: 0.5 + Math.random() * 0.2, y: Math.random() * 0.3, z: Math.random() * 0.1 },
  ];
  
  return { masses, positions, velocities };
}

/**
 * Computes gravitational acceleration on body i from all other bodies
 */
function computeAcceleration(bodies: Body[], i: number, G: number = 1.0, softening: number = 0.01): Vector3D {
  const acc: Vector3D = { x: 0, y: 0, z: 0 };
  const body = bodies[i];
  
  for (let j = 0; j < bodies.length; j++) {
    if (i === j) continue;
    
    const other = bodies[j];
    const dx = other.position.x - body.position.x;
    const dy = other.position.y - body.position.y;
    const dz = other.position.z - body.position.z;
    
    const distSq = dx * dx + dy * dy + dz * dz + softening * softening;
    const dist = Math.sqrt(distSq);
    const force = G * other.mass / distSq;
    
    acc.x += force * dx / dist;
    acc.y += force * dy / dist;
    acc.z += force * dz / dist;
  }
  
  return acc;
}

/**
 * Performs one step of the simulation using Velocity Verlet integration
 */
function simulationStep(bodies: Body[], dt: number, G: number = 1.0): Body[] {
  const newBodies: Body[] = bodies.map((body, i) => {
    const acc = computeAcceleration(bodies, i, G);
    
    const newPos: Vector3D = {
      x: body.position.x + body.velocity.x * dt + 0.5 * acc.x * dt * dt,
      y: body.position.y + body.velocity.y * dt + 0.5 * acc.y * dt * dt,
      z: body.position.z + body.velocity.z * dt + 0.5 * acc.z * dt * dt,
    };
    
    return {
      mass: body.mass,
      position: newPos,
      velocity: body.velocity,
    };
  });
  
  for (let i = 0; i < newBodies.length; i++) {
    const oldAcc = computeAcceleration(bodies, i, G);
    const newAcc = computeAcceleration(newBodies, i, G);
    
    newBodies[i].velocity = {
      x: bodies[i].velocity.x + 0.5 * (oldAcc.x + newAcc.x) * dt,
      y: bodies[i].velocity.y + 0.5 * (oldAcc.y + newAcc.y) * dt,
      z: bodies[i].velocity.z + 0.5 * (oldAcc.z + newAcc.z) * dt,
    };
  }
  
  return newBodies;
}

/**
 * Computes entropy from the current state of the simulation
 */
function computeEntropy(bodies: Body[]): number {
  let entropy = 0;
  
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const dx = bodies[i].position.x - bodies[j].position.x;
      const dy = bodies[i].position.y - bodies[j].position.y;
      const dz = bodies[i].position.z - bodies[j].position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      const dvx = bodies[i].velocity.x - bodies[j].velocity.x;
      const dvy = bodies[i].velocity.y - bodies[j].velocity.y;
      const dvz = bodies[i].velocity.z - bodies[j].velocity.z;
      const relVel = Math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz);
      
      entropy += dist * relVel;
    }
  }
  
  return entropy;
}

/**
 * Converts a number to a hex string
 */
function toHex(value: number): string {
  const normalized = Math.abs(value) % 1;
  const intValue = Math.floor(normalized * 0xFFFFFFFF);
  return intValue.toString(16).padStart(8, '0');
}

/**
 * Runs a local three-body simulation
 */
export function runLocalSimulation(
  initialConditions?: InitialConditions,
  duration: number = 10,
  dt: number = 0.01,
  stepsPerFrame: number = 5
): EntropyResponse {
  const conditions = initialConditions || generateRandomInitialConditions();
  
  let bodies: Body[] = conditions.masses.map((mass, i) => ({
    mass,
    position: { ...conditions.positions[i] },
    velocity: { ...conditions.velocities[i] },
  }));
  
  const simulationStates: SimulationState[] = [];
  const thetaValues: number[] = [];
  let time = 0;
  const totalSteps = Math.floor(duration / dt);
  const frameInterval = Math.floor(totalSteps / 100);
  
  for (let step = 0; step < totalSteps; step++) {
    bodies = simulationStep(bodies, dt);
    time += dt;
    
    if (step % frameInterval === 0 || step === totalSteps - 1) {
      const entropy = computeEntropy(bodies);
      simulationStates.push({
        bodies: bodies.map(b => ({
          mass: b.mass,
          position: { ...b.position },
          velocity: { ...b.velocity },
        })),
        time,
        entropy,
      });
      
      const theta = Math.atan2(
        bodies[0].position.y - bodies[1].position.y,
        bodies[0].position.x - bodies[1].position.x
      );
      thetaValues.push(theta);
    }
  }
  
  const finalEntropy = computeEntropy(bodies);
  const entropyHex = toHex(finalEntropy) + toHex(time) + toHex(bodies[0].position.x) + 
                     toHex(bodies[1].position.y) + toHex(bodies[2].position.z) +
                     toHex(bodies[0].velocity.x) + toHex(bodies[1].velocity.y) + toHex(bodies[2].velocity.z);
  
  return {
    spinId: `spin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    initialConditions: conditions,
    simulationStates,
    finalEntropy: {
      value: finalEntropy,
      hex: entropyHex.substring(0, 64),
    },
    thetaValues,
  };
}

/**
 * Fetches entropy data from the API
 * Falls back to local simulation if API is unavailable
 */
export async function fetchEntropy(clientSeed?: string): Promise<EntropyResponse> {
  try {
    const params = new URLSearchParams();
    if (clientSeed) {
      params.append('clientSeed', clientSeed);
    }
    params.append('timestamp', Date.now().toString());
    
    const response = await fetch(`${API_BASE_URL}/entropy?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.log('API not available, using local simulation');
      return runLocalSimulation();
    }
    
    const data = await response.json();
    return data as EntropyResponse;
  } catch (error) {
    console.log('API error, using local simulation:', error);
    return runLocalSimulation();
  }
}

/**
 * Generates a new spin with entropy
 */
export async function generateSpin(): Promise<EntropyResponse> {
  const clientSeed = Math.random().toString(36).substring(2, 15);
  return fetchEntropy(clientSeed);
}
