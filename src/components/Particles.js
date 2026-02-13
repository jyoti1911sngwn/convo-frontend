import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";

const Particles = () => {
  const mesh = useRef();
  const count = 500;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) arr[i] = (Math.random() - 0.5) * 10;
    return arr;
  }, [count]);

  useFrame(() => {
    mesh.current.rotation.y += 0.001;
    mesh.current.rotation.x += 0.0005;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          itemSize={3}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial color="#00FF7F" size={0.05} />
    </points>
  );
};

export default Particles;
