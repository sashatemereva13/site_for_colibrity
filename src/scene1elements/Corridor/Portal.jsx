// src/scene1elements/Portal.jsx
import { forwardRef, useRef, useImperativeHandle, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
// import ColibriParticles from "./ColibriParticles";
import PortalSurface from "./PortalShader";
import DottedText from "./DottedText";
// import PortalRainParticles from "./PortalRainParticles";
import SurfaceBurstOnBird_Geometry from "./SurfaceBurstOnBird";

const Portal = forwardRef((props, ref) => {
  const {
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    label = "",
    labelSize = 0.35,
    labelColor = "#000000",
    fontUrl = "/fonts/NeueMachina-Black.ttf",
    birdRef,

    // trigger/visibility tuning
    eps = 0.05, // distance band around portal plane
    cooldown = 0.35, // seconds between triggers

    // "keep visible for a bit" aura settings
    idleAura = true, // turn on the idle aura
    auraInterval = 4.5, // seconds between idle bursts
    auraConfig = {
      // gentle, long-lived particles
      count: 220,
      speed: 0.25,
      life: 3.6,
      size: 0.1,
      mono: true,
      additive: false,
      saturation: 0.25,
      contrast: 0.5,
      brightness: 1.0,
      normalPush: 0.01,
      jitter: 0.006,
    },

    // crossing burst config (sharper/more energetic)
    crossingBurst = {
      count: 1600,
      speed: 3.0,
      life: 1.8,
      size: 0.12,
      mono: false,
      additive: false,
      saturation: 0.3,
      contrast: 0.6,
      brightness: 1.0,
      normalPush: 0.02,
      jitter: 0.01,
    },
  } = props;

  const groupRef = useRef(); // portal visuals
  const surfaceRef = useRef();

  // SurfaceBurstOnBird instance — attaches to Bird group on first burst
  const burstRef = useRef(null);

  // (legacy) sampler state used by ColibriParticles; safe to remove later
  const particlesRef = useRef(); // imperative ref for ColibriParticles (unused)
  const samplerRootRef = useRef(new THREE.Group()); // free-floating group (unused)

  const { scene } = useThree();

  // Mount (legacy) samplerRoot into scene — not needed for SurfaceBurstOnBird, but harmless
  useEffect(() => {
    scene.add(samplerRootRef.current);
    samplerRootRef.current.visible = false;
    setSamplerOpacity(0);
    return () => {
      scene.remove(samplerRootRef.current);
    };
  }, [scene]);

  useImperativeHandle(ref, () => groupRef.current, []);

  // timing state
  const lastTriggerAt = useRef(-1);

  // crossing scratch
  const tmpVec = useRef(new THREE.Vector3()).current;
  const prevZ = useRef(null);
  const armed = useRef(false);

  // helper: signed distance from bird to portal plane
  function signedDistanceToPortalPlane(birdWorldPos) {
    const portal = groupRef.current;
    const portalWorldPos = new THREE.Vector3().setFromMatrixPosition(
      portal.matrixWorld
    );
    const portalWorldQuat = new THREE.Quaternion().copy(
      portal.getWorldQuaternion(new THREE.Quaternion())
    );
    const normal = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(portalWorldQuat)
      .normalize();
    const toPoint = tmpVec.copy(birdWorldPos).sub(portalWorldPos);
    return toPoint.dot(normal); // signed distance in world units
  }

  // (legacy) set opacity on all materials inside samplerRootRef
  function setSamplerOpacity(a) {
    const root = samplerRootRef.current;
    if (!root) return;
    root.traverse((o) => {
      const m = o.material;
      if (!m) return;
      const mats = Array.isArray(m) ? m : [m];
      mats.forEach((mat) => {
        mat.transparent = true;
        mat.depthWrite = false;
        mat.opacity = a;
        mat.needsUpdate = true;
      });
    });
  }

  // snap legacy samplerRoot to bird pose (not required for SurfaceBurstOnBird)
  function matchSamplerToBird() {
    const bird = birdRef?.current;
    const sampler = samplerRootRef.current;
    if (!bird || !sampler) return;

    bird.getWorldPosition(sampler.position);
    bird.getWorldQuaternion(sampler.quaternion);
    sampler.updateMatrixWorld(true);
  }

  // --- Idle aura: keep some particles visible even without crossings ---
  useEffect(() => {
    if (!idleAura) return;

    // fire an initial gentle aura once on mount
    burstRef.current?.burst(auraConfig);

    const id = setInterval(() => {
      // avoid spamming right after a crossing burst; reuse crossing cooldown
      const now = performance.now() / 1000;
      if (lastTriggerAt.current < 0 || now - lastTriggerAt.current > cooldown) {
        burstRef.current?.burst(auraConfig);
      }
    }, auraInterval * 1000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idleAura, auraInterval]);

  useFrame(({ clock }) => {
    const portal = groupRef.current;
    const bird = birdRef?.current;
    if (!portal || !bird) return;

    const birdWorld = tmpVec.setFromMatrixPosition(bird.matrixWorld);
    const dist = signedDistanceToPortalPlane(birdWorld);

    // first frame init
    if (prevZ.current === null) {
      prevZ.current = dist;
      armed.current = Math.abs(dist) > eps;
      return;
    }

    // arm when clearly outside the band
    if (!armed.current && Math.abs(dist) > eps * 2) {
      armed.current = true;
    }

    const was = prevZ.current;
    const tnow = clock.getElapsedTime();
    const cooled = tnow - lastTriggerAt.current > cooldown;

    // detect crossing
    const crossed =
      armed.current &&
      cooled &&
      ((was > eps && dist < -eps) ||
        (was < -eps && dist > eps) ||
        (Math.abs(dist) <= eps && Math.abs(was) > eps));

    if (crossed) {
      // (legacy) keep sampler in sync — not required by SurfaceBurstOnBird
      matchSamplerToBird();

      // IMPORTANT: trigger the bird-attached burst (not ColibriParticles)
      burstRef.current?.burst(crossingBurst);

      lastTriggerAt.current = tnow;
      armed.current = false;
    }

    prevZ.current = dist;
  });

  return (
    <>
      <group ref={groupRef} position={position} rotation={rotation}>
        {/* Optional label */}
        {label && (
          <DottedText
            position={[0, 0, 0.2]}
            font={fontUrl}
            fontSize={labelSize}
            color={labelColor}
            anchorX="center"
            anchorY="middle"
            textAlign="center"
            maxWidth={4}
            lineHeight={1.2}
            dotScale={1.5}
            dotSize={2.3}
            fillBg={false}
          >
            {label}
          </DottedText>
        )}
      </group>
    </>
  );
});

export default Portal;
