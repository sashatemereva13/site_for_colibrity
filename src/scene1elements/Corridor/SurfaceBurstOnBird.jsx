// src/effects/SurfaceBurstOnBird_Geometry.jsx
import * as THREE from "three";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { useFrame } from "@react-three/fiber";
import { MeshSurfaceSampler } from "three-stdlib";

// --- square sprite shaders (unchanged look) ---
const vert = /* glsl */ `
  attribute float alpha;
  attribute float seed;
  varying float vAlpha;
  varying float vSeed;
  uniform float uSize;

  void main() {
    vAlpha = alpha;
    vSeed = seed;

    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const frag = /* glsl */ `
  precision highp float;
  varying float vAlpha;
  varying float vSeed;
  uniform float uTime, uSpeed, uSaturation, uContrast, uBrightness;
  uniform bool uMono;

  float hash21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  vec3 hashRGB(vec2 p){
    float r = hash21(p + 0.13);
    float g = hash21(p * 1.37 + 7.77);
    float b = hash21(p * 1.57 + 3.31);
    return vec3(r,g,b);
  }
  vec3 applyCB(vec3 c, float con, float bri){ c=(c-0.5)*con+0.5; return c*bri; }
  vec3 toSaturated(vec3 c, float s){ float g=dot(c, vec3(0.299,0.587,0.114)); return mix(vec3(g), c, s); }

  void main(){
    float pad = 0.08;
    vec2 uv = gl_PointCoord;
    float inSq = step(pad, uv.x) * step(pad, uv.y) * step(uv.x, 1.0-pad) * step(uv.y, 1.0-pad);
    float a = vAlpha * inSq;
    if (a < 0.01) discard;

    float t = floor(uTime * uSpeed);
    vec3 col = uMono ? vec3(hash21(vec2(vSeed, t)))
                     : applyCB(toSaturated(hashRGB(vec2(vSeed, t)), uSaturation), uContrast, uBrightness);

    gl_FragColor = vec4(col, a);
  }
