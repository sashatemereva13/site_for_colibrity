// ShiningRing.jsx
import * as THREE from "three";
import { useMemo } from "react";
import { extend, useFrame } from "@react-three/fiber";

export default function NeonRing({
  radius = 8, // ring radius (world units)
  thickness = 0.35, // ring line thickness
  glow = 1.2, // overall brightness
  softness = 0.5, // edge softness (0..1, larger = softer)
  color = "#ffdff3", // ring color
  y = 0.015, // small lift above floor to avoid z-fighting
  segments = 192, // circle tessellation
  animatePulse = false, // optional subtle pulsing
}) {
  // We use a disc that's big enough to cover the glow falloff
  const outer = radius + thickness * 3.0;

  const geom = useMemo(() => {
    const g = new THREE.CircleGeometry(outer, segments);
    g.rotateX(-Math.PI / 2); // lie flat on XZ like your floor
    return g;
  }, [outer, segments]);

  // Small custom shader for a soft ring + halo (additive blend)
  const mat = useMemo(() => {
    const uniforms = {
      uColor: { value: new THREE.Color(color) },
      uRadius: { value: radius },
      uThickness: { value: thickness },
      uSoftness: { value: Math.max(0.001, softness) },
      uGlow: { value: glow },
      uTime: { value: 0 },
      uAnimate: { value: animatePulse ? 1.0 : 0.0 },
    };

    const vertex = /* glsl */ `
      varying vec3 vPos;
      void main(){
        vPos = position.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragment = /* glsl */ `
      precision highp float;
      varying vec3 vPos;

      uniform vec3 uColor;
      uniform float uRadius;
      uniform float uThickness;
      uniform float uSoftness;
      uniform float uGlow;
      uniform float uTime;
      uniform float uAnimate;

      // Smooth band with soft outer glow
      void main() {
        // distance from center in XZ plane (local space)
        float r = length(vPos.xz);

        // Optional subtle pulse
        float pulse = (uAnimate > 0.5) ? (0.85 + 0.15 * sin(uTime * 1.6)) : 1.0;
        float target = uRadius * pulse;

        // Core ring: a soft band centered at target
        float halfT = uThickness * 0.5;
        float edge = smoothstep(halfT + uSoftness, halfT - uSoftness, abs(r - target));

        // Outer halo: fades with distance from the ring centerline
        float d = abs(r - target);
        float halo = exp(- (d * d) / max(1e-5, (uThickness * 4.0)));
        halo *= 0.6; // reduce halo strength

        float a = clamp(edge + halo, 0.0, 1.0);
        vec3 col = uColor * uGlow;

        // Additive look with built-in soft transparency
        gl_FragColor = vec4(col, a);
      }
    `;

    const m = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    return m;
  }, [color, radius, thickness, softness, glow, animatePulse]);

  // Animate pulse if enabled
  useFrame((_, dt) => {
    if (mat?.uniforms?.uTime) {
      mat.uniforms.uTime.value += dt;
    }
  });

  // Keep uniforms in sync when props change
  useMemo(() => {
    if (!mat) return;
    mat.uniforms.uColor.value.set(color);
    mat.uniforms.uRadius.value = radius;
    mat.uniforms.uThickness.value = thickness;
    mat.uniforms.uSoftness.value = Math.max(0.001, softness);
    mat.uniforms.uGlow.value = glow;
    mat.uniforms.uAnimate.value = animatePulse ? 1.0 : 0.0;
  }, [mat, color, radius, thickness, softness, glow, animatePulse]);

  return <mesh position={[0, y, 0]} geometry={geom} material={mat} />;
}
