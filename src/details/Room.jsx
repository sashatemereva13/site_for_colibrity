// Room.jsx
const Room = () => {
  return (
    <>
      {/* Floor - earthy clay beige */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial
          color="#a29483"
          roughness={0.6}
          metalness={0.15}
        />
      </mesh>

      {/* Ceiling - warm ivory */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 10, 0]}>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color="#e5d9c9" roughness={0.4} metalness={0.2} />
      </mesh>

      {/* TV Wall (Back wall) - soft sand */}
      <mesh position={[0, 5, -12]}>
        <planeGeometry args={[24, 10]} />
        <meshStandardMaterial color="#d8c7b4" />
      </mesh>

      {/* Front Wall */}
      <mesh rotation={[0, Math.PI, 0]} position={[0, 5, 12]}>
        <planeGeometry args={[24, 7]} />
        <meshStandardMaterial color="#d8c7b4" />
      </mesh>

      {/* Left Wall */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-12, 5, 0]}>
        <planeGeometry args={[24, 10]} />
        <meshStandardMaterial color="#d8c7b4" />
      </mesh>

      {/* Right Wall */}
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[12, 5, 0]}>
        <planeGeometry args={[24, 10]} />
        <meshStandardMaterial color="#d8c7b4" />
      </mesh>
    </>
  );
};

export default Room;
