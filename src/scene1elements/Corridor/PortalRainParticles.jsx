// src/effects/PortalRainParticles.jsx
import * as THREE from "three";
import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";

/**
 * Particles that fall straight down along world Y (like rain).
 * Place this in your scene at the portal position.
 */
export default function PortalRainParticles({
  count = 1500,
  radius = 3, // spawn radius (disk in XZ)
  height = 10.0, // how high above origin they spawn
  fallSpeed = 1.2, // units/sec downward
  drift = 0.15, // horizontal wobble
  size = 3.0, // point size in pixels
  color = "#ffffff",
  additive = false, // true = glowing particles
  debug = false, // if true: disables depthTest and makes them large & bright
}) {
  const pointsRef = useRef();

  // base positions: disk in XZ, Y in [0..height]
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const base = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const r = radius * Math.sqrt(u);
      const th = 2 * Math.PI * v;

      const x = r * Math.cos(th);
      const z = r * Math.sin(th);
      const y = Math.random() * height; // start height above origin

      base[3 * i + 0] = x;
      base[3 * i + 1] = y;
      base[3 * i + 2] = z;
      seed[i] = Math.random() * 1000.0;
    }
    g.setAttribute("base", new THREE.BufferAttribute(base, 3));
    g.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
    return g;
  }, [count, radius, height]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHeight: { value: height },
      uFall: { value: fallSpeed },
      uDrift: { value: drift },
      uSize: { value: debug ? 20.0 : size },
      uColor: { value: new THREE.Color(debug ? "#ff00ff" : color) },
    }),
    [height, fallSpeed, drift, size, color, debug]
  );

  const vert = /* glsl */ `
    attribute vec3 base;
    attribute float seed;
    uniform float uTime, uHeight, uFall, uDrift, uSize;
    varying float vLife;

    void main() {
      float t = uTime + seed;
      float speed = max(0.05, uFall);

      // looping progress 0..1
      float prog = fract((t * speed) / max(0.0001, uHeight));

      // fall downward in world Y: from +height -> 0
      float y = (1.0 - prog) * uHeight;

      vec3 pos = base;
      pos.x += sin(seed + t) * uDrift;
      pos.z += cos(seed * 1.3 + t) * uDrift * 0.8;
      pos.y = y;

      // fade in/out
      vLife = smoothstep(0.0, 0.08, prog) * smoothstep(0.0, 0.15, 1.0 - prog);

      vec4 mv = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = uSize * (300.0 / -mv.z);
      gl_Position = projectionMatrix * mv;
    }
  `;

  const frag = /* glsl */ `
    precision highp float;
    uniform vec3 uColor;
    varying float vLife;
    void main() {
      vec2 p = gl_PointCoord - 0.5;
      float r2 = dot(p, p);
      float soft = smoothstep(0.25, 0.0, r2);
      float alpha = soft * vLife;
      if (alpha < 0.003) discard;
      gl_FragColor = vec4(uColor, alpha);
    }
  `;

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        depthTest: debug ? false : true,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      }),
    [uniforms, additive, debug]
  );

  useFrame((_, dt) => {
    uniforms.uTime.value += dt;
  });

  // optional: log some base positions
  useEffect(() => {
    const attr = geom.getAttribute("base");
    for (let i = 0; i < Math.min(5, attr.count); i++) {
      console.log("Particle base", i, [
        attr.getX(i),
        attr.getY(i),
        attr.getZ(i),
      ]);
    }
  }, [geom]);

  return (
    <points
      ref={pointsRef}
      geometry={geom}
      material={material}
      frustumCulled={false}
    />
  );
}
