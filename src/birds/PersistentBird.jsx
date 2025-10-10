// /src/sceneSwitch/PersistentBird.jsx
import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useImperativeHandle,
} from "react";
import { useGLTF, useAnimations, useTexture } from "@react-three/drei";
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

const PersistentBird = forwardRef(function PersistentBird(props, outerRef) {
  const driverRef = useRef();

  // THE cached gltf (do not mutate directly)
  const gltf = useGLTF("/models/hummingbird.glb");
  useGLTF.preload("/models/hummingbird.glb");

  // Make a per-instance deep clone (safe for skinned meshes + animations)
  const scene = useMemo(() => SkeletonUtils.clone(gltf.scene), [gltf.scene]);

  // Hook animations to the cloned scene
  const { actions, names } = useAnimations(gltf.animations, scene);
  useEffect(() => {
    actions[names[0]]?.reset().setLoop(THREE.LoopRepeat, Infinity).play();
  }, [actions, names]);

  // Theme
  const { matcapIndex, tints, tintIndex, shade } = useTheme();
  const allMatcaps = useTexture(MATCAPS);
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

  // Expose the driver group to external controllers
  useImperativeHandle(outerRef, () => driverRef.current, []);

  // Track materials for live updates
  const matcapTargets = useRef([]);
  const tintTargets = useRef([]);

  // Traverse ONCE on the cloned scene; do NOT include matcapTex/tintColor here
  useEffect(() => {
    matcapTargets.current = [];
    tintTargets.current = [];

    scene.traverse((ch) => {
      if (!ch.isMesh) return;

      const arr = Array.isArray(ch.material) ? ch.material : [ch.material];
      const replaced = arr.map((orig) => {
        const name = orig?.name || "";

        if (MATCAP_NAME_RE.test(name)) {
          const newMat = new THREE.MeshMatcapMaterial({
            name,
            matcap: matcapTex ?? null,
            color: new THREE.Color(0xffffff),
          });
          matcapTargets.current.push(newMat);
          return newMat;
        }

        if (TINT_NAME_RE.test(name)) {
          const clone = orig?.clone ? orig.clone() : orig;
          if (clone?.color) {
            clone.color.copy(tintColor);
            tintTargets.current.push(clone);
          }
          return clone;
        }

        return orig;
      });

      ch.material = Array.isArray(ch.material) ? replaced : replaced[0];
    });
    // Only when the clone is created
  }, [scene]);

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
    <group ref={driverRef} {...props}>
      <primitive object={scene} scale={0.5} />
    </group>
  );
});

export default PersistentBird;