`;

// --- util: find first mesh / skinned mesh under a ref ---
function findMesh(root) {
  let skinned = null,
    mesh = null;
  root?.traverse?.((o) => {
    if (!skinned && o.isSkinnedMesh && o.geometry) skinned = o;
    if (!mesh && o.isMesh && o.geometry) mesh = o;
  });
  return skinned || mesh;
}

// --- util: filter geometry to allowed material groups ---
function filterGeomByMaterials(mesh, allowNames = [], allowIndices = []) {
  const geom = mesh.geometry;
  const index = geom.getIndex?.();
  if (!index) return null;

  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const allowed = new Set(allowIndices);
  if (allowNames?.length) {
    mats.forEach((m, i) => {
      const name = m?.name || "";
      if (
        allowNames.some((re) => (re.test ? re.test(name) : name.includes(re)))
      ) {
        allowed.add(i);
      }
    });
  }
  if (allowed.size === 0) return null;

  const groups = geom.groups?.length
    ? geom.groups
    : [{ start: 0, count: index.count, materialIndex: 0 }];

  const src = index.array;
  const out = [];
  for (const g of groups) {
    const mi = g.materialIndex ?? 0;
    if (!allowed.has(mi)) continue;
    const start = g.start || 0;
    const end = start + (g.count || 0);
    for (let i = start; i < end; i++) out.push(src[i]);
  }
  if (!out.length) return null;

  const filtered = geom.clone();
  const SubArr = src.constructor;
  filtered.setIndex(new THREE.BufferAttribute(new SubArr(out), 1));
  filtered.clearGroups();
  filtered.addGroup(0, out.length, 0);
  return filtered;
}

const SurfaceBurstOnBird_Geometry = forwardRef(
  function SurfaceBurstOnBird_Geometry(
    {
      targetRef, // required
      count = 1600,
      size = 0.1,
      life = 1.8,
      normalPush = 0.02,
      jitter = 0.01,
      additive = false,
      mono = true,
      speed = 3.0,
      saturation = 0.3,
      contrast = 0.6,
      brightness = 1.0,
      includeMaterialsByName = [/^Material[_\.]?0*07$/i], // target the matcap area
      includeMaterialsByIndex = [],
      debug = false,
    },
    ref
  ) {
    // render object
    const pointsRef = useRef();
    const gRef = useRef(new THREE.BufferGeometry());
    const uniforms = useMemo(
      () => ({
        uSize: { value: size },
        uTime: { value: 0 },
        uSpeed: { value: speed },
        uSaturation: { value: saturation },
        uContrast: { value: contrast },
        uBrightness: { value: brightness },
        uMono: { value: mono },
      }),
      [size, speed, saturation, contrast, brightness, mono]
    );

    useEffect(() => {
      uniforms.uSize.value = size;
    }, [size]);
    useEffect(() => {
      uniforms.uMono.value = mono;
    }, [mono]);
    useEffect(() => {
      uniforms.uSpeed.value = speed;
    }, [speed]);
    useEffect(() => {
      uniforms.uSaturation.value = saturation;
    }, [saturation]);
    useEffect(() => {
      uniforms.uContrast.value = contrast;
    }, [contrast]);
    useEffect(() => {
      uniforms.uBrightness.value = brightness;
    }, [brightness]);

    // particle data buffers
    const arrays = useMemo(
      () => ({
        pos: new Float32Array(count * 3),
        alpha: new Float32Array(count),
        seed: new Float32Array(count),
      }),
      [count]
    );

    // binding data to triangles (per particle)
    const bindingsRef = useRef(null); // [{i0,i1,i2,u,v,w, jx,jy,jz}] * count
    const meshRef = useRef(null); // target (SkinnedMesh or Mesh)
    const geomForSampleRef = useRef(null); // filtered geometry for indices
    const parentAttachedRef = useRef(false);

    // setup render buffers once
    useEffect(() => {
      const g = gRef.current;
      g.setAttribute("position", new THREE.BufferAttribute(arrays.pos, 3));
      g.setAttribute("alpha", new THREE.BufferAttribute(arrays.alpha, 1));
      g.setAttribute("seed", new THREE.BufferAttribute(arrays.seed, 1));
      g.computeBoundingSphere();
      return () => g.dispose();
    }, [arrays]);

    // expose burst()
    useImperativeHandle(
      ref,
      () => ({
        burst: () => {
          const root = targetRef?.current;
          const mesh = findMesh(root);
          if (!mesh) {
            if (debug) console.warn("[Burst] No mesh");
            return;
          }
          meshRef.current = mesh;

          // Parent points directly under the chosen mesh so local spaces match
          if (pointsRef.current && !parentAttachedRef.current) {
            mesh.add(pointsRef.current);
            pointsRef.current.position.set(0, 0, 0);
            pointsRef.current.rotation.set(0, 0, 0);
            pointsRef.current.scale.set(0.2, 0.2, 0.2);
            parentAttachedRef.current = true;
          }

          const filtered = filterGeomByMaterials(
            mesh,
            includeMaterialsByName,
            includeMaterialsByIndex
          );
          const geomForSample = filtered ?? mesh.geometry;
          geomForSampleRef.current = geomForSample;

          // Build a sampler over the filtered triangles (area-weighted)
          const tempMesh = new THREE.Mesh(
            geomForSample,
            new THREE.MeshBasicMaterial()
          );
          const sampler = new MeshSurfaceSampler(tempMesh).build();

          const bindings = new Array(count);
          const posAttr = gRef.current.getAttribute("position");
          const alphaAttr = gRef.current.getAttribute("alpha");
          const seedAttr = gRef.current.getAttribute("seed");

          const _p = new THREE.Vector3(),
            _n = new THREE.Vector3();

          const idx = geomForSample.index.array;
          const triCount = idx.length / 3;

          for (let i = 0; i < count; i++) {
            // sample a triangle by area, then choose random barycentrics
            sampler.sample(_p, _n);

            const tri = (Math.random() * triCount) | 0;
            const i0 = idx[tri * 3 + 0],
              i1 = idx[tri * 3 + 1],
              i2 = idx[tri * 3 + 2];

            let u = Math.random(),
              v = Math.random();
            if (u + v > 1.0) {
              u = 1.0 - u;
              v = 1.0 - v;
            }
            const w = 1.0 - u - v;

            const jx = (Math.random() - 0.5) * jitter;
            const jy = (Math.random() - 0.5) * jitter;
            const jz = (Math.random() - 0.5) * jitter;

            bindings[i] = { i0, i1, i2, u, v, w, jx, jy, jz };

            arrays.alpha[i] = 1.0;
            arrays.seed[i] = Math.random() * 10.0;
          }

          bindingsRef.current = bindings;

          // kick an immediate position update once
          _updateParticlePositions();

          posAttr.needsUpdate = true;
          alphaAttr.needsUpdate = true;
          seedAttr.needsUpdate = true;

          // cleanup temp
          tempMesh.geometry.dispose();
          tempMesh.material.dispose();
          if (filtered) filtered.dispose();
        },
      }),
      [count, jitter, includeMaterialsByName, includeMaterialsByIndex, debug]
    );

    // CPU update: morphs -> skin -> write positions (mesh-local)
    function _updateParticlePositions() {
      const mesh = meshRef.current;
      const bindings = bindingsRef.current;
      const geom = geomForSampleRef.current;
      if (!mesh || !bindings || !geom) return;

      const posSrc = geom.attributes.position;
      const posOut = arrays.pos;

      // Morph target support (may live on geom or original mesh.geometry)
      const morphs =
        (geom.morphAttributes && geom.morphAttributes.position) ||
        (mesh.geometry.morphAttributes &&
          mesh.geometry.morphAttributes.position) ||
        null;
      const influences = mesh.morphTargetInfluences || null;
      const hasMorphs = !!(morphs && morphs.length && influences);

      // Skinning support
      const isSkinned =
        !!mesh.isSkinnedMesh && typeof mesh.boneTransform === "function";

      // temp vectors
      const p0 = new THREE.Vector3(),
        p1 = new THREE.Vector3(),
        p2 = new THREE.Vector3();
      const s0 = new THREE.Vector3(),
        s1 = new THREE.Vector3(),
        s2 = new THREE.Vector3();
      const msum0 = new THREE.Vector3(),
        msum1 = new THREE.Vector3(),
        msum2 = new THREE.Vector3();
      const n = new THREE.Vector3(),
        e1 = new THREE.Vector3(),
        e2 = new THREE.Vector3();

      for (let i = 0; i < bindings.length; i++) {
        const b = bindings[i];

        // base vertices (mesh-local bind)
        p0.fromBufferAttribute(posSrc, b.i0);
        p1.fromBufferAttribute(posSrc, b.i1);
        p2.fromBufferAttribute(posSrc, b.i2);

        // --- MORPH (additive deltas in mesh-local) ---
        if (hasMorphs) {
          msum0.set(0, 0, 0);
          msum1.set(0, 0, 0);
          msum2.set(0, 0, 0);
          for (let m = 0; m < morphs.length; m++) {
            const w = influences[m];
            if (!w) continue;
            const mp = morphs[m];
            msum0.x += mp.getX(b.i0) * w;
            msum0.y += mp.getY(b.i0) * w;
            msum0.z += mp.getZ(b.i0) * w;
            msum1.x += mp.getX(b.i1) * w;
            msum1.y += mp.getY(b.i1) * w;
            msum1.z += mp.getZ(b.i1) * w;
            msum2.x += mp.getX(b.i2) * w;
            msum2.y += mp.getY(b.i2) * w;
            msum2.z += mp.getZ(b.i2) * w;
          }
          p0.add(msum0);
          p1.add(msum1);
          p2.add(msum2);
        }

        // --- SKIN (mesh-local). If not skinned, just pass through mesh-local ---
        if (isSkinned) {
          mesh.boneTransform(b.i0, s0);
          mesh.boneTransform(b.i1, s1);
          mesh.boneTransform(b.i2, s2);
        } else {
          s0.copy(p0);
          s1.copy(p1);
          s2.copy(p2);
        }

        // barycentric blend
        const u = b.u,
          v = b.v,
          w = b.w;
        const x = s0.x * u + s1.x * v + s2.x * w;
        const y = s0.y * u + s1.y * v + s2.y * w;
        const z = s0.z * u + s1.z * v + s2.z * w;

        // face normal in current pose
        e1.subVectors(s1, s0);
        e2.subVectors(s2, s0);
        n.copy(e1).cross(e2).normalize();

        // push + jitter (mesh-local)
        const px = x + n.x * normalPush + b.jx;
        const py = y + n.y * normalPush + b.jy;
        const pz = z + n.z * normalPush + b.jz;

        const i3 = i * 3;
        posOut[i3 + 0] = px;
        posOut[i3 + 1] = py;
        posOut[i3 + 2] = pz;
      }
    }

    // fade + animate + write positions
    useFrame((_, dt) => {
      uniforms.uTime.value += dt;

      // update positions to follow the animation
      if (bindingsRef.current) {
        _updateParticlePositions();
        gRef.current.getAttribute("position").needsUpdate = true;
      }

      // fade alpha over life
      const now = performance.now() / 1000;
      let needsAlpha = false;
      if (!SurfaceBurstOnBird_Geometry._birth) {
        SurfaceBurstOnBird_Geometry._birth = new Float32Array(
          arrays.alpha.length
        );
      }
      const birth = SurfaceBurstOnBird_Geometry._birth;

      for (let i = 0; i < arrays.alpha.length; i++) {
        if (birth[i] === 0 && arrays.alpha[i] > 0.99) birth[i] = now;
        const age = birth[i] ? now - birth[i] : 0;
        if (birth[i]) {
          const t = Math.min(1, age / Math.max(0.0001, life));
          const a = 1.0 - t;
          if (arrays.alpha[i] !== a) {
            arrays.alpha[i] = a;
            needsAlpha = true;
          }
        }
      }
      if (needsAlpha) gRef.current.getAttribute("alpha").needsUpdate = true;
    });

    return (
      <points ref={pointsRef} frustumCulled={false}>
        <bufferGeometry ref={gRef} />
        <shaderMaterial
          vertexShader={vert}
          fragmentShader={frag}
          uniforms={uniforms}
          transparent
          depthWrite
          // depthTest={false} // uncomment while debugging to force-on-top
          blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
          toneMapped={false}
        />
      </points>
    );
  }
);

export default SurfaceBurstOnBird_Geometry;
