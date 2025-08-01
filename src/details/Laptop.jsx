function Laptop({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      {/* Laptop base */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.5, 0.05, 0.35]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      {/* Laptop screen */}
      <mesh position={[0, 0.2, -0.15]} rotation={[-Math.PI / 4, 0, 0]}>
        <boxGeometry args={[0.5, 0.3, 0.02]} />
        <meshStandardMaterial color="black" />
      </mesh>
    </group>
  );
}

export default Laptop;
