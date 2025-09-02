// FloorShader.jsx
import * as THREE from "three";
import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { useCubeTexture } from "@react-three/drei";

export default function GlossyGridFloor({
  radius = 100,
  cellSize = 2,
  lineWidth = 0.05,
  glowStrength = 2,

  // Gloss controls
  shininess = 10.0, // higher = tighter highlight
  specStrength = 0.65, // specular intensity
  fresnelStrength = 0.35, // 0..1 (gloss at grazing angles)
  envStrength = 0.35, // mix amount for static env reflection
  lightDir = new THREE.Vector3(0.3, 1, 0.2).normalize(), // fake directional light

  // Optional static cube env; set to null to skip
  // Put 6 images in /public/env/ and pass envFolder="env" to use defaults below
  envFolder = null, // e.g. "env" (expects px.jpg, nx.jpg, py.jpg, ny.jpg, pz.jpg, nz.jpg)
  envExt = "jpg",

  // Colors
  bg = "#9e6f81",
  col1 = "#f1c1dd",
  col2 = "#f1c1dd",
  glowCol = "#f9afdb",

  // Transparency so the gloss reads nicely
  baseAlpha = 0.18,
  glowAlpha = 0.6,
}) {
  const { camera } = useThree();

  // Optional cube env (static)
  const envMap = envFolder
    ? useCubeTexture(
        ["px", "nx", "py", "ny", "pz", "nz"].map((f) => `${f}.${envExt}`),
        { path: `/${envFolder}/` }
      )
    : null;
  if (envMap) {
    envMap.colorSpace = THREE.SRGBColorSpace;
  }

  const uniforms = useMemo(
    () => ({
      uBg: { value: new THREE.Color(bg) },
      uCol1: { value: new THREE.Color(col1) },
      uCol2: { value: new THREE.Color(col2) },
      uGlow: { value: new THREE.Color(glowCol) },
      uCell: { value: cellSize },
      uLine: { value: lineWidth },
      uBaseAlpha: { value: baseAlpha },
      uGlowAlpha: { value: glowAlpha },

      // Gloss uniforms
      uCamPos: { value: camera.position.clone() },
      uLightDir: { value: lightDir.clone().normalize() },
      uShininess: { value: shininess },
      uSpecStrength: { value: specStrength },
      uFresnelStrength: { value: fresnelStrength },
      uEnvStrength: { value: envMap ? envStrength : 0.0 },
      uHasEnv: { value: envMap ? 1 : 0 },
      uEnvMap: { value: envMap },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      bg,
      col1,
      col2,
      glowCol,
      cellSize,
      lineWidth,
      baseAlpha,
      glowAlpha,
      shininess,
      specStrength,
      fresnelStrength,
      envStrength,
      envMap,
    ]
  );

  // Keep camera position synced (if you move the camera)
  // You can also update this from a useFrame if your camera moves a lot
  uniforms.uCamPos.value.copy(camera.position);

  const vertexShader = /* glsl */ `
    varying vec3 vWorldPos;
    varying vec3 vNormalW;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      // world normal for a flat disc (uses normalMatrix to transform)
      vNormalW = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `;

  const fragmentShader = /* glsl */ `
    precision highp float;

    varying vec3 vWorldPos;
    varying vec3 vNormalW;

    uniform vec3 uBg, uCol1, uCol2, uGlow;
    uniform float uCell, uLine, uBaseAlpha, uGlowAlpha;

    uniform vec3 uCamPos;
    uniform vec3 uLightDir;
    uniform float uShininess;
    uniform float uSpecStrength;
    uniform float uFresnelStrength;

    uniform samplerCube uEnvMap;
    uniform float uEnvStrength;
    uniform int uHasEnv;

    // ----- grid helpers -----
    float lineDist(vec2 p) {
      vec2 g = fract(p) - 0.5;
      vec2 d = abs(g);
      return min(d.x, d.y);
    }

    // Schlick Fresnel
    float fresnelSchlick(float cosTheta, float F0) {
      return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
    }

    void main() {
      // ----- grid color (your original idea) -----
      vec2 p = vWorldPos.xz / max(uCell, 1e-4);
      vec2 cell = floor(p);
      float parity = mod(cell.x + cell.y, 2.0);
      float d = lineDist(p);
      float aa = fwidth(d);
      float line = 1.0 - smoothstep(uLine - aa, uLine + aa, d);
      float glow = exp(-12.0 * d) * ${Number(glowStrength).toFixed(3)};

      vec3 baseCol = uBg;
      baseCol = mix(baseCol, uGlow, clamp(glow * 0.5, 0.0, 1.0));
      float glowA = clamp(glow * uGlowAlpha, 0.0, 0.9);

      vec3 lineColor = mix(uCol1, uCol2, parity);
      vec3 gridCol = mix(baseCol, lineColor, line);
      float lineA = line;
      float outA = max(lineA, max(glowA, uBaseAlpha));

      // ----- cheap glossy look -----
      // view & half-vector
      vec3 N = normalize(vNormalW);
      vec3 V = normalize(uCamPos - vWorldPos);
      vec3 L = normalize(uLightDir);
      vec3 H = normalize(L + V);

      // Blinn-Phong specular (tight highlight on lines/glow & base)
      float spec = pow(max(dot(N, H), 0.0), max(uShininess, 1.0)) * uSpecStrength;

      // Fresnel to increase gloss at grazing angles
      float cosTheta = max(dot(N, V), 0.0);
      float F = fresnelSchlick(cosTheta, uFresnelStrength);

      // Optional static environment reflection (very cheap)
      vec3 envCol = vec3(0.0);
      if (uHasEnv == 1) {
        vec3 R = reflect(-V, N);
        // Cube lookup (mip bias omitted for simplicity)
        envCol = textureCube(uEnvMap, R).rgb * uEnvStrength;
      } else {
        // No env? Fake a subtle horizon tint so Fresnel still feels reflective
        envCol = vec3(0.07, 0.05, 0.07) * (uEnvStrength * 0.7);
      }

      // Apply specular & env mostly to the brighter parts (lines/glow)
      // This preserves your neon look while adding gloss
      float brightMask = clamp(line * 0.85 + glow * 0.4, 0.0, 1.0);

      vec3 glossy = gridCol
                  + spec * brightMask
                  + envCol * F;

      gl_FragColor = vec4(glossy, outA);
    }
  `;

  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
      <mesh renderOrder={2}>
        <circleGeometry args={[radius, 128]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          side={THREE.DoubleSide}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
