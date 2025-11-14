// components/SparkleMaterial.js
import * as THREE from "three";

export const SparkleMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uSize: { value: 300.0 },
    uColor: { value: new THREE.Color("#FFD6FF") },
    uScroll: { value: 0 },
    uMouse: { value: new THREE.Vector2() },
  },
  vertexShader: /* glsl */ `
    uniform float uSize;
    uniform float uTime;
    uniform vec2 uMouse;

    attribute float size;
    varying float vAlpha;

    void main() {
      vec3 p = position;
      p.x += uMouse.x * 1.5 * sin(position.y * 0.5 + uTime);
      p.y += uMouse.y * 1.5 * cos(position.x * 0.5 + uTime);

      vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
      float distToCam = -mvPosition.z;
      gl_PointSize = size * uSize / distToCam;

      vAlpha = smoothstep(5.0, 150.0, gl_PointSize);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    varying float vAlpha;

    void main() {
      float d = distance(gl_PointCoord, vec2(0.5));
      float circleAlpha = smoothstep(0.5, 0.1, d);
      gl_FragColor = vec4(uColor, circleAlpha * vAlpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
