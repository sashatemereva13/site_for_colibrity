// src/effects/Snowfall.jsx
import * as THREE from "three";
import React, { forwardRef, useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";

/* === SurfaceBurst-like shaders, plus stick attributes === */
const vert = /* glsl */ `
  attribute vec2  aOffset;    // xz in a flat area
  attribute float aY0;        // start height (0..uHeight)
  attribute float aSpeed;     // fall speed (units/sec)
  attribute float aSeed;      // random phase

  // stick state
  attribute float aStuck;     // 0 or 1
  attribute vec3  aStickPos;  // position to pin to (in points local-space)

  uniform float uTime;
  uniform vec2  uArea;        // {width, depth}
  uniform float uHeight;      // box height
  uniform float uSize;        // sprite size (px)
  uniform float uWind;        // sideways amplitude (units)
  uniform float uWindFreq;    // sideways frequency (Hz)

  varying float vAlpha;
  varying float vSeed;

  void main() {
    vSeed = aSeed;

    // time with per-particle phase
    float t = uTime + aSeed * 10.0;

    // vertical motion (wrap inside the box)
    float y = mod(aY0 - t * aSpeed, uHeight) - 0.5 * uHeight;

    // lateral drift
    float drift = sin(t * uWindFreq + aSeed * 6.2831853) * uWind;

    vec3 fallPos = vec3(aOffset.x + drift, y, aOffset.y);
    // if stuck, override with stored stick position
    vec3 pos = mix(fallPos, aStickPos, step(0.5, aStuck));

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = uSize * (300.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;

    // fade near box limits (only matters for non-stuck)
    float h = abs(y) / (0.5 * uHeight);
    vAlpha = mix(smoothstep(1.0, 0.6, h), 1.0, step(0.5, aStuck));
  }
`;

const frag = /* glsl */ `
  precision highp float;
  varying float vAlpha;
  varying float vSeed;

  uniform float uTime, uSpeed, uSaturation, uContrast, uBrightness;
  uniform bool  uMono;
  uniform float uPad; // inner padding for crisp square (SurfaceBurst style)

  float hash21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  vec3  hashRGB(vec2 p){
    float r = hash21(p + 0.13);
    float g = hash21(p * 1.37 + 7.77);
    float b = hash21(p * 1.57 + 3.31);
    return vec3(r,g,b);
  }
  vec3 applyCB(vec3 c, float con, float bri){ c=(c-0.5)*con+0.5; return c*bri; }
  vec3 toSaturated(vec3 c, float s){ float g=dot(c, vec3(0.299,0.587,0.114)); return mix(vec3(g), c, s); }

  void main(){
    vec2 uv = gl_PointCoord;
    float pad = clamp(uPad, 0.0, 0.49);
    float inSq = step(pad,uv.x)*step(pad,uv.y)*step(uv.x,1.0-pad)*step(uv.y,1.0-pad);
    float a = vAlpha * inSq;
    if (a < 0.01) discard;

    float t = floor(uTime * uSpeed);
    vec3 col = uMono
      ? vec3(hash21(vec2(vSeed, t)))
      : applyCB(toSaturated(hashRGB(vec2(vSeed, t)), uSaturation), uContrast, uBrightness);

    gl_FragColor = vec4(col, a);
  }
`;

const Snowfall = forwardRef(function Snowfall(
  {
    // snow box / motion
    count = 1500,
    area = [10, 10], // width (x), depth (z)
    height = 8, // vertical span
    speed = [0.6, 1.4], // fall speed range
    wind = 0.4,
    windFreq = 0.6,

    // SurfaceBurst look
    size = 2.0,
    mono = false,
    saturation = 0.3,
    contrast = 0.6,
    brightness = 1.0,
    colorSpeed = 3.0,
    pad = 0.08,
    additive = false,

    // sticking
    stickTargets = [], // array of Mesh/Group refs or objects
    stickOffset = 0.003, // offset along hit normal (meters)
    maxTestsPerFrame = 200, // how many flakes to raycast per frame
    enableStick = true, // master switch
    debug = false,

    frustumCulled = false,
    transparent = true,
    depthWrite = false,
    blending,
    ...rest
  },
  ref
) {
  const tRef = useRef(0);
  const prevTRef = useRef(0);
  const scanIndexRef = useRef(0);
  const pointsRef = useRef();

  const geom = useMemo(() => new THREE.BufferGeometry(), []);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uArea: { value: new THREE.Vector2(area[0], area[1]) },
      uHeight: { value: height },
      uWind: { value: wind },
      uWindFreq: { value: windFreq },
      uSize: { value: size },
      uSpeed: { value: colorSpeed },
      uSaturation: { value: saturation },
      uContrast: { value: contrast },
      uBrightness: { value: brightness },
      uMono: { value: mono },
      uPad: { value: pad },
    }),
    []
  );

  useEffect(() => {
    uniforms.uArea.value.set(area[0], area[1]);
    uniforms.uHeight.value = height;
    uniforms.uWind.value = wind;
    uniforms.uWindFreq.value = windFreq;
    uniforms.uSize.value = size;
    uniforms.uSpeed.value = colorSpeed;
    uniforms.uSaturation.value = saturation;
    uniforms.uContrast.value = contrast;
    uniforms.uBrightness.value = brightness;
    uniforms.uMono.value = mono;
    uniforms.uPad.value = pad;
  }, [area, height, wind, windFreq, size, colorSpeed, saturation, contrast, brightness, mono, pad, uniforms]);

  // Attributes + refs we’ll need on CPU for collision
  const offsetsRef = useRef(); // Float32Array (count*2)
  const y0Ref = useRef(); // Float32Array (count)
  const speedsRef = useRef(); // Float32Array (count)
  const seedsRef = useRef(); // Float32Array (count)
  const stuckRef = useRef(); // Float32Array (count)
  const stickPosRef = useRef(); // Float32Array (count*3)

  useMemo(() => {
    const offsets = new Float32Array(count * 2);
    const y0 = new Float32Array(count);
    const speeds = new Float32Array(count);
    const seeds = new Float32Array(count);
    const stuck = new Float32Array(count); // 0/1
    const stickP = new Float32Array(count * 3); // xyz

    for (let i = 0; i < count; i++) {
      const ix = i * 2;
      offsets[ix + 0] = (Math.random() - 0.5) * area[0];
      offsets[ix + 1] = (Math.random() - 0.5) * area[1];
      y0[i] = Math.random() * height;
      speeds[i] = speed[0] + Math.random() * (speed[1] - speed[0]);
      seeds[i] = Math.random();
    }

    geom.setAttribute("aOffset", new THREE.BufferAttribute(offsets, 2));
    geom.setAttribute("aY0", new THREE.BufferAttribute(y0, 1));
    geom.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
    geom.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geom.setAttribute("aStuck", new THREE.BufferAttribute(stuck, 1));
    geom.setAttribute("aStickPos", new THREE.BufferAttribute(stickP, 3));
    geom.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(count * 3), 3)
    ); // dummy

    geom.computeBoundingSphere();

    offsetsRef.current = offsets;
    y0Ref.current = y0;
    speedsRef.current = speeds;
    seedsRef.current = seeds;
    stuckRef.current = stuck;
    stickPosRef.current = stickP;
  }, [geom, count, area, height, speed]);

  // Helper: compute current snowflake LOCAL position (same math as vertex shader)
  const tmpPos = useRef(new THREE.Vector3()).current;
  const tmpMat = useRef(new THREE.Matrix4()).current;
  const invWorld = useRef(new THREE.Matrix4()).current;
  const ray = useRef(new THREE.Raycaster()).current;

  function sampleLocalPos(i, t) {
    const offsets = offsetsRef.current;
    const y0 = y0Ref.current;
    const speeds = speedsRef.current;
    const seeds = seedsRef.current;

    const ox = offsets[i * 2 + 0];
    const oz = offsets[i * 2 + 1];
    const aY0 = y0[i];
    const aSpeed = speeds[i];
    const aSeed = seeds[i];

    const y =
      ((((aY0 - t * aSpeed) % height) + height) % height) - 0.5 * height;
    const drift =
      Math.sin((t + aSeed * 10.0) * windFreq + aSeed * 6.2831853) * wind;
    tmpPos.set(ox + drift, y, oz);
    return tmpPos; // NOTE: reused vector
  }

  // Animate + (optionally) stick
  useFrame((state, delta) => {
    tRef.current += delta;
    uniforms.uTime.value = tRef.current;
    state.invalidate();

    if (!enableStick || !pointsRef.current || stickTargets.length === 0) {
      prevTRef.current = tRef.current;
      return;
    }

    // Prepare transforms
    pointsRef.current.updateMatrixWorld(true);
    invWorld.copy(pointsRef.current.matrixWorld).invert();

    // Build the list of actual THREE.Object3D to raycast against
    const targets = stickTargets
      .map((o) => ("current" in (o || {}) ? o.current : o))
      .filter(Boolean);

    // Optional: speed up large, static meshes by enabling three-mesh-bvh (outside this snippet)
    // for (const m of targets) if (m.geometry?.boundsTree === undefined) {
    //   m.geometry?.computeBoundsTree?.(); m.raycast = acceleratedRaycast;
    // }

    const stuck = stuckRef.current;
    const stickP = stickPosRef.current;

    // How many flakes to test this frame (round-robin)
    const tests = Math.min(maxTestsPerFrame, count);
    const t1 = tRef.current;
    const t0 = prevTRef.current;
    const dt = Math.max(1e-4, t1 - t0);

    for (let k = 0; k < tests; k++) {
      const i = (scanIndexRef.current + k) % count;
      if (stuck[i] > 0.5) continue; // already stuck

      // world positions (prev -> curr)
      const p0Local = sampleLocalPos(i, t0).clone();
      const p1Local = sampleLocalPos(i, t1).clone();

      const p0World = p0Local
        .clone()
        .applyMatrix4(pointsRef.current.matrixWorld);
      const p1World = p1Local
        .clone()
        .applyMatrix4(pointsRef.current.matrixWorld);

      const dir = p1World.clone().sub(p0World);
      const dist = dir.length();
      if (dist < 1e-5) continue;
      dir.multiplyScalar(1.0 / dist);

      ray.set(p0World, dir);
      ray.near = 0;
      ray.far = dist + 1e-4;

      const hits = ray.intersectObjects(targets, true);
      if (hits.length) {
        const hit = hits[0];
        // world-space hit point + small normal offset
        const nWorld = hit.face?.normal
          ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
          : new THREE.Vector3(0, 1, 0);
        const pWorld = hit.point.clone().addScaledVector(nWorld, stickOffset);

        // convert to points local-space for aStickPos
        const pLocal = pWorld.clone().applyMatrix4(invWorld);

        const j = i * 3;
        stickP[j + 0] = pLocal.x;
        stickP[j + 1] = pLocal.y;
        stickP[j + 2] = pLocal.z;
        stuck[i] = 1.0;

        if (debug) {
          console.log(
            "[Snow stick] flake",
            i,
            "->",
            hit.object.name || hit.object.type
          );
        }
      }
    }

    // advance scan window
    scanIndexRef.current = (scanIndexRef.current + tests) % count;

    // mark attributes dirty if anything changed
    geom.getAttribute("aStuck").needsUpdate = true;
    geom.getAttribute("aStickPos").needsUpdate = true;

    prevTRef.current = tRef.current;
  });

  return (
    <points
      ref={(n) => {
        pointsRef.current = n;
        if (typeof ref === "function") ref(n);
        else if (ref) ref.current = n;
      }}
      frustumCulled={frustumCulled}
      {...rest}
    >
      <bufferGeometry attach="geometry" {...geom} />
      <shaderMaterial
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent={transparent}
        depthWrite={depthWrite}
        blending={
          blending ?? (additive ? THREE.AdditiveBlending : THREE.NormalBlending)
        }
        toneMapped={false}
        alphaTest={0.01}
      />
    </points>
  );
});

export default Snowfall;
