// /src/allScenes/MatcapPreloader.jsx
import { useEffect } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { MATCAPS } from "../allScenes/BirdThemes";

export default function MatcapPreloader() {
  const textures = useTexture(MATCAPS); // loads all at once

  useEffect(() => {
    textures.forEach((t) => {
      if (!t) return;
      t.colorSpace = THREE.SRGBColorSpace;
      t.flipY = false; // typical for PNG matcaps
      t.generateMipmaps = true;
      t.needsUpdate = true;
    });
  }, [textures]);

  return null; // nothing to render
}
