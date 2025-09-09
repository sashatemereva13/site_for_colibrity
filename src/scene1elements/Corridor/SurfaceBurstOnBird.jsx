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
import { ExportGLB } from "../../utils/ExportGLB.jsx";

/* ===================== SHADERS ===================== */
const vert = /* glsl */ `
  attribute float alpha;
  attribute float seed;
  varying float vAlpha;
  varying float vSeed;
  uniform float uSize;
  void main() {
    vAlpha = alpha;
    vSeed  = seed;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * (300.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;

const frag = /* glsl */ `
  precision highp float;
  varying float vAlpha;
  varying float vSeed;
  uniform float uTime, uSpeed, uSaturation, uContrast, uBrightness;
  uniform bool uMono;
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
    float pad = 0.08;
    vec2 uv = gl_PointCoord;
    float inSq = step(pad,uv.x)*step(pad,uv.y)*step(uv.x,1.0-pad)*step(uv.y,1.0-pad);
    float a = vAlpha * inSq;
    if (a < 0.01) discard;
    float t = floor(uTime * uSpeed);
    vec3 col = uMono ? vec3(hash21(vec2(vSeed, t)))
                     : applyCB(toSaturated(hashRGB(vec2(vSeed, t)), uSaturation), uContrast, uBrightness);
    gl_FragColor = vec4(col, a);
  }
