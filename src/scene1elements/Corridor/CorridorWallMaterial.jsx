// src/scene1elements/WallLinesMaterial.jsx
import * as THREE from "three";
import { useMemo } from "react";

function WallMaterial({ height = 10, radius = 12 }) {
  const uniforms = useMemo(
    () => ({
      uBase: { value: new THREE.Color("#d7d5d6") },
      uLineCol1: { value: new THREE.Color("#915d70") },
      uLineCol2: { value: new THREE.Color("#8c4b63") },
      uHeight: { value: height },
      uRadius: { value: radius },
      uNumLines: { value: 5 }, // how many lines
      uThickness: { value: 0.08 }, // line width
    }),
    [height, radius]
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
    uniform float uHeight;
uniform float uNumLines;
uniform float uThickness;

float bandGlow(float y, float lineY, float thickness) {
  return exp(-pow((y - lineY) / thickness, 2.0));
}

void main() {
  vec3 col = uBase;

  // Loop over lines
  for (int i = 0; i < 20; i++) {   // max 20 possible
    if (float(i) >= uNumLines) break;

    // Fractional height for this line
    float frac = (float(i) + 1.0) / (uNumLines + 1.0);
    float lineY = frac * uHeight;

    // Glow
    float g = bandGlow(vWorldPos.y, lineY, uThickness);

    // Alternate colors: violet/orange/violet/...
    vec3 lineColor = mix(uLineCol1, uLineCol2, mod(float(i), 2.0));
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
