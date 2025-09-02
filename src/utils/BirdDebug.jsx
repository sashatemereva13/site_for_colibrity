// /src/details/BirdDebug.jsx
import { useGLTF } from "@react-three/drei";
import { useEffect } from "react";
import * as THREE from "three";

function parentChain(node) {
  const names = [];
  let p = node.parent;
  while (p) {
    if (p.name) names.push(p.name);
    p = p.parent;
  }
  return names.reverse().join(" > ");
}

function matInfo(mat) {
  if (!mat) return { name: "—", type: "—" };
  return {
    name: mat.name || "—",
    type: mat.type || mat.constructor?.name || "Material",
    uuid: mat.uuid,
  };
}

export default function BirdDebug() {
  const { scene } = useGLTF("/models/hummingbird.glb");
  useGLTF.preload("/models/hummingbird.glb");

  useEffect(() => {
    console.log("===== Hummingbird Parts (detailed) =====");

    // Collect a summary of unique materials by name
    const uniqueMats = new Map(); // key: mat.uuid, val: {name,type,count,usedBy:Set}
    const nameBuckets = new Map(); // key: mat.name, val: Set<uuid>

    scene.traverse((ch) => {
      if (!ch.isMesh) return;

      const geo = ch.geometry;
      const groupLen = Array.isArray(geo?.groups) ? geo.groups.length : 0;
      const parents = parentChain(ch);

      if (Array.isArray(ch.material)) {
        console.log(
          `%cMesh: %s  |  %d sub-materials  |  Groups: %d  |  Skinned: %s`,
          "color:#9cdcfe",
          ch.name || "—",
          ch.material.length,
          groupLen,
          ch.isSkinnedMesh ? "yes" : "no"
        );
        ch.material.forEach((m, i) => {
          const info = matInfo(m);
          console.log(
            "  ↳ [idx %d] Material: %s  |  Type: %s  |  UUID: %s  |  Parents: %s",
            i,
            info.name,
            info.type,
            info.uuid,
            parents
          );

          if (m) {
            if (!uniqueMats.has(m.uuid)) {
              uniqueMats.set(m.uuid, {
                name: info.name,
                type: info.type,
                count: 0,
                usedBy: new Set(),
              });
            }
            const rec = uniqueMats.get(m.uuid);
            rec.count += 1;
            rec.usedBy.add(ch.name || "(unnamed mesh)");

            if (info.name) {
              if (!nameBuckets.has(info.name))
                nameBuckets.set(info.name, new Set());
              nameBuckets.get(info.name).add(m.uuid);
            }
          }
        });
      } else {
        const m = ch.material;
        const info = matInfo(m);
        console.log(
          `%cMesh: %s  |  Material: %s  |  Type: %s  |  UUID: %s  |  Groups: %d  |  Skinned: %s  |  Parents: %s`,
          "color:#9cdcfe",
          ch.name || "—",
          info.name,
          info.type,
          info.uuid,
          groupLen,
          ch.isSkinnedMesh ? "yes" : "no",
          parents
        );

        if (m) {
          if (!uniqueMats.has(m.uuid)) {
            uniqueMats.set(m.uuid, {
              name: info.name,
              type: info.type,
              count: 0,
              usedBy: new Set(),
            });
          }
          const rec = uniqueMats.get(m.uuid);
          rec.count += 1;
          rec.usedBy.add(ch.name || "(unnamed mesh)");

          if (info.name) {
            if (!nameBuckets.has(info.name))
              nameBuckets.set(info.name, new Set());
            nameBuckets.get(info.name).add(m.uuid);
          }
        }
      }
    });

    console.log("===== Unique Materials (by UUID) =====");
    const tableRows = [];
    uniqueMats.forEach((rec, uuid) => {
      tableRows.push({
        name: rec.name,
        type: rec.type,
        uuid,
        attachedCount: rec.count,
        usedBy: Array.from(rec.usedBy).join(", "),
      });
    });
    console.table(tableRows);

    console.log("===== Material Names → UUIDs =====");
    const nameRows = [];
    nameBuckets.forEach((uuids, name) => {
      nameRows.push({
        materialName: name,
        uuidCount: uuids.size,
        uuids: Array.from(uuids).join(", "),
      });
    });
    console.table(nameRows);

    // Helpful filters in console:
    //  - Run these in DevTools after the logs print.
    console.log(
      "Tip: Use your console to filter. For example:\n" +
        "  1) Filter lines by name:   console.search('Material007')\n" +
        "  2) Or re-run traversal and only log Material007/008 meshes.\n"
    );

    console.log("===== End of Hummingbird Debug =====");
  }, [scene]);

  return <primitive object={scene} scale={0.2} />;
}
