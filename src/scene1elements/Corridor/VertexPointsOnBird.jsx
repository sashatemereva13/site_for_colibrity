// src/effects/VertexPointsCover.jsx
import * as THREE from "three";
import React, { useMemo, useRef, useEffect, forwardRef } from "react";
import { useFrame } from "@react-three/fiber";

// square sprite shaders
const VERT = `
  attribute float alpha;
  varying float vAlpha;
  uniform float uSize;
  void main(){
    vAlpha = alpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const FRAG = `
  precision highp float;
  varying float vAlpha;
  void main(){
    float pad = 0.08;
    vec2 uv = gl_PointCoord;
    float inSq = step(pad, uv.x) * step(pad, uv.y) * step(uv.x, 1.0-pad) * step(uv.y, 1.0-pad);
    float a = vAlpha * inSq;
    if (a < 0.01) discard;
    gl_FragColor = vec4(1.0, 1.0, 1.0, a);
  }
`;

// util: does this mesh have any material whose name/index matches?
function meshMatches(mesh, nameRegexes, indexAllow) {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const hasIndex = indexAllow.length > 0;
  const hasName = nameRegexes.length > 0;
  if (!hasIndex && !hasName) return true; // no filter = keep all

  for (let i = 0; i < mats.length; i++) {
    const m = mats[i];
    if (hasIndex && indexAllow.includes(i)) return true;
    const n = (m && m.name) || "";
    if (
      hasName &&
      nameRegexes.some((re) => (re.test ? re.test(n) : n.includes(re)))
    )
      return true;
  }
  return false;
}

function makePointsForMesh(mesh, size, alpha, stride, fraction) {
  const geom = mesh.geometry;
  const vCount = geom.attributes.position.count;

  // build vertex index list (optionally downsample)
  let idxs = Array.from({ length: vCount }, (_, i) => i);
  if (stride > 1) idxs = idxs.filter((_, i) => i % stride === 0);
  if (fraction < 1) {
    const keep = [];
    for (const i of idxs) if (Math.random() < fraction) keep.push(i);
    idxs = keep;
  }

  const outPos = new Float32Array(idxs.length * 3);
  const outA = new Float32Array(idxs.length);
  outA.fill(alpha);

  const buf = new THREE.BufferGeometry();
  buf.setAttribute("position", new THREE.BufferAttribute(outPos, 3));
  buf.setAttribute("alpha", new THREE.BufferAttribute(outA, 1));
  buf.computeBoundingSphere();

  const uniforms = { uSize: { value: size } };
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    transparent: true,
    depthWrite: false, // avoids z-fight; set true later if you prefer
    // depthTest: false,  // uncomment while debugging to force-on-top
    blending: THREE.NormalBlending,
    toneMapped: false,
  });

  const points = new THREE.Points(buf, mat);
  // parent under THIS mesh so local coords match
  mesh.add(points);

  return { points, buf, idxs, uniforms };
}

const VertexPointsCover = forwardRef(function VertexPointsCover(
  {
    targetRef,
    size = 6,
    color = "#ffffff", // not used in shader; keep for future tint
    alpha = 1.0,
    normalPush = 0.01, // tiny lift to avoid z-fighting
    includeMaterialsByName = [/^Material[_\.]?0*07$/i],
    includeMaterialsByIndex = [],
    stride = 1,
    fraction = 1.0,
    debug = false,
  },
  ref
) {
  const stateRef = useRef({ entries: [] });

  // create one points cloud per matching mesh
  useEffect(() => {
    const root = targetRef?.current;
    if (!root) return;

    const entries = [];
    root.traverse((o) => {
      if (!o.isMesh && !o.isSkinnedMesh) return;
      if (!o.geometry || !o.geometry.attributes?.position) return;
      if (!meshMatches(o, includeMaterialsByName, includeMaterialsByIndex))
        return;

      const entry = {
        mesh: o,
        ...makePointsForMesh(o, size, alpha, stride, fraction),
      };
      entries.push(entry);
      if (debug)
        console.log(
          "[VertexPointsCover] attached to",
          o.name || o.uuid,
          "verts:",
          entry.idxs.length
        );
    });

    stateRef.current.entries = entries;

    return () => {
      // cleanup all created points
      for (const e of entries) {
        e.mesh.remove(e.points);
        e.buf.dispose();
        e.points.material.dispose();
      }
      stateRef.current.entries = [];
    };
  }, [targetRef, size, alpha, stride, fraction, includeMaterialsByName, includeMaterialsByIndex, debug]);

  // update every frame (skinned or rigid)
  useFrame(() => {
    for (const e of stateRef.current.entries) {
      const { mesh, buf, idxs } = e;
      const out = buf.getAttribute("position").array;

      const geom = mesh.geometry;
      const posAttr = geom.attributes.position;
      const norAttr = geom.attributes.normal;

      // ---- MORPHS ----
      const morphs = geom.morphAttributes?.position || null;
      const hasMorphs = !!(
        morphs &&
        morphs.length &&
        mesh.morphTargetInfluences
      );

      // ---- SKINNING ----
      const skinned =
        !!mesh.isSkinnedMesh && typeof mesh.boneTransform === "function";
      const skeleton = skinned ? mesh.skeleton : null;
      if (skinned) skeleton.update(); // ensure boneMatrices are current

      // temp vectors (reuse to avoid GC)
      const base = new THREE.Vector3();
      const msum = new THREE.Vector3();
      const p = new THREE.Vector3();
      const n = new THREE.Vector3();

      // cache bone matrices for this mesh (Matrix4 objects)
      let boneMats = null;
      if (skinned) {
        const bm = skeleton.boneMatrices; // Float32Array (16 * nBones)
        boneMats =
          e._boneMats ||
          (e._boneMats = skeleton.bones.map(() => new THREE.Matrix4()));
        for (let i = 0; i < skeleton.bones.length; i++) {
          boneMats[i].fromArray(bm, i * 16);
        }
      }

      // helpers for CPU skinning like the shader:
      const bindMatrix = skinned ? mesh.bindMatrix : null;
      const bindMatrixInverse = skinned ? mesh.bindMatrixInverse : null;
      const skinIndexAttr = skinned ? geom.attributes.skinIndex : null;
      const skinWeightAttr = skinned ? geom.attributes.skinWeight : null;

      for (let k = 0, j = 0; k < idxs.length; k++, j += 3) {
        const vi = idxs[k];

        // 1) base position
        base.fromBufferAttribute(posAttr, vi);

        // 2) MORPH: accumulate morph delta = sum(influence * morphPos[vi])
        if (hasMorphs) {
          msum.set(0, 0, 0);
          const inf = mesh.morphTargetInfluences;
          for (let m = 0; m < morphs.length; m++) {
            const w = inf[m];
            if (!w) continue;
            const mp = morphs[m];
            msum.x += mp.getX(vi) * w;
            msum.y += mp.getY(vi) * w;
            msum.z += mp.getZ(vi) * w;
          }
          p.copy(base).add(msum); // morphed local position
        } else {
          p.copy(base);
        }

        // 3) SKIN: apply bone matrices on CPU (like the vertex shader)
        if (skinned && skinIndexAttr && skinWeightAttr) {
          // bind space
          p.applyMatrix4(bindMatrix);

          const si = skinIndexAttr.getX(vi);
          const sj = skinIndexAttr.getY(vi);
          const sk = skinIndexAttr.getZ(vi);
          const sl = skinIndexAttr.getW(vi);

          const wi = skinWeightAttr.getX(vi);
          const wj = skinWeightAttr.getY(vi);
          const wk = skinWeightAttr.getZ(vi);
          const wl = skinWeightAttr.getW(vi);

          // weighted sum of bone transforms
          const v = new THREE.Vector3(0, 0, 0);
          const tmp = new THREE.Vector3();
          if (wi)
            tmp.copy(p).applyMatrix4(boneMats[si]).multiplyScalar(wi),
              v.add(tmp);
          if (wj)
            tmp.copy(p).applyMatrix4(boneMats[sj]).multiplyScalar(wj),
              v.add(tmp);
          if (wk)
            tmp.copy(p).applyMatrix4(boneMats[sk]).multiplyScalar(wk),
              v.add(tmp);
          if (wl)
            tmp.copy(p).applyMatrix4(boneMats[sl]).multiplyScalar(wl),
              v.add(tmp);

          // unbind back to mesh local
          p.copy(v).applyMatrix4(bindMatrixInverse);
        }

        // 4) optional tiny lift to avoid z-fighting
        if (normalPush !== 0 && norAttr) {
          n.fromBufferAttribute(norAttr, vi).normalize();
          p.addScaledVector(n, normalPush);
        }

        // IMPORTANT: points are parented to the same mesh, so write in mesh-local
        out[j + 0] = p.x;
        out[j + 1] = p.y;
        out[j + 2] = p.z;
      }

      buf.getAttribute("position").needsUpdate = true;
    }
  });

  // this manager component renders nothing by itself
  return null;
});

export default VertexPointsCover;
