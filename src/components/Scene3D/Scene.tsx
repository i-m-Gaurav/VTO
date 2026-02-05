import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { JacketModel } from './JacketModel';

export function Scene() {
  return (
    <div className="w-full h-screen bg-gray-100">
      <Canvas
        camera={{ position: [0, 1, 3], fov: 50 }}
        dpr={1}
        gl={{ powerPreference: 'high-performance', antialias: false }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <directionalLight position={[-5, 5, -5]} intensity={0.3} />

        {/* 3D Model */}
        <JacketModel />

        {/* Controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={1}
          maxDistance={10}
        />

        {/* Environment */}
        <Environment preset="studio" />
      </Canvas>
    </div>
  );
}
