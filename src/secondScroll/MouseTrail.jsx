import { useThree, useFrame } from "@react-three/fiber";
import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";

export default function MouseTrail({ trailMap }) {
  const { gl } = useThree();

  const scene = useMemo(() => new THREE.Scene(), []);
  const camera = useMemo(
    () => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
    []
  );

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      uniforms: {
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uRadius: { value: 0.06 },
        uSoftness: { value: 0.4 },
        uBiasPx: { value: new THREE.Vector2(0, 0) }, // px nudge
        uResolution: { value: new THREE.Vector2(1, 1) }, // device px
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec2  uMouse;
        uniform float uRadius;
        uniform float uSoftness;
        uniform vec2  uBiasPx;      // pixels
        uniform vec2  uResolution;  // device pixels
        varying vec2  vUv;

        void main() {
          // convert pixel bias to UV and apply
          vec2 mouseUV = uMouse + (uBiasPx / uResolution);

          float d  = distance(vUv, mouseUV);
          float r0 = uRadius * (1.0 - uSoftness);
          float r1 = uRadius;

          float ring = 1.0 - smoothstep(r0, r1, d);
          gl_FragColor = vec4(vec3(ring), ring);
        }
      `,
    });
  }, []);

  const quad = useMemo(
    () => new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material),
    [material]
  );

  useEffect(() => {
    scene.add(quad);
    return () => {
      scene.remove(quad);
      quad.geometry.dispose();
      material.dispose();
    };
  }, [scene, quad, material]);

  const mouseUV = useRef(new THREE.Vector2(0.5, 0.5));

  // Track mouse (-1..1) -> UV (0..1)
  useFrame(({ mouse }) => {
    mouseUV.current.set((mouse.x + 1) * 0.5, (mouse.y + 1) * 0.5);
    material.uniforms.uMouse.value.copy(mouseUV.current);

    // keep resolution in device pixels so px bias is accurate
    gl.getDrawingBufferSize(material.uniforms.uResolution.value);

    // nudge (px). try big values first to confirm movement
    material.uniforms.uBiasPx.value.set(8, -12);
  });

  // Paint into the render target
  useFrame(() => {
    gl.setRenderTarget(trailMap);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(true, true, true);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
  });

  return null;
}
