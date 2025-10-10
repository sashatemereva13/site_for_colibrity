import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";
import { extend } from "@react-three/fiber";

const NoiseMaterial = shaderMaterial(
  { time: 0 },
  // vertex
  `varying vec2 vUv;
   void main() {
     vUv = uv;
     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
   }`,
  // fragment
  `uniform float time;
   varying vec2 vUv;

   // random hash
   float random(vec2 st) {
     return fract(sin(dot(st.xy,
                          vec2(12.9898,78.233)))
                  * 43758.5453123);
   }

   void main() {
     float noise = random(vUv * time * 50.0); // animate the seed
     gl_FragColor = vec4(vec3(noise), 1.0);
   }`
);

extend({ NoiseMaterial });
