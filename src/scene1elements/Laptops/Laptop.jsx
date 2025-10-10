// Laptop.jsx
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, extend } from "@react-three/fiber";
import { useGLTF, Text, shaderMaterial } from "@react-three/drei";

// Procedural TV-static shader
const NoiseMaterial = shaderMaterial(
  { time: 0, speed: 20.0, contrast: 1.2, brightness: 0.0, opacity: 0.5 },
  // vertex
  /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`,
  // fragment
  /* glsl */ `
  uniform float time;
  uniform float speed;
  uniform float contrast;
  uniform float brightness;
     uniform float opacity; 
  varying vec2 vUv;

  // quick hash-based noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    // animate the seed quickly to mimic TV static
    float seed = floor(time * speed);
    // slightly vary scale to avoid fixed pattern
    vec2 st = vUv * (1.0 + mod(seed, 5.0));
    float n = hash(st + seed);

    // push toward black/white
    n = (n - 0.5) * contrast + 0.5 + brightness;

     gl_FragColor = vec4(vec3(n), opacity);
  }`
);
extend({ NoiseMaterial });

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
  const noiseMatRef = useRef(null);

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

    const onPlaying = () => setReady(true);
    v.addEventListener("playing", onPlaying);
    setVideo(v);

    return () => {
      v.removeEventListener("playing", onPlaying);
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
  useFrame((state) => {
    if (noiseMatRef.current) {
      noiseMatRef.current.time = state.clock.getElapsedTime();
    }
    if (!video || ready) return;
    if (
      (video.readyState ?? 0) >= 2 &&
      !video.paused &&
      video.currentTime > 0
    ) {
      setReady(true);
    }
  });

  // Screen area
  const screenCenter = [0, 10.6, -10.99]; // adjust to match GLB
  const planeW = 35.45;
  const planeH = 20.9999;
  const displayOffset = 0.1; // sits just in front of the black screen

  return (
    <group scale={0.02} position={position} rotation={rotation} ref={meshRef}>
      <primitive object={scene.clone()} />

      {/* OFF: Paris time + procedural noise */}
      {!poweredOn && (
        <>
          {/* Noise plane (behind text) */}
          <mesh
            position={[
              screenCenter[0],
              screenCenter[1],
              screenCenter[2] + displayOffset,
            ]}
            renderOrder={1}
          >
            <planeGeometry args={[planeW - 6, planeH - 3]} />
            <noiseMaterial
              ref={noiseMatRef}
              speed={70} // tweak: faster/slower static
              contrast={1.4} // tweak: punchier whites/blacks
              brightness={0.0} // tweak: overall lift
              transparent
              opacity={0.07}
            />
          </mesh>

          {/* Time overlay */}
          <Text
            font="/fonts/Neue_Machina.ttf"
            position={[
              screenCenter[0],
              screenCenter[1],
              screenCenter[2] + displayOffset + 0.000001,
            ]}
            fontSize={3}
            color="white"
            anchorX="center"
            anchorY="middle"
            renderOrder={2}
            outlineWidth={0.02}
            outlineBlur={0.002}
            outlineColor="#000"
          >
            {timeString}
          </Text>
        </>
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
