// scene1elements/CloudsCeiling.jsx
import StaticCloud from "./StaticCloud";

export default function CloudsCeiling({
  y = 15, // height around the top of walls
  radius = 20, // how far clouds extend horizontally
  count = 8, // how many around the ring
  opacity = 0.75,
  scale = 1.5,
  fade = 60,
}) {
  const clouds = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    clouds.push(
      <StaticCloud
        key={i}
        pos={[x, y, z]}
        opacity={opacity}
        scale={scale}
        volume={5}
        visible
        fade={fade}
      />
    );
  }
  return <group>{clouds}</group>;
}
