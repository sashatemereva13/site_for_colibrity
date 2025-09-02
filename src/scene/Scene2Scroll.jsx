// src/sceneSwitch/Scene2Scroll.jsx
import { useRef, useEffect, useLayoutEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useScroll } from "@react-three/drei";
import * as THREE from "three";

export default function Scene2Scroll({
  logo,
  hummingbird,
  phraseRefs = [],
  setScrollValue,
  onActiveIndex, // <- used to report which phrase should be visible
  setPhraseAngles, // (kept for compatibility; we won't fill it now)
  gateMs = 400,
  enabled = true,
}) {
  const scroll = useScroll();
  const linkOpened = useRef(false);
  const userScrolled = useRef(false);

  // --- gating ---
  const gateActive = useRef(true);
  const framesToClamp = useRef(6);
  const unlockedOnce = useRef(false);
  const enabledRef = useRef(enabled);

  const { camera, scene } = useThree();

  // --- flight timeline ---
  const flyStart = 0.75;
  const flyEnd = 1.0;

  // track last t-driven index so we don't spam
  const lastActiveIndex = useRef(-1);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useLayoutEffect(() => {
    const el = scroll.el;
    const prev = el.style.scrollBehavior;
    el.style.scrollBehavior = "auto";
    el.scrollTop = 0;
    el.scrollLeft = 0;
    el.style.scrollBehavior = prev || "";
  }, [scroll]);

  useEffect(() => {
    const el = scroll.el;
    const block = (e) => {
      if (gateActive.current || !enabledRef.current) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      userScrolled.current = true;
      return true;
    };
    el.addEventListener("wheel", block, { passive: false });
    el.addEventListener("touchmove", block, { passive: false });

    const id = setTimeout(() => {
      gateActive.current = false;
    }, gateMs);

    return () => {
      clearTimeout(id);
      el.removeEventListener("wheel", block);
      el.removeEventListener("touchmove", block);
    };
  }, [scroll, gateMs]);

  // keep scroll locked a few frames after unlock
  useFrame(() => {
    const locked = gateActive.current || !enabledRef.current;
    if (!unlockedOnce.current) {
      if (locked) {
        if (scroll.offset !== 0) scroll.el.scrollTo(0, 0);
        return;
      }
      if (framesToClamp.current > 0) {
        if (scroll.offset !== 0) scroll.el.scrollTo(0, 0);
        framesToClamp.current -= 1;
        return;
      }
      unlockedOnce.current = true;
    }
  });

  // ---------- MASTER TICK ----------
  useFrame(() => {
    const t = scroll.offset; // 0..1
    if (setScrollValue) setScrollValue(t);

    console.log("scroll t:", t.toFixed(3));

    // === t-driven active index ===
    const count = phraseRefs.length || 1;
    const tStart = 0;
    const tEnd = 0.7;
    const tt = THREE.MathUtils.clamp(
      (t - tStart) / (tEnd - tStart),
      0,
      0.999999
    );
    const idx = Math.floor(tt * count);

    if (onActiveIndex && idx !== lastActiveIndex.current) {
      lastActiveIndex.current = idx;
      onActiveIndex(idx);
      console.log(`[t→active] t=${t.toFixed(3)} -> #${idx}`);
    }

    // --- bird Z distance ---
    const flyZ = -5;

    // --- phrase placement: simple ring that spins with t ---
    const center = new THREE.Vector3(0, 0, 0);
    const spiralRadius = 35;
    const spiralTurns = 0.6;
    const cutoff = 0.7;
    const normalized = Math.min(t / cutoff, 1);
    const globalSpin = -normalized * Math.PI * 2.0;

    // logo orbit
    if (logo?.current) {
      const logoRadius = 30;
      const baseAngle = t * Math.PI * 2 + Math.PI;
      const lx = center.x + logoRadius * Math.sin(baseAngle);
      const lz = center.z + logoRadius * Math.cos(baseAngle);
      logo.current.visible = true;
      logo.current.position.set(lx, center.y, lz);
      logo.current.lookAt(camera.position);
    }

    // place phrases
    const N = phraseRefs.length || 1;
    const angleStep = (spiralTurns * Math.PI * 2) / Math.max(N - 1, 1);
    phraseRefs.forEach((ref, i) => {
      const node = ref?.current;
      if (!node) return;
      const a = i * angleStep + globalSpin;
      const x = center.x + spiralRadius * Math.cos(a);
      const z = center.z + spiralRadius * Math.sin(a);
      node.position.set(x, 0, z);
      node.lookAt(camera.position);
      node.visible = true;
    });

    // ===== PRE-FLIGHT / FOLLOW =====
    const flyProgress = THREE.MathUtils.clamp(
      (t - flyStart) / (flyEnd - flyStart),
      0,
      1
    );
    const smooth = (x) => x * x * (3 - 2 * x);
    const easedFly = smooth(flyProgress);

    const baseY = -6;
    const spiralPitch = 10;
    const flyX = THREE.MathUtils.lerp(0, -10, easedFly);
    const flyY = THREE.MathUtils.lerp(
      2,
      baseY + (N - 1) * spiralPitch + 6,
      easedFly
    );

    if (hummingbird?.current) {
      const idle = Math.sin(t * Math.PI * 2) * 0.3;
      const x = t < flyStart ? -2 + idle : flyX;
      const y = t < flyStart ? 2 + idle : flyY;
      hummingbird.current.position.set(x + 2, y, flyZ);
      hummingbird.current.rotation.y = t * Math.PI; // continuous spin
    }

    // background gradient
    const bgColor = new THREE.Color();
    const pink = new THREE.Color("#ff9cf7");
    const black = new THREE.Color("#000000");
    const bkbk = THREE.MathUtils.smoothstep(t, 0.8, 1);
    bgColor.lerpColors(black, pink, bkbk);
    scene.background = bgColor;

    // camera follow
    const targetY = flyY;
    const targetZ = -t * 10;
    const targetPos = new THREE.Vector3(0, targetY, targetZ);
    camera.position.lerp(targetPos, 0.02);
    if (hummingbird?.current) camera.lookAt(hummingbird.current.position);

    // auto-open at the end
    if (t >= 0.99 && userScrolled.current && !linkOpened.current) {
      linkOpened.current = true;
      window.location.href = "https://colibrity.com/contact/";
    }
  });

  // ---------- ONE-TIME SETUP ----------
  useEffect(() => {
    if (hummingbird?.current) {
      hummingbird.current.position.set(0, 0, -5);
      hummingbird.current.scale.set(1, 1, 1);
    }
    if (logo?.current) logo.current.visible = true;
  }, [hummingbird]);

  // initial camera placement
  useEffect(() => {
    if (hummingbird?.current) {
      const pos = new THREE.Vector3();
      hummingbird.current.getWorldPosition(pos);
      camera.position.set(pos.x, pos.y - 2, pos.z + 6);
      camera.lookAt(pos);
    }
  }, []);

  return null;
}
