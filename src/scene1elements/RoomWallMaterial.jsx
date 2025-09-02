// src/scene1elements/RoomWallMaterial.jsx
import * as THREE from "three";
import { useMemo } from "react";
import { useThree } from "@react-three/fiber";

export default function RoomWallMaterial({
  height = 15,
  radius = 20,

  // band controls (horizontal “rainbow” arcs)
  bandCount = 8, // number of stripes
  bandThickness = 0.5, // thickness in world units
  bandEase = 0.85, // 0..1 (closer to 1 = more bands near the top)
  bandGlow = 2.1,

  // glossy “floor-like” feel
  shininess = 8.0,
  specStrength = 0.6,
  fresnelStrength = 0.35,

  // colors aligned with your floor palette
  bg = "#D14D7E", // base wall tint
  colLow = "#ef9fce", // band tint near floor
  colHigh = "#C06C9F", // band tint near ceiling

  baseAlpha = 0.5,
  glowAlpha = 0.8,

  side = THREE.BackSide, // see from inside; set DoubleSide to view from above too
  bandAngleDeg = 0, // degrees: 0 = horizontal, 90 = vertical
}) {
  const { camera } = useThree();
  const bandAngleRad = THREE.MathUtils.degToRad(bandAngleDeg);

  const uniforms = useMemo(
    () => ({
      uHeight: { value: height },
      uRadius: { value: radius },

      uBg: { value: new THREE.Color(bg) },
      uColLow: { value: new THREE.Color(colLow) },
      uColHigh: { value: new THREE.Color(colHigh) },

      uBandCount: { value: bandCount },
      uBandThickness: { value: bandThickness },
      uBandEase: { value: bandEase },
      uBandGlow: { value: bandGlow },

      uBaseAlpha: { value: baseAlpha },
      uGlowAlpha: { value: glowAlpha },

      uCamPos: { value: camera.position.clone() },
      uLightDir: { value: new THREE.Vector3(0.3, 1.0, 0.2).normalize() },
      uShininess: { value: shininess },
      uSpecStrength: { value: specStrength },
      uFresnelStrength: { value: fresnelStrength },

      uBandAngle: { value: bandAngleRad },
    }),
    [
      height,
      radius,
      bg,
      colLow,
      colHigh,
      bandCount,
      bandThickness,
      bandEase,
      bandGlow,
      baseAlpha,
      glowAlpha,
      shininess,
      specStrength,
      fresnelStrength,
      bandAngleRad,
    ]
  );

  // keep camera position live
  uniforms.uCamPos.value.copy(camera.position);

  const vertexShader = /* glsl */ `
    varying vec3 vWorldPos;
    varying vec3 vNormalW;
    void main(){
      vec4 wp = modelMatrix * vec4(position,1.0);
      vWorldPos = wp.xyz;
      vNormalW = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `;

  const fragmentShader = /* glsl */ `
    precision highp float;
    varying vec3 vWorldPos;
    varying vec3 vNormalW;

    uniform float uHeight, uRadius;
    uniform vec3 uBg, uColLow, uColHigh;

    uniform float uBandCount;
    uniform float uBandThickness;
    uniform float uBandEase;
    uniform float uBandGlow;

    uniform float uBaseAlpha, uGlowAlpha;

    uniform vec3 uCamPos, uLightDir;
    uniform float uShininess, uSpecStrength, uFresnelStrength;

      uniform float uBandAngle;

    float gauss(float x, float s){ return exp(- (x*x) / (2.0*s*s)); }
    float fresnelSchlick(float cosTheta, float F0){
      return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
    }

    void main(){
            // cylindrical coords
      float angle = atan(vWorldPos.z, vWorldPos.x);      // -PI..PI
      float u = (angle + 3.141592653589793) / (6.283185307179586); // 0..1 around
      float v = clamp(vWorldPos.y / max(uHeight,1e-4), 0.0, 1.0);  // 0..1 up

      // --- Rotate the stripe direction in (u,v) space ---
      // Treat u and v as 2D coords; rotate so stripes follow vRot.
      float cs = cos(uBandAngle);
      float sn = sin(uBandAngle);
      // Keep both axes comparable (both normalized 0..1):
      float vRot = clamp(v * cs + u * sn, 0.0, 1.0);

      // base color
      vec3 baseCol = uBg;

      // accumulate bands using vRot instead of v
      vec3 bandCol = vec3(0.0);
      float bandA  = 0.0;

      for(int i=0; i<32; i++){
        if(float(i) >= uBandCount) break;
        float t = (float(i)+1.0)/(uBandCount+1.0); // centers 0..1
        t = pow(t, mix(1.0, 0.4, clamp(uBandEase,0.0,1.0))); // arc-like spacing

        float th = uBandThickness / max(uHeight, 1e-4); // thickness normalized
        float d  = abs(vRot - t);
        float g  = gauss(d, th);                         // halo
        float line = smoothstep(th*0.7, th*0.2, d);      // core

        vec3 c = mix(uColLow, uColHigh, t);
        bandCol += c * (line + g * uBandGlow);
        bandA    = max(bandA, max(line, g * uGlowAlpha));
      }

      // cheap glossy lighting
      vec3 N = normalize(vNormalW) * (gl_FrontFacing ? 1.0 : -1.0);
      vec3 V = normalize(uCamPos - vWorldPos);
      vec3 L = normalize(uLightDir);
      vec3 H = normalize(L + V);

      float spec = pow(max(dot(N,H),0.0), max(uShininess,1.0)) * uSpecStrength;
      float F = fresnelSchlick(max(dot(N,V),0.0), uFresnelStrength);

      float brightMask = clamp(bandA, 0.0, 1.0);
      vec3 color = mix(baseCol, bandCol, bandA);
      color += spec * (0.5 + 0.5 * brightMask);
      color += F    * 0.08 * (0.5 + 0.5 * brightMask);

      float alpha = max(uBaseAlpha, bandA);
      gl_FragColor = vec4(color, alpha);
    }
  `;

  return (
    <shaderMaterial
      vertexShader={vertexShader}
      fragmentShader={fragmentShader}
      uniforms={uniforms}
      transparent
      depthWrite={false}
      side={side}
    />
  );
}
