// src/scene1elements/PortalShader.jsx
import * as THREE from "three";
import React, { useMemo, useRef, useImperativeHandle, forwardRef } from "react";
import { useFrame } from "@react-three/fiber";

const TUNE = {
  radius: 4.0,
  segments: 96,

  innerCut: 0.0,
  innerSoftness: 0.0,

  grainSize: 220.0,
  speed: 3.0,
  saturation: 0.3,
  contrast: 0.6,
  brightness: 1.0,

  edgeSoftness: 0.5,
  vignetteBoost: 0.15,

  toneMapped: false,
  blending: "normal", // "additive" or "normal"

  // NEW: stretch behavior
  extrudeMax: 10.2, // how deep the split can get (scene units)
  extrudeDecay: 1.6, // how fast the stretch relaxes back (s^-1)
  pulseDecay: 1.5, // glow decay
};

const PortalSurface = forwardRef(function PortalSurface(
  {
    position = [0, 0, 0],
    radius = TUNE.radius,
    segments = TUNE.segments,
    blending = TUNE.blending, // "normal" | "additive"
  },
  ref
) {
  const time = useRef(0);
  const pulseVal = useRef(0);
  const extrudeVal = useRef(0);

  // shared uniforms object; we clone it for the two materials
  const baseUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uGrain: { value: TUNE.grainSize },
      uSpeed: { value: TUNE.speed },
      uSaturation: { value: TUNE.saturation },
      uContrast: { value: TUNE.contrast },
      uBrightness: { value: TUNE.brightness },
      uEdgeSoft: { value: TUNE.edgeSoftness },
      uVignette: { value: TUNE.vignetteBoost },
      uRadius: { value: radius },
      uInner: { value: TUNE.innerCut },
      uInnerSoft: { value: TUNE.innerSoftness },
      uPulse: { value: 0.0 }, // glow pulse
      uExtrude: { value: 0.0 }, // depth split magnitude
      uDir: { value: 1.0 }, // +1 for front, -1 for back
      uOpacity: { value: 1.0 },
    }),
    [radius]
  );

  // two *separate* material refs (they share shader code but not uniforms)
  const frontMat = useRef();
  const backMat = useRef();

  useImperativeHandle(
    ref,
    () => ({
      // one call to animate both brightness+glow and z-stretch
      pulse: (amp = 1.0) => {
        pulseVal.current = Math.min(2.0, pulseVal.current + amp);
        // convert amp (≈0–2) into world-space stretch with a cap
        const add = amp * (TUNE.extrudeMax * 0.6);
        extrudeVal.current = Math.min(
          TUNE.extrudeMax,
          extrudeVal.current + add
        );
      },
      // if you want to drive only stretch:
      stretch: (depth = 0.8) => {
        extrudeVal.current = Math.min(
          TUNE.extrudeMax,
          extrudeVal.current + depth
        );
      },
    }),
    []
  );

  useFrame((_, dt) => {
    time.current += dt;

    // decay
    pulseVal.current = Math.max(0, pulseVal.current - dt * TUNE.pulseDecay);
    extrudeVal.current = Math.max(
      0,
      extrudeVal.current - dt * TUNE.extrudeDecay
    );

    const t = time.current;

    const update = (mat, dir) => {
      if (!mat) return;
      const u = mat.uniforms;
      u.uTime.value = t;
      u.uPulse.value = pulseVal.current;
      u.uExtrude.value = extrudeVal.current;
      u.uDir.value = dir;
    };

    update(frontMat.current, +1.0);
    update(backMat.current, -1.0);
  });

  const vertexShader = /* glsl */ `
    varying vec2 vUv;
    varying vec2 vPos; // local XY

    uniform float uRadius;
    uniform float uExtrude; // magnitude
    uniform float uDir;     // +1 (front) / -1 (back)

    // mapped falloff: 0 at center -> 1 near rim
    float rimFalloff(vec2 pos, float radius){
      float r = length(pos);
      float f = smoothstep(0.0, radius, r);
      // emphasize rim a bit
      return pow(f, 0.65);
    }

    void main() {
      vUv = uv;
      vPos = position.xy;

      // base position
      vec3 pos = position;

      // stretch along local Z with rim falloff
      float k = rimFalloff(vPos, uRadius);
      pos.z += uExtrude * uDir * k;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = /* glsl */ `
    precision highp float;

    varying vec2 vUv;
    varying vec2 vPos;

    uniform float uTime;
    uniform float uGrain;
    uniform float uSpeed;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uBrightness;
    uniform float uEdgeSoft;
    uniform float uVignette;
    uniform float uRadius;
    uniform float uInner;
    uniform float uInnerSoft;
    uniform float uPulse;
    uniform float uOpacity;

    float hash21(vec2 p){
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    vec3 hashRGB(vec2 p){
      float r = hash21(p + 0.13);
      float g = hash21(p * 1.37 + 7.77);
      float b = hash21(p * 1.57 + 3.31);
      return vec3(r, g, b);
    }
    vec3 applyCB(vec3 c, float contrast, float brightness){
      c = (c - 0.5) * contrast + 0.5;
      return c * brightness;
    }
    vec3 toSaturated(vec3 c, float sat){
      float g = dot(c, vec3(0.299, 0.587, 0.114));
      return mix(vec3(g), c, sat);
    }

    void main(){
      float r = length(vPos);

      // Outer rim feather
      float expand = 0.12 * uPulse;
      float outer0 = uRadius * max(0.0, 1.0 - uEdgeSoft) + expand;
      float outer1 = uRadius + expand;
      float outerEdge = smoothstep(outer0, outer1, r);
      float outerMask = 1.0 - outerEdge;

      // Optional inner cut
      float innerMask = 1.0;
      if (uInner > 0.0) {
        float inner0 = max(0.0, uInner);
        float inner1 = inner0 * (1.0 + clamp(uInnerSoft, 0.0, 0.5));
        innerMask = smoothstep(inner0, inner1, r);
      }

      float alpha = outerMask * innerMask;
      if (alpha <= 0.001) discard;

      // Grain cells + flicker
      vec2 grid = vUv * uGrain;
      float t = floor(uTime * uSpeed);
      grid += vec2(t * 17.0, t * 9.0);
      vec3 col = hashRGB(floor(grid));

      // Inner lift + pulse glow
      float vign = 1.0 - smoothstep(0.0, uRadius + expand, r);
      col += (uVignette + 0.6 * uPulse) * vign;

      col = toSaturated(col, uSaturation);
      col = applyCB(col, uContrast, uBrightness);

      gl_FragColor = vec4(col, alpha * (1.0 + 0.35 * uPulse) * uOpacity);
    }
  `;

  const blendingMode =
    blending === "normal" ? THREE.NormalBlending : THREE.AdditiveBlending;

  // One shared geometry for both layers
  const geo = useMemo(
    () => new THREE.CircleGeometry(radius, segments),
    [radius, segments]
  );

  return (
    <group position={position} frustumCulled={false}>
      {/* FRONT LAYER (+Z) */}
      <mesh geometry={geo} rotation={[0, 0, 0]} frustumCulled={false}>
        <shaderMaterial
          ref={frontMat}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={THREE.UniformsUtils.clone(baseUniforms)}
          transparent
          depthWrite={true} // makes things behind itself
          depthTest
          side={THREE.FrontSide}
          blending={blendingMode}
          toneMapped={TUNE.toneMapped}
        />
      </mesh>

      {/* BACK LAYER (–Z) */}
      <mesh geometry={geo} rotation={[0, 0, 0]} frustumCulled={false}>
        <shaderMaterial
          ref={backMat}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={THREE.UniformsUtils.clone(baseUniforms)}
          transparent
          depthWrite={false}
          depthTest
          side={THREE.BackSide}
          blending={blendingMode}
          toneMapped={TUNE.toneMapped}
        />
      </mesh>
    </group>
  );
});

export default PortalSurface;
