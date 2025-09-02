import { useEffect, useRef } from "react";
import { Cloud } from "@react-three/drei";

/** A static, always-on cloud that won't nuke the z-buffer. */
export default function StaticCloud({
  pos = [0, 5, 0],
  scale = 4,
  volume = 10,
  opacity = 0.9,
  visible = true,
  fade = 400,
}) {
  const cloudRef = useRef();

  useEffect(() => {
    const m = cloudRef.current?.material;
    if (!m) return;
    // prevent the “whole scene disappears for a moment” issue
    m.transparent = true;
    m.depthWrite = false; // critical for big translucent volumes
    m.opacity = opacity;
    cloudRef.current.renderOrder = 999; // draw last, nice soft overlay
    cloudRef.current.frustumCulled = false;
  }, [opacity]);

  return (
    <group position={pos} visible={visible}>
      <Cloud
        segments={60}
        ref={cloudRef}
        position={[0, 0, 0]}
        scale={scale}
        volume={volume}
        color="#fdc2ff"
        opacity={opacity} // initial; material is set in effect too
        fade={fade}
        frustumCulled={false}
      />
    </group>
  );
}
