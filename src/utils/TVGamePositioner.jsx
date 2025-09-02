import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";

export default function TVGameSlotPositioner({
  tvRoot, // ref to the TV root group (optional)
  materialName = "Game", // which material area to target
  screenMeshName = "screen", // mesh name contains this (case-insensitive)
  rootId = "tvGameSlot", // DOM id of the overlay div
}) {
  const { camera, size, scene, gl } = useThree();
  const domRef = useRef(null);

  const meshRef = useRef(null); // the mesh we’ll project
  const groupRef = useRef(null); // optional geometry group (if multi-material)
  const modeRef = useRef("none"); // "group" or "whole"
  const logged = useRef(false);

  // get overlay element (and re-grab if it mounted later)
  useEffect(() => {
    domRef.current = document.getElementById(rootId) || null;
  }, [rootId]);

  // find the target mesh/group
  useEffect(() => {
    const root = tvRoot?.current || scene;
    const matsToLower = (m) =>
      (Array.isArray(m) ? m : [m]).map((mm) => (mm?.name || "").toLowerCase());

    // collect candidates
    const allMeshes = [];
    root.traverse((o) => o.isMesh && allMeshes.push(o));

    // prefer meshes whose name matches screenMeshName
    const nameMatch = (o) =>
      (o.name || "").toLowerCase().includes(screenMeshName.toLowerCase());
    const pool = allMeshes.filter(nameMatch);
    const search = pool.length ? pool : allMeshes;

    let foundMesh = null;
    let foundGroup = null;
    let mode = "none";

    for (const m of search) {
      const mats = matsToLower(m.material);
      const targetIdx = mats.indexOf(materialName.toLowerCase());
      if (targetIdx === -1) continue;

      // case A: multi-material mesh with geometry.groups
      const grp = m.geometry?.groups?.find(
        (g) => g.materialIndex === targetIdx
      );
      if (grp) {
        foundMesh = m;
        foundGroup = grp;
        mode = "group";
        break;
      }

      // case B: single-material mesh (or multi without groups) -> use whole mesh
      // (your GLB shows one mesh per material; groups: [])
      if (!Array.isArray(m.material) || m.material.length === 1) {
        foundMesh = m;
        foundGroup = null;
        mode = "whole";
        break;
      }
    }

    meshRef.current = foundMesh;
    groupRef.current = foundGroup;
    modeRef.current = mode;

    if (!logged.current) {
      logged.current = true;
    }
  }, [scene, tvRoot, screenMeshName, materialName]);

  // project vertices → screen pixels → size/position overlay
  useFrame(() => {
    const el =
      domRef.current || (domRef.current = document.getElementById(rootId));
    const mesh = meshRef.current;
    const mode = modeRef.current;
    if (!el || !mesh || mode === "none") return;

    const geom = mesh.geometry;
    const pos = geom.attributes.position;
    if (!pos) return;

    const index = geom.index; // may be null
    const world = new THREE.Vector3();
    const ndc = new THREE.Vector3();
    const points = [];
    const seen = new Set();

    const pushV = (vi) => {
      if (seen.has(vi)) return;
      seen.add(vi);
      world
        .set(pos.getX(vi), pos.getY(vi), pos.getZ(vi))
        .applyMatrix4(mesh.matrixWorld);
      ndc.copy(world).project(camera);
      const sx = (ndc.x * 0.5 + 0.5) * size.width;
      const sy = (-ndc.y * 0.5 + 0.5) * size.height;
      points.push([sx, sy]);
    };

    if (mode === "group") {
      const grp = groupRef.current;
      if (!grp) return;
      if (index) {
        for (let i = grp.start; i < grp.start + grp.count; i++)
          pushV(index.getX(i));
      } else {
        const end = Math.min(pos.count, grp.start + grp.count);
        for (let vi = grp.start; vi < end; vi++) pushV(vi);
      }
    } else {
      // mode === "whole" → use all vertices of this mesh
      if (index) {
        for (let i = 0; i < index.count; i++) pushV(index.getX(i));
      } else {
        for (let vi = 0; vi < pos.count; vi++) pushV(vi);
      }
    }

    if (points.length < 3) return;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const [x, y] of points) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    const w = Math.max(0, maxX - minX);
    const h = Math.max(0, maxY - minY);

    const BASE_W = 700;
    const BASE_H = 900;

    const scale = Math.min(w / BASE_W, h / BASE_H);
    const offX = (w - BASE_W * scale) / 2;
    const offY = (h - BASE_H * scale) / 2 + 80;

    el.style.setProperty("--base-w", `${BASE_W}px`);
    el.style.setProperty("--base-h", `${BASE_H}px`);
    el.style.setProperty("--scale", scale.toString());
    el.style.setProperty("--offset-x", `${offX}px`);
    el.style.setProperty("--offset-y", `${offY}px`);

    const rect = gl.domElement.getBoundingClientRect();
    el.style.left = `${rect.left + minX}px`;
    el.style.top = `${rect.top + minY}px`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
  });
  return null;
}
