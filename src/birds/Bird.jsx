// /src/details/Bird.jsx
import { useGLTF, useAnimations, useTexture } from "@react-three/drei";
import { forwardRef, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import { useTheme, MATCAPS } from "../allScenes/BirdThemes";


const MATCAP_NAME_RE = /^Material[_\.]?0*07$/i;
const TINT_NAME_RE = /^Material[_\.]?0*08$/i;

function tintWithShade(hex, shade) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  const targetL = THREE.MathUtils.clamp(shade ?? 0.7, 0.05, 0.95);
  hsl.l = THREE.MathUtils.lerp(hsl.l, targetL, 0.9);
  return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
}

const Bird = forwardRef((props, ref) => {
  const { matcapIndex, tints, tintIndex, shade } = useTheme();

  // Cached GLTF
  const gltf = useGLTF("/models/hummingbird.glb");
  useGLTF.preload("/models/hummingbird.glb");

  // playing around
  // const gltf = useGLTF("/models/colibriParticles.glb");
  // useGLTF.preload("/models/colibriParticles.glb");

  // Per-instance deep clone (prevents cross-talk)
  const scene = useMemo(() => SkeletonUtils.clone(gltf.scene), [gltf.scene]);

  const { actions, names } = useAnimations(gltf.animations, scene);
  useEffect(() => {
    actions[names[0]]?.reset().setLoop(THREE.LoopRepeat, Infinity).play();
  }, [actions, names]);

  // Current matcap/tint
  // const matcapURL =
  //   mats[Math.min(Math.max(matcapIndex ?? 0, 0), mats.length - 1)];
  // const matcapTex = useTexture(matcapURL);
  // if (matcapTex) matcapTex.colorSpace = THREE.SRGBColorSpace;

  // Preload ALL matcaps once; then select by index (no suspense on switch
  const allMatcaps = useTexture(MATCAPS); // mats = array of URLs from theme
  allMatcaps.forEach((t) => (t.colorSpace = THREE.SRGBColorSpace));
  const safeIdx = Math.min(
    Math.max(matcapIndex ?? 0, 0),
    allMatcaps.length - 1
  );
  const matcapTex = allMatcaps[safeIdx];

  const tintHex =
    tints[Math.min(Math.max(tintIndex ?? 0, 0), tints.length - 1)] ?? "#ffffff";
  const tintColor = useMemo(
    () => tintWithShade(tintHex, shade),
    [tintHex, shade]
  );

  // Targets for live updates
  const matcapTargets = useRef([]); // MeshMatcapMaterial for Material007
  const tintTargets = useRef([]); // Cloned Material008 (with .color)

  // Traverse ONCE on the clone — handle single & array materials
  useEffect(() => {
    matcapTargets.current = [];
    tintTargets.current = [];

    scene.traverse((ch) => {
      if (!ch.isMesh) return;

      const isArray = Array.isArray(ch.material);
      const arr = isArray ? ch.material : [ch.material];

      const replaced = arr.map((orig) => {
        const name = orig?.name || "";

        if (MATCAP_NAME_RE.test(name)) {
          const newMat = new THREE.MeshMatcapMaterial({
            name,
            matcap: matcapTex ?? null, // initial value; live-updated below
            color: new THREE.Color(0xffffff),
          });
          matcapTargets.current.push(newMat);
          return newMat;
        }

        if (TINT_NAME_RE.test(name)) {
          const clone = orig?.clone ? orig.clone() : orig;
          if (clone?.color) {
            clone.color.copy(tintColor); // set initial tint
            clone.needsUpdate = true;
            tintTargets.current.push(clone);
          }
          return clone;
        }

        return orig;
      });

      ch.material = isArray ? replaced : replaced[0];
    });
  }, [scene]); // do not depend on tint/matcap here

  // Live matcap update
  useEffect(() => {
    matcapTargets.current.forEach((m) => {
      m.matcap = matcapTex ?? null;
      m.needsUpdate = true;
    });
  }, [matcapTex]);

  // Live tint update
  useEffect(() => {
    tintTargets.current.forEach((m) => {
      if (m?.color) {
        m.color.copy(tintColor);
        m.needsUpdate = true;
      }
    });
  }, [tintColor]);

  return (
    <>
      <group ref={ref} {...props}>
        <primitive object={scene} scale={0.2} />
      </group>
    </>
  );
});

export default Bird;
