// utils/makePatternTexture.js
import * as THREE from "three";

export async function logoPattern(
  gl,
  url,
  {
    size = 2048, // bake resolution (square)
    flipY = false, // WebGL UV convention
    colorSpace = THREE.SRGBColorSpace,
  } = {}
) {
  // 1) fetch the raw SVG text
  const svgText = await fetch(url).then((r) => r.text());

  // 2) draw it into a high-res canvas
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  // Optional background (transparent by default):
  // ctx.clearRect(0, 0, size, size);

  // Create an Image from the SVG data URL
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.decoding = "async";
    i.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText);
  });

  // Draw covering the full canvas; respects the SVG viewBox
  ctx.drawImage(img, 0, 0, size, size);

  // 3) build a CanvasTexture with good sampling settings
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = colorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.flipY = flipY;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = gl.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;
  return tex;
}
