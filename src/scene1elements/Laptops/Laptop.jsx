// Laptop.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF, Text } from "@react-three/drei";

export default function Laptop({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  src = "",
  webm = null,
  videoScale = 0.8,
  poweredOn = false,
}) {
  const { scene } = useGLTF("/models/laptop.glb");
  const meshRef = useRef(null);
  const [video, setVideo] = useState(null);
  const [texture, setTexture] = useState(null);
  const [ready, setReady] = useState(false);

  // Paris time (screensaver)
  const [timeString, setTimeString] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const parisTime = now.toLocaleString("fr-FR", {
        timeZone: "Europe/Paris",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setTimeString(parisTime + "    Paris");
    };
    updateTime();
    const id = setInterval(updateTime, 1000);
    return () => clearInterval(id);
  }, []);

  // Video element
  useEffect(() => {
    if (!src) return;
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.loop = true;
    v.autoplay = false;
    v.crossOrigin = "anonymous";
    v.preload = "auto";

    const s1 = document.createElement("source");
    s1.src = src;
    s1.type = "video/mp4";
    v.appendChild(s1);
    if (webm) {
      const s2 = document.createElement("source");
      s2.src = webm;
      s2.type = "video/webm";
      v.appendChild(s2);
    }

    v.addEventListener("playing", () => setReady(true));
    setVideo(v);

    return () => {
      v.pause();
      while (v.firstChild) v.removeChild(v.firstChild);
      v.load();
      setReady(false);
    };
  }, [src, webm]);

  // Power on/off
  useEffect(() => {
    if (!video) return;
    if (poweredOn) video.play().catch(() => {});
    else video.pause();
  }, [poweredOn, video]);

  // Video texture
  useEffect(() => {
    if (!video) return;
    const t = new THREE.VideoTexture(video);
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    setTexture(t);
    return () => t.dispose();
  }, [video]);

  // Fallback if 'playing' didn't fire
  useFrame(() => {
    if (!video || ready) return;
    if (
      (video.readyState ?? 0) >= 2 &&
      !video.paused &&
      video.currentTime > 0
    ) {
      setReady(true);
    }
  });

  // Optional: adjust materials (so React controls them if needed)
  useMemo(() => {
    if (!scene) return;
    scene.traverse((child) => {
      if (child.isMesh && Array.isArray(child.material)) {
        // front bezel (material[0]) → leave black
        // back lid (material[1]) → leave pink
        // you can override here if you want
      }
    });
  }, [scene]);

  // Screen center where we overlay video or time
  const screenCenter = [0, 11, -10.5]; // adjust to match GLB
  const planeW = 36;
  const planeH = 22;
  const displayOffset = 0.03; // sits just in front of the black screen

  return (
    <group scale={0.02} position={position} rotation={rotation} ref={meshRef}>
      <primitive object={scene.clone()} />

      {/* OFF: Paris time screensaver */}
      {!poweredOn && (
        <Text
          font="/fonts/Neue_Machina.ttf"
          position={[
            screenCenter[0],
            screenCenter[1],
            screenCenter[2] + displayOffset,
          ]}
          fontSize={3}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {timeString}
        </Text>
      )}

      {/* ON: video texture plane */}
      {poweredOn && ready && texture && (
        <mesh
          position={[
            screenCenter[0],
            screenCenter[1],
            screenCenter[2] + displayOffset,
          ]}
          scale={[videoScale, videoScale, 1]}
        >
          <planeGeometry args={[planeW, planeH]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

useGLTF.preload("/models/laptop.glb");
