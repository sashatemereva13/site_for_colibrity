// src/secondScroll/BackGarden.jsx
import * as THREE from "three";
import { useMemo, useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { vertexShader, fragmentShader } from "./BackGardenShader";

export default function BackGarden({
  // trailMap is the R channel mask texture from your MouseTrail FBO
  trailMap,
  opacity = 0.9, // global alpha
  tile = [7, 7], // how many repeats across the screen (x,y)
  tint = [1, 1, 1], // line tint (white by default)
  driftPx = [5, 0], // pixels/sec drift in screen space
  bands = 18.0, // density of lines per tile
  lineWidth = 0.012, // half-width of each line (0.006..0.02 works well)
  curvature = 0.75, // 0..1.5: how bendy the stripes are
  flow = 1.0, // animation speed multiplier
}) {
  const { gl, size, viewport } = useThree();
  const dpr = gl.getPixelRatio();

  // Offsets + resolution in device pixels
  const res = useRef(new THREE.Vector2(size.width * dpr, size.height * dpr));
  const offsetPx = useRef(new THREE.Vector2(0, 0));
  const start = useRef(performance.now());

  // Overlay scene with a fullscreen quad
  const overlayScene = useMemo(() => new THREE.Scene(), []);
  const overlayCamera = useMemo(() => new THREE.Camera(), []);
  const quad = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending, // alpha truly blends with the 3D
      uniforms: {
        uOpacity: { value: opacity },
        uTime: { value: 0 },
        uResolution: { value: res.current.clone() },
        uTile: { value: new THREE.Vector2(tile[0], tile[1]) },
        uTint: { value: new THREE.Color().fromArray(tint) },
        uOffset: { value: offsetPx.current.clone() },
        uTrailMap: { value: trailMap ?? null },
        uLineWidth: { value: lineWidth },
        uCurvature: { value: curvature },
        uFlow: { value: flow },
        uBands: { value: bands },
      },
    });

    const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
    q.renderOrder = 9999;
    return q;
  }, []); // created once

  // Mount quad in overlay scene
  useEffect(() => {
    overlayScene.add(quad);
    return () => {
      overlayScene.remove(quad);
      quad.geometry.dispose();
      quad.material.dispose?.();
    };
  }, [overlayScene, quad]);

  // React to prop changes -> push into uniforms
  useEffect(() => {
    const u = quad.material.uniforms;
    if (!u) return;

    u.uOpacity.value = opacity;
    u.uTile.value.set(tile[0], tile[1]);
    u.uTint.value.setRGB(tint[0], tint[1], tint[2]);
    u.uLineWidth.value = lineWidth;
    u.uCurvature.value = curvature;
    u.uFlow.value = flow;
    u.uBands.value = bands;
  }, [
    opacity,
    tile,
    tint,
    lineWidth,
    curvature,
    flow,
    bands,
    quad.material.uniforms,
  ]);

  useEffect(() => {
    const u = quad.material.uniforms;
    if (u && trailMap) u.uTrailMap.value = trailMap;
  }, [trailMap, quad.material.uniforms]);

  // Keep resolution up-to-date on resize / DPR change
  useEffect(() => {
    res.current.set(size.width * dpr, size.height * dpr);
    const u = quad.material.uniforms;
    if (u) u.uResolution.value.copy(res.current);
  }, [size.width, size.height, dpr, quad.material.uniforms]);

  // Draw overlay after the main scene
  useFrame((_, delta) => {
    const u = quad.material.uniforms;
    if (!u) return;

    // time
    const t = (performance.now() - start.current) / 1000;
    u.uTime.value = t;

    // ensure current drawing buffer size (accounts for DPR)
    gl.getDrawingBufferSize(res.current);
    u.uResolution.value.copy(res.current);

    // pixel-space drift (wrap to keep values bounded)
    offsetPx.current.x =
      (offsetPx.current.x + driftPx[0] * delta) % res.current.x;
    offsetPx.current.y =
      (offsetPx.current.y + driftPx[1] * delta) % res.current.y;
    u.uOffset.value.copy(offsetPx.current);

    // render overlay without clearing color and without depth
    const prevRT = gl.getRenderTarget();
    const prevAuto = gl.autoClear;
    const prevDepthTest = gl.state.buffers.depth.test;
    const prevDepthWrite = gl.state.buffers.depth.mask;

    gl.setRenderTarget(null); // default framebuffer
    gl.autoClear = false; // do not clear color
    gl.clearDepth(); // safe to reset depth only
    gl.state.buffers.depth.setTest(false);
    gl.state.buffers.depth.setMask(false);
    gl.render(overlayScene, overlayCamera);

    // restore
    gl.state.buffers.depth.setMask(prevDepthWrite);
    gl.state.buffers.depth.setTest(prevDepthTest);
    gl.autoClear = prevAuto;
    gl.setRenderTarget(prevRT);
  }, 2); // run after the main scene

  return null;
}
