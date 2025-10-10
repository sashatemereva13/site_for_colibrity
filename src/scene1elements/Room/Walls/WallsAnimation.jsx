import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

export default function WallsAnimation({
  glbUrl = "/models/AnimatedLines.glb",
  targetMeshName = "LightLines",
  videoSrc = "/textures/GlowLinesVideo.mp4",
  playbackRate = 1.7,
  baseOpacity = 0.2, // <-- low opacity guiding lines
}) {
  const { scene } = useGLTF(glbUrl);
  const videoRef = useRef(null);
  const matRef = useRef(null);

  // Create video texture
  const { video, texture } = useMemo(() => {
    const v = document.createElement("video");
    v.src = videoSrc;
    v.crossOrigin = "anonymous";
    v.loop = true;
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";

    const t = new THREE.VideoTexture(v);
    t.colorSpace = THREE.SRGBColorSpace;
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    return { video: v, texture: t };
  }, [videoSrc]);

  videoRef.current = video;

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = playbackRate;
    videoRef.current.play().catch(() => {});
  }, [playbackRate]);

  // Assign transparent + emissive material
  useEffect(() => {
    scene.traverse((o) => {
      if (o.isMesh && o.name.includes(targetMeshName)) {
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(0xffffff), // guiding lines
          transparent: true,
          opacity: baseOpacity, // <--- keeps them see-through
          emissive: new THREE.Color(0xffffff), // glowing part
          emissiveMap: texture, // animated glow from video
          emissiveIntensity: 2.0,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        o.material = mat;
        matRef.current = mat;
      }
    });
  }, [scene, targetMeshName, texture, baseOpacity]);

  // Optional: add a pulse animation in code
  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.emissiveIntensity =
        1.5 + 0.5 * Math.sin(clock.elapsedTime * 2);
    }
  });

  return <primitive position={[0, 0, -0.2]} object={scene} />;
}