`;

/* ===================== HELPERS ===================== */
function getAncestors(node) {
  const arr = [];
  let cur = node;
  while (cur) {
    arr.push(cur);
    cur = cur.parent;
  }
  return arr;
}

function getCommonAncestor(objs, rootHint) {
  if (!objs?.length) return rootHint ?? null;
  const chains = objs.map(getAncestors);
  // intersect from the top (Scene down to child under targetRef)
  const first = chains[0];
  for (let a of first) {
    if (rootHint && !a.isObject3D) continue;
    const ok = chains.every((c) => c.includes(a));
    if (ok) return a;
  }
  return rootHint ?? null;
}

function getAllSkinnedMeshes(root) {
  const out = [];
  root?.traverse?.((o) => {
    if (o.isSkinnedMesh && o.geometry) out.push(o);
  });
  return out;
}

function buildMaterialAllowedIndexArray(mesh, allowNames = [], allowIdx = []) {
  const geom = mesh.geometry;
  const index = geom.getIndex?.();
  if (!index) return null;

  if ((!allowNames || !allowNames.length) && (!allowIdx || !allowIdx.length)) {
    return null; // allow all
  }

  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const allowed = new Set(allowIdx);
  if (allowNames?.length) {
    mats.forEach((m, i) => {
      const n = m?.name || "";
      if (allowNames.some((re) => (re.test ? re.test(n) : n.includes(re)))) {
        allowed.add(i);
      }
    });
  }
  if (allowed.size === 0) return new Int32Array([]);

  const src = index.array;
  const groups = geom.groups?.length
    ? geom.groups
    : [{ start: 0, count: index.count, materialIndex: 0 }];

  const out = [];
  for (const g of groups) {
    const mi = g.materialIndex ?? 0;
    if (!allowed.has(mi)) continue;
    const end = (g.start || 0) + (g.count || 0);
    for (let i = g.start || 0; i < end; i++) out.push(src[i]);
  }
  return new Int32Array(out);
}

function buildTriangleSamplerFrom(geom, idxArray) {
  const pos = geom.attributes.position;
  const idx = idxArray;
  const triCount = idx.length / 3;
  if (!triCount) return null;

  const areas = new Float32Array(triCount);
  let total = 0;
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3();
  const ab = new THREE.Vector3(),
    ac = new THREE.Vector3();

  for (let t = 0; t < triCount; t++) {
    const i0 = idx[t * 3 + 0],
      i1 = idx[t * 3 + 1],
      i2 = idx[t * 3 + 2];
    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1);
    c.fromBufferAttribute(pos, i2);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    total += areas[t] = ab.cross(ac).length() * 0.5;
  }
  if (!total) return null;

  const cdf = new Float32Array(triCount);
  let run = 0;
  for (let t = 0; t < triCount; t++) {
    run += areas[t] / total;
    cdf[t] = run;
  }
  function pickTri(r) {
    let lo = 0,
      hi = triCount - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      r <= cdf[mid] ? (hi = mid) : (lo = mid + 1);
    }
    return lo;
  }
  return { pickTri, triCount, idx };
}

function buildGlobalSampler(entries) {
  let total = 0;
  const weights = entries.map((e) => {
    const n = e?.sampler?.triCount || 0;
    total += n;
    return n;
  });
  if (!total) return null;

  const cdf = new Float32Array(weights.length);
  let run = 0;
  for (let i = 0; i < weights.length; i++) {
    run += weights[i] / total;
    cdf[i] = run;
  }
  function pickMesh(r) {
    let lo = 0,
      hi = cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      r <= cdf[mid] ? (hi = mid) : (lo = mid + 1);
    }
    return lo;
  }
  return { pickMesh };
}

/* ===================== COMPONENT ===================== */
const SurfaceBurstOnBird_Geometry = forwardRef(
  function SurfaceBurstOnBird_Geometry(
    {
      targetRef, // required: the <group> that contains the cloned bird
      count = 1600,
      size = 0.12,
      life = 1.8,
      normalPush = 0.02,
      jitter = 0.01,
      additive = false,
      mono = false,
      speed = 3.0,
      saturation = 0.3,
      contrast = 0.6,
      brightness = 1.0,

      // keep empty at first; add back later once visible
      includeMaterialsByName = [],
      includeMaterialsByIndex = [],

      debug = true,
    },
    ref
  ) {
    const pointsRef = useRef();
    const gRef = useRef(new THREE.BufferGeometry());
    const anchorRef = useRef(null); // bird root (common parent space)

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

    const arrays = useMemo(
      () => ({
        pos: new Float32Array(count * 3),
        alpha: new Float32Array(count),
        seed: new Float32Array(count),
      }),
      [count]
    );

    const birthRef = useRef(new Float32Array(count));
    const activeCountRef = useRef(count);

    const meshEntriesRef = useRef([]); // [{ mesh, triIdx, sampler }]
    const bindingsRef = useRef(null);
    const parentAttachedRef = useRef(false);
    const _lifeRef = useRef(life);

    useEffect(() => {
      const onKey = (e) => {
        if (e.key.toLowerCase() === "e") {
          ref?.current?.exportGLB?.("burstParticles.glb");
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, []);

    // init buffers once
    useEffect(() => {
      const g = gRef.current;
      g.setAttribute("position", new THREE.BufferAttribute(arrays.pos, 3));
      g.setAttribute("alpha", new THREE.BufferAttribute(arrays.alpha, 1));
      g.setAttribute("seed", new THREE.BufferAttribute(arrays.seed, 1));
      g.computeBoundingSphere();
      return () => g.dispose();
    }, [arrays]);

    useImperativeHandle(ref, () => ({
      burst: (opts = {}) => {
        const root = targetRef?.current;
        if (!root) return;

        const meshes = getAllSkinnedMeshes(root);
        if (!meshes.length) {
          if (debug)
            console.warn(
              "[SurfaceBurst] No skinned meshes found under",
              root.name || root.type
            );
          return;
        }

        if (debug) {
          meshes.forEach((m, i) => {
            console.log(
              `[SurfaceBurst] mesh #${i}`,
              m.name || m.type,
              "tris:",
              m.geometry.index
                ? m.geometry.index.count / 3
                : m.geometry.attributes.position.count / 3,
              "bones:",
              m.skeleton?.bones?.length || 0,
              "parent:",
              m.parent?.name || m.parent?.type
            );
          });
        }

        // 1) parent points once under the bird root (common space for all meshes)
        if (!parentAttachedRef.current && pointsRef.current) {
          anchorRef.current = root;
          anchorRef.current.add(pointsRef.current);

          // identity in anchor space
          pointsRef.current.position.set(0, 0, 0);
          pointsRef.current.quaternion.identity();
          pointsRef.current.scale.set(1, 1, 1);

          parentAttachedRef.current = true;

          if (debug) {
            console.log(
              "[SurfaceBurst] attached to:",
              anchorRef.current.name || anchorRef.current.type,
              "scale:",
              anchorRef.current.scale?.toArray?.()
            );
          }
        }

        // 3) build per-mesh triangle samplers (with material filter, fallback to all)
        const entries = meshes.map((mesh) => {
          const geom = mesh.geometry;
          const idxAll = geom.index?.array ?? null;

          let triIdx = buildMaterialAllowedIndexArray(
            mesh,
            includeMaterialsByName,
            includeMaterialsByIndex
          );
          if (!triIdx || triIdx.length === 0) {
            triIdx = idxAll?.slice?.() ?? new Int32Array();
          }
          const sampler = triIdx.length
            ? buildTriangleSamplerFrom(geom, triIdx)
            : null;
          return { mesh, triIdx, sampler };
        });
        meshEntriesRef.current = entries;

        const global = buildGlobalSampler(entries);
        if (!global) {
          if (debug) console.warn("[SurfaceBurst] No triangles to sample.");
          return;
        }

        // 4) overrides + scale compensation (so push/jitter are consistent)
        if (opts.size != null) uniforms.uSize.value = opts.size;
        const lifeNow = opts.life ?? life;
        const npushNow = opts.normalPush ?? normalPush;
        const jitterNow = opts.jitter ?? jitter;
        const want = Math.max(1, Math.min(count, opts.count ?? count));
        activeCountRef.current = want;

        const ws = new THREE.Vector3();
        (anchorRef.current || root).getWorldScale(ws);
        const scaleFix = ws.x || 1;
        const npushAdj = npushNow / scaleFix;
        const jitterAdj = jitterNow / scaleFix;

        // 5) build bindings
        const bindings = new Array(want);
        arrays.alpha.fill(1.0);
        birthRef.current.fill(0);
        for (let i = 0; i < want; i++) arrays.seed[i] = Math.random() * 10.0;
        for (let i = want; i < arrays.alpha.length; i++) {
          arrays.alpha[i] = 0.0;
          arrays.seed[i] = 0.0;
        }

        for (let i = 0; i < want; i++) {
          const mi = global.pickMesh(Math.random());
          const entry = entries[mi];
          const sampler = entry.sampler;

          const triIndex = sampler.pickTri(Math.random());
          const idx = sampler.idx;
          const i0 = idx[triIndex * 3 + 0],
            i1 = idx[triIndex * 3 + 1],
            i2 = idx[triIndex * 3 + 2];

          // random barycentrics (uniform)
          let u = Math.random(),
            v = Math.random();
          if (u + v > 1.0) {
            u = 1.0 - u;
            v = 1.0 - v;
          }
          const w = 1.0 - u - v;

          const jx = (Math.random() - 0.5) * jitterAdj;
          const jy = (Math.random() - 0.5) * jitterAdj;
          const jz = (Math.random() - 0.5) * jitterAdj;

          bindings[i] = {
            m: mi,
            i0,
            i1,
            i2,
            u,
            v,
            w,
            jx,
            jy,
            jz,
            npush: npushAdj,
          };
        }
        bindingsRef.current = bindings;

        // 6) write once
        _updateParticlePositions();
        gRef.current.getAttribute("position").needsUpdate = true;
        gRef.current.getAttribute("alpha").needsUpdate = true;
        gRef.current.getAttribute("seed").needsUpdate = true;

        _lifeRef.current = lifeNow;

        if (debug) {
          console.log(
            "[SurfaceBurst] meshes:",
            entries.map((e) => ({
              name: e.mesh.name,
              tris: e.sampler?.triCount ?? 0,
              bones: e.mesh.skeleton?.bones?.length ?? 0,
            }))
          );
        }
      },

      clear: () => {
        arrays.alpha.fill(0);
        birthRef.current.fill(0);
        gRef.current.getAttribute("alpha").needsUpdate = true;
      },

      exportGLB: (filename = "burstParticles.glb") => {
        if (pointsRef.current) {
          ExportGLB(pointsRef.current, filename, { unlit: true });
        }
      },
    }));

    // CPU skinning + morphs → anchor-local particle positions
    function _updateParticlePositions() {
      const entries = meshEntriesRef.current;
      const bindings = bindingsRef.current;
      const anchor = anchorRef.current || targetRef?.current;
      if (!parentAttachedRef.current || !entries.length || !bindings || !anchor)
        return;

      anchor.parent?.updateMatrixWorld(true);
      anchor.updateMatrixWorld(true);

      // ensure current animation pose (mixers already updated by drei each frame)
      for (const e of entries) {
        e.mesh.updateMatrixWorld(true);
        if (e.mesh.isSkinnedMesh && e.mesh.skeleton) e.mesh.skeleton.update();
      }

      const invAnchor = new THREE.Matrix4().copy(anchor.matrixWorld).invert();
      const posOut = arrays.pos;

      const p0 = new THREE.Vector3(),
        p1 = new THREE.Vector3(),
        p2 = new THREE.Vector3();
      const s0 = new THREE.Vector3(),
        s1 = new THREE.Vector3(),
        s2 = new THREE.Vector3();
      const m0 = new THREE.Vector3(),
        m1 = new THREE.Vector3(),
        m2 = new THREE.Vector3();
      const e1 = new THREE.Vector3(),
        e2 = new THREE.Vector3(),
        n = new THREE.Vector3();
      const tmpWorld = new THREE.Vector3();

      for (let i = 0; i < bindings.length; i++) {
        const b = bindings[i];
        const mesh = entries[b.m].mesh;
        const geom = mesh.geometry;

        // base positions (bind space)
        const posSrc = geom.attributes.position;
        p0.fromBufferAttribute(posSrc, b.i0);
        p1.fromBufferAttribute(posSrc, b.i1);
        p2.fromBufferAttribute(posSrc, b.i2);

        // morphs (additive)
        const morphs = geom.morphAttributes?.position || null;
        const infl = mesh.morphTargetInfluences || null;
        if (morphs && morphs.length && infl) {
          m0.set(0, 0, 0);
          m1.set(0, 0, 0);
          m2.set(0, 0, 0);
          for (let m = 0; m < morphs.length; m++) {
            const w = infl[m];
            if (!w) continue;
            const mp = morphs[m];
            m0.addScaledVector(
              new THREE.Vector3(mp.getX(b.i0), mp.getY(b.i0), mp.getZ(b.i0)),
              w
            );
            m1.addScaledVector(
              new THREE.Vector3(mp.getX(b.i1), mp.getY(b.i1), mp.getZ(b.i1)),
              w
            );
            m2.addScaledVector(
              new THREE.Vector3(mp.getX(b.i2), mp.getY(b.i2), mp.getZ(b.i2)),
              w
            );
          }
          p0.add(m0);
          p1.add(m1);
          p2.add(m2);
        }

        // skin to current pose
        if (mesh.isSkinnedMesh && mesh.boneTransform) {
          mesh.boneTransform(b.i0, s0);
          mesh.boneTransform(b.i1, s1);
          mesh.boneTransform(b.i2, s2);
        } else {
          s0.copy(p0);
          s1.copy(p1);
          s2.copy(p2);
        }

        // barycentric point
        const x = s0.x * b.u + s1.x * b.v + s2.x * b.w;
        const y = s0.y * b.u + s1.y * b.v + s2.y * b.w;
        const z = s0.z * b.u + s1.z * b.v + s2.z * b.w;

        // normal (for push)
        e1.subVectors(s1, s0);
        e2.subVectors(s2, s0);
        n.copy(e1).cross(e2).normalize();

        // push + jitter in mesh-local posed space
        const px = x + n.x * b.npush + b.jx;
        const py = y + n.y * b.npush + b.jy;
        const pz = z + n.z * b.npush + b.jz;

        // convert mesh-local → world → anchor-local
        tmpWorld.set(px, py, pz).applyMatrix4(mesh.matrixWorld);
        tmpWorld.applyMatrix4(invAnchor);

        const i3 = i * 3;
        posOut[i3 + 0] = tmpWorld.x;
        posOut[i3 + 1] = tmpWorld.y;
        posOut[i3 + 2] = tmpWorld.z;
      }
    }

    // Run after animations: ensure we sample the updated pose
    useFrame((_, dt) => {
      uniforms.uTime.value += dt;

      if (bindingsRef.current) {
        _updateParticlePositions();
        gRef.current.getAttribute("position").needsUpdate = true;
      }

      // alpha fade
      const now = performance.now() / 1000;
      const lifeNow = Math.max(0.0001, _lifeRef.current);

      let dirty = false;
      const alphaAttr = gRef.current.getAttribute("alpha");
      const alpha = arrays.alpha;
      const birth = birthRef.current;
      const maxN = activeCountRef.current;

      for (let i = 0; i < maxN; i++) {
        if (birth[i] === 0 && alpha[i] > 0.99) birth[i] = now;
        const age = birth[i] ? now - birth[i] : 0;
        if (birth[i]) {
          const a = 1.0 - Math.min(1, age / lifeNow);
          if (alpha[i] !== a) {
            alpha[i] = a;
            dirty = true;
          }
        }
      }
      if (dirty) alphaAttr.needsUpdate = true;
    });

    return (
      <points ref={pointsRef} frustumCulled={false} visible>
        <bufferGeometry ref={gRef} />
        <shaderMaterial
          vertexShader={vert}
          fragmentShader={frag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
          toneMapped={false}
        />
      </points>
    );
  }
);

export default SurfaceBurstOnBird_Geometry;
