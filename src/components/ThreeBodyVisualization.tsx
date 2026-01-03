'use client';

import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Trail, Sphere, Line } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationState, Body } from '@/lib/three-body-api';

interface BodyMeshProps {
  body: Body;
  color: string;
  index: number;
  isAnimating: boolean;
}

function BodyMesh({ body, color, index, isAnimating }: BodyMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current && isAnimating) {
      meshRef.current.position.set(body.position.x, body.position.y, body.position.z);
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3 + index) * 0.1;
      meshRef.current.scale.setScalar(scale);
    }
    if (glowRef.current && isAnimating) {
      glowRef.current.position.set(body.position.x, body.position.y, body.position.z);
      const glowScale = 1.5 + Math.sin(state.clock.elapsedTime * 2 + index) * 0.3;
      glowRef.current.scale.setScalar(glowScale);
    }
  });

  return (
    <group>
      <Trail
        width={0.3}
        length={50}
        color={color}
        attenuation={(t) => t * t}
      >
        <mesh ref={meshRef} position={[body.position.x, body.position.y, body.position.z]}>
          <sphereGeometry args={[0.15, 32, 32]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.5}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      </Trail>
      <mesh ref={glowRef} position={[body.position.x, body.position.y, body.position.z]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
        />
      </mesh>
    </group>
  );
}

interface AnimatedBodiesProps {
  simulationStates: SimulationState[];
  isAnimating: boolean;
  animationSpeed: number;
  onAnimationComplete?: () => void;
}

function AnimatedBodies({ simulationStates, isAnimating, animationSpeed, onAnimationComplete }: AnimatedBodiesProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const frameRef = useRef(0);
  const timeRef = useRef(0);
  const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d'];
  
  useFrame((state, delta) => {
    if (!isAnimating || simulationStates.length === 0) return;
    
    timeRef.current += delta * animationSpeed;
    
    if (timeRef.current > 0.05) {
      timeRef.current = 0;
      frameRef.current = (frameRef.current + 1) % simulationStates.length;
      setCurrentFrame(frameRef.current);
      
      if (frameRef.current === simulationStates.length - 1 && onAnimationComplete) {
        onAnimationComplete();
      }
    }
  });

  const currentState = simulationStates[currentFrame] || simulationStates[0];
  
  if (!currentState) {
    return null;
  }

  return (
    <>
      {currentState.bodies.map((body, index) => (
        <BodyMesh
          key={index}
          body={body}
          color={colors[index]}
          index={index}
          isAnimating={isAnimating}
        />
      ))}
    </>
  );
}

interface OrbitPathProps {
  simulationStates: SimulationState[];
  bodyIndex: number;
  color: string;
}

function OrbitPath({ simulationStates, bodyIndex, color }: OrbitPathProps) {
  const points = useMemo(() => {
    if (simulationStates.length === 0) return [];
    return simulationStates.map(state => {
      const body = state.bodies[bodyIndex];
      return new THREE.Vector3(body.position.x, body.position.y, body.position.z);
    });
  }, [simulationStates, bodyIndex]);

  if (points.length < 2) return null;

  return (
    <Line
      points={points}
      color={color}
      lineWidth={1}
      transparent
      opacity={0.3}
    />
  );
}

function GridAndAxes() {
  return (
    <>
      <gridHelper args={[10, 20, '#333', '#222']} rotation={[Math.PI / 2, 0, 0]} />
      <axesHelper args={[3]} />
    </>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4ecdc4" />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#ff6b6b" />
    </>
  );
}

function StarField() {
  const starsRef = useRef<THREE.Points>(null);
  
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(3000);
    for (let i = 0; i < 1000; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame((state) => {
    if (starsRef.current) {
      starsRef.current.rotation.y = state.clock.elapsedTime * 0.01;
    }
  });

  return (
    <points ref={starsRef} geometry={geometry}>
      <pointsMaterial size={0.05} color="#ffffff" transparent opacity={0.6} />
    </points>
  );
}

interface ThreeBodyVisualizationProps {
  simulationStates: SimulationState[];
  isAnimating: boolean;
  animationSpeed?: number;
  onAnimationComplete?: () => void;
  showPaths?: boolean;
}

export default function ThreeBodyVisualization({
  simulationStates,
  isAnimating,
  animationSpeed = 1,
  onAnimationComplete,
  showPaths = true,
}: ThreeBodyVisualizationProps) {
  const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d'];

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [5, 5, 5], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <color attach="background" args={['#0a0a0a']} />
        <fog attach="fog" args={['#0a0a0a', 10, 50]} />
        
        <Lights />
        <StarField />
        
        {showPaths && simulationStates.length > 0 && colors.map((color, index) => (
          <OrbitPath
            key={index}
            simulationStates={simulationStates}
            bodyIndex={index}
            color={color}
          />
        ))}
        
        <AnimatedBodies
          simulationStates={simulationStates}
          isAnimating={isAnimating}
          animationSpeed={animationSpeed}
          onAnimationComplete={onAnimationComplete}
        />
        
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          autoRotate={!isAnimating}
          autoRotateSpeed={0.5}
          minDistance={2}
          maxDistance={20}
        />
      </Canvas>
    </div>
  );
}
