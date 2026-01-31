import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { Plane } from "@react-three/drei";
import Particles from "./Particles";

const AnimateBackground = () => {
  return (
    //     <Canvas camera={{ position: [0, 0, 5] }}>
    //       <Stars />

    // <Plane args={[20, 20]}>
    //   <meshStandardMaterial
    //     color="#0a0a0a"
    //     attach="material"
    //     transparent
    //     opacity={0.8}
    //   />
    // </Plane>

    //       <mesh rotation={[0.5, 0.5, 0]}>
    //         <torusKnotGeometry args={[1, 0.4, 128, 32]} />
    //         <meshStandardMaterial color="#00FF7F" metalness={0.8} roughness={0.2} />
    //       </mesh>
    //       <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={1} />
    //     </Canvas>
    <Canvas camera={{ position: [0, 0, 5] }}>
      <ambientLight intensity={0.5} />
      <Particles />
    </Canvas>
  );
};

export default AnimateBackground;
