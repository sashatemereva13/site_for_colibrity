import * as THREE from "three";
import { useMemo } from "react";

function WallMaterial({
  zStart = 120,
  zEnd = 0,
  numLines = 20,
  thickness = 1.95,
  base = "#730F2E",
  lineCol1 = "#ffe5f4", // bright at start
  lineCol2 = "#b57089", // darker toward end
}) {
  const uniforms = useMemo(
    () => ({
      uBase: { value: new THREE.Color(base) },
      uLineCol1: { value: new THREE.Color(lineCol1) },
      uLineCol2: { value: new THREE.Color(lineCol2) },
      uZStart: { value: zStart },
      uZEnd: { value: zEnd },
      uNumLines: { value: numLines },
      uThickness: { value: thickness },
    }),
    [base, lineCol1, lineCol2, zStart, zEnd, numLines, thickness]
  );

  const vertexShader = /* glsl */ `
    varying vec3 vWorldPos;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `;

  const fragmentShader = /* glsl */ `
    precision highp float;
    varying vec3 vWorldPos;

    uniform vec3 uBase;
    uniform vec3 uLineCol1;
    uniform vec3 uLineCol2;
    uniform float uZStart;
    uniform float uZEnd;
    uniform float uNumLines;
    uniform float uThickness;

    float bandGlow(float a, float b, float t) {
      return exp(-pow((a - b) / t, 2.0));
    }

    void main() {
      vec3 col = uBase;

      float axisZ = vWorldPos.z;
      float lenZ = uZEnd - uZStart;

      for (int i = 0; i < 64; i++) {
        if (float(i) >= uNumLines) break;

        float frac = (float(i) + 1.0) / (uNumLines + 1.0);
        float lineZ = mix(uZStart, uZEnd, frac);

        float g = bandGlow(axisZ, lineZ, uThickness);

        // Fade color from bright (lineCol1) to dark (lineCol2)
        vec3 lineColor = mix(uLineCol1, uLineCol2, frac);

        col += lineColor * g * 2.0;
      }

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  return (
    <shaderMaterial
      side={THREE.BackSide}
      vertexShader={vertexShader}
      fragmentShader={fragmentShader}
      uniforms={uniforms}
    />
  );
}

export default WallMaterial;
