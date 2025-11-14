export function getOrbitPosition({
  angle,
  radius = 19,
  center = { x: 0, y: 0, z: 0 },
  verticalAmplitude = 20,
  fadeThreshold = Math.PI / 4,
}) {
  const x = center.x + radius * Math.sin(angle);
  const z = center.z + radius * Math.cos(angle);

  const angleFromFront = ((angle + Math.PI * 2) % (Math.PI * 2)) - Math.PI;

  let y = center.y;
  if (angleFromFront > fadeThreshold) {
    y -= (angleFromFront - fadeThreshold) * verticalAmplitude;
  } else if (angleFromFront < -fadeThreshold) {
    y += (angleFromFront + fadeThreshold) * verticalAmplitude;
  }

  const angleDist = Math.abs(angleFromFront);
  const visibleRange = Math.PI / 2;
  let opacity = 0;
  if (angleDist < visibleRange) {
    opacity = Math.pow(Math.cos((angleDist / visibleRange) * (Math.PI / 2)), 2);
  }
  return {
    position: { x, y, z },
    opacity,
    angleFromFront,
  };
}
