// src/sceneSwitch/Scene2.jsx
import { useRef, useState, useEffect, useMemo, createRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Cloud } from "@react-three/drei";
import * as THREE from "three";

import Scene2Scroll from "./Scene2Scroll";
import Logo from "../secondScroll/Logo";
import Inspire from "../secondScroll/Inspire";
import BackGarden from "../secondScroll/BackGarden";
import MouseTrail from "../secondScroll/MouseTrail";

export default function Scene2({
  persistentBirdRef,
  handoffFrom = null,
  handoffTo = [-2, -2, -10],
  handoffMs = 650,
}) {
  const isMobile = window.innerWidth < 768;
  const { camera, size, gl } = useThree();

  // messages for Inspire nodes (left commented for now)
  const messages = useMemo(
    () => ["Ecommerce", "Site Vitrine", "Configurateur", "Site Immersif"],
    []
  );

  const phraseRefs = useMemo(
    () => messages.map(() => createRef()),
    [messages.length]
  );

  const [phraseAngles, setPhraseAngles] = useState(() =>
    Array(messages.length).fill(0)
  );
  useEffect(() => {
    if (phraseAngles.length !== messages.length) {
      setPhraseAngles(Array(messages.length).fill(0));
    }
  }, [messages.length, phraseAngles.length]);

  const [scrollValue, setScrollValue] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const tRef = useRef(0);
  const wp = useRef(new THREE.Vector3()).current; // world position
  const ws = useRef(new THREE.Vector3()).current; // world scale
  const ndc = useRef(new THREE.Vector3()).current; // normalized device coords

  const groupRef = useRef();
  const hummingbird = persistentBirdRef ?? useRef(null);
  const [handoffDone, setHandoffDone] = useState(false);
  const startTs = useRef(null);

  const logo = useRef();
  const scrollRef = useRef(0);

  // --- ensure the persistent bird is visible when Scene2 mounts
  useEffect(() => {
    const b = persistentBirdRef?.current;
    if (b) {
      b.visible = true;
      b.layers.enable(0);
    }
  }, [persistentBirdRef]);

  // Single WebGLRenderTarget for the trail
  const trailRT = useMemo(
    () =>
      new THREE.WebGLRenderTarget(1, 1, {
        depthBuffer: false,
        stencilBuffer: false,
        magFilter: THREE.LinearFilter,
        minFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
      }),
    []
  );

  // keep RT at device-pixel resolution
  useEffect(() => {
    const dpr = gl.getPixelRatio();
    trailRT.setSize(size.width * dpr, size.height * dpr);

    const prev = gl.getRenderTarget();
    gl.setRenderTarget(trailRT);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(true, true, true);
    gl.setRenderTarget(prev);
    return () => trailRT.dispose();
  }, [size.width, size.height, gl, trailRT]);

  useFrame((_, delta) => {
    tRef.current += delta;
    const bird = persistentBirdRef?.current;
    if (!bird) return;

    bird.getWorldPosition(wp);
    bird.getWorldScale(ws);
    ndc.copy(wp).project(camera);

    // --- Smooth handoff from Scene1 to Scene2 start pose
    if (!handoffDone && handoffFrom) {
      if (startTs.current === null) startTs.current = performance.now();
      const t = Math.min((performance.now() - startTs.current) / handoffMs, 1);
      const lx = THREE.MathUtils.lerp(handoffFrom[0], handoffTo[0], t);
      const ly = THREE.MathUtils.lerp(handoffFrom[1], handoffTo[1], t);
      const lz = THREE.MathUtils.lerp(handoffFrom[2], handoffTo[2], t);
      bird.position.set(lx, ly, lz);
      bird.visible = true;
      camera.lookAt(bird.position);
      if (t >= 1) setHandoffDone(true);
      return; // gate normal Scene2Scroll-driven updates until lerp finishes
    }
  });

  useEffect(() => {
    // logs both index and its text
    console.log(`[Inspire Active] #${activeIndex}: "${messages[activeIndex]}"`);
  }, [activeIndex, messages]);

  return (
    <group ref={groupRef}>
      {/* <OrbitControls ref={controlsRef} enabled={false} /> */}

      <Scene2Scroll
        logo={logo}
        hummingbird={hummingbird}
        phraseRefs={phraseRefs}
        scrollRef={scrollRef}
        setScrollValue={setScrollValue}
        setPhraseAngles={setPhraseAngles}
        onActiveIndex={setActiveIndex}
        enabled={handoffDone || handoffFrom == null}
      />

      {/* lights */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[3, 6, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />

      {/* content */}
      <Logo ref={logo} position={[0, 0, 0]} />

      {messages.map((text, i) => (
        <Inspire
          key={i}
          ref={phraseRefs[i]}
          text={text}
          isActive={activeIndex === i}
          position={[0, 0, 0]}
          fontSize={3} // tweak to taste
          maxWidth={10.5} // nice wrapping width
        />
      ))}

      <Cloud
        segments={40}
        position={[0, 0, 20]}
        seed={1}
        scale={3}
        volume={50}
        color="#fdc2ff"
        fade={50}
      />

      {!isMobile && (
        <>
          <MouseTrail trailMap={trailRT} />

          {/* <BackGarden
            trailMap={trailRT.texture}
            opacity={0.9}
            tile={[7, 7]}
            tint={[1, 1, 1]}
            driftPx={[5, 0]}
          /> */}
        </>
      )}
    </group>
  );
}
