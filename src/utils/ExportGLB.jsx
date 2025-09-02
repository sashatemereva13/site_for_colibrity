// utils/ExportGLB.jsx
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

function toUnlit(mat, color) {
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  // keep color/albedo map if present and not a video texture
  if (mat?.map && !mat.map.isVideoTexture) m.map = mat.map;
  return m;
}

function toPBR(mat, color) {
  // If it's already a MeshStandardMaterial, keep useful maps
  if (mat && mat.isMeshStandardMaterial) {
    const m = mat.clone();
    m.color = new THREE.Color(color);
    m.side = THREE.DoubleSide;
    return m;
  }
  // Fallback PBR with gentle rough/metal
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  // Preserve common maps if they exist & aren't video textures
  const safe = (t) => (t && !t.isVideoTexture ? t : null);
  if (mat) {
    m.map = safe(mat.map);
    m.normalMap = safe(mat.normalMap);
    m.roughnessMap = safe(mat.roughnessMap);
    m.metalnessMap = safe(mat.metalnessMap);
    m.emissiveMap = safe(mat.emissiveMap);
    if (mat.emissive?.isColor) {
      m.emissive = mat.emissive.clone();
      m.emissiveIntensity = mat.emissiveIntensity ?? 1;
    }
  }
  return m;
}

/**
 * ExportGLB(object, filename, opts)
 * opts:
 *  - unlit: boolean (default false) -> MeshBasicMaterial (flat, no lighting/IBL)
 *  - stripLights, stripCameras, stripHelpers: booleans (default true/true/true)
 *  - honorSkipFlag: boolean (default true) -> skip nodes with userData.skipExport
 */
export function ExportGLB(object, filename = "scene.glb", opts = {}) {
  const {
    unlit = false,
    stripLights = true,
    stripCameras = true,
    stripHelpers = true,
    honorSkipFlag = true,
  } = opts;

  if (!object) return;

  // Clone into a fresh Scene so we don't mutate runtime
  const scene = new THREE.Scene();
  const root = object.clone(true);
  scene.add(root);
  scene.updateMatrixWorld(true);

  let meshCount = 0;

  root.traverse((o) => {
    if (honorSkipFlag && o.userData?.skipExport) {
      o.visible = false;
      return;
    }
    if (stripLights && o.isLight) {
      o.visible = false;
      return;
    }
    if (stripCameras && o.isCamera) {
      o.visible = false;
      return;
    }
    if (stripHelpers && (o.isHelper || o.type?.includes("Helper"))) {
      o.visible = false;
      return;
    }

    if (o.isMesh) {
      meshCount++;

      const g = o.geometry;
      if (!g?.attributes?.position) {
        o.visible = false;
        return;
      }
      if (!g.attributes.normal) g.computeVertexNormals();

      // choose base color: userData overrides, else material color, else white
      let color = 0xffffff;
      if (o.userData?.exportColor)
        color = new THREE.Color(o.userData.exportColor).getHex();
      else if (o.material?.color?.isColor) color = o.material.color.getHex();

      let newMat = unlit
        ? toUnlit(o.material, color)
        : toPBR(o.material, color);
      if (!(newMat instanceof THREE.Material)) {
        console.warn(
          "[ExportGLB] Non-material detected, forcing MeshBasicMaterial"
        );
        newMat = new THREE.MeshBasicMaterial({ color });
      }
      o.material = newMat;
    }
  });

  const exporter = new GLTFExporter();
  exporter.parse(
    scene,
    (result) => {
      const blob = new Blob([result], { type: "model/gltf-binary" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      console.log(
        `[ExportGLB] wrote ${filename}, meshes=${meshCount}, size≈${Math.round(
          blob.size / 1024
        )}KB`
      );
    },
    (err) => console.error("GLTF export error:", err),
    {
      binary: true,
      onlyVisible: true,
      embedImages: true,
      truncateDrawRange: false,
    }
  );
}
