const TV = () => {
  return (
    <>
      {/* TV Frame */}
      <mesh position={[0, 1, -0.08]}>
        <boxGeometry args={[5, 3.5, 0.1]} />
        <meshStandardMaterial color="#000000" metalness={0.3} roughness={0.8} />
      </mesh>

      {/* Back Glow Layer */}
      <mesh position={[0, 1, -0.02]}>
        <planeGeometry args={[4.6, 3]} />
        <meshStandardMaterial
          color="#858585"
          roughness={0.6}
          metalness={0.4}
          emissive="#111"
          emissiveIntensity={0.05}
        />
      </mesh>

      {/* Front Display Surface */}
      <mesh position={[0, 1, -0.01]}>
        <planeGeometry args={[4.49, 2.89]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.7}
          metalness={0.4}
          emissive="#c2b9b9"
          emissiveIntensity={0.1}
        />
      </mesh>
    </>
  );
};

export default TV;
