// src/scene1elements/DottedText.jsx
import * as THREE from "three";
import { useRef, useEffect } from "react";
import { Text } from "@react-three/drei";

/**
 * DottedText
 * - Converts the fill of <Text> into a screen-space dot grid.
 * - Control spacing via dotScale and thickness via dotSize.
 *
 * Props: all <Text> props +:
 *   dotScale: number  (spacing; bigger = larger/sparser cells)  default: 3.0
 *   dotSize:  number  (dot radius; >1 = thicker/bolder)         default: 1.0
 *   fillBg:   boolean (keep faint fill under dots)               default: false
 */
export default function DottedText({
  children,
  dotScale = 3.0,
  dotSize = 1.2,
  fillBg = false,
  color = "#000000",
  ...textProps
}) {
  const matRef = useRef();

  useEffect(() => {
    const mat = matRef.current;
    if (!mat) return;

    mat.onBeforeCompile = (shader) => {
      // uniforms
      shader.uniforms.uDotScale = { value: dotScale };
      shader.uniforms.uDotSize = { value: dotSize };
      shader.uniforms.uKeepFill = { value: fillBg ? 1.0 : 0.0 };

      // inject uniforms
      shader.fragmentShader =
        `
        uniform float uDotScale;
        uniform float uDotSize;
        uniform float uKeepFill;
      ` + shader.fragmentShader;

      // post-process the final color into a dot mask
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <dithering_fragment>",
        `
        #include <dithering_fragment>
        // --- dotted mask in screen-space ---
        vec2 p = gl_FragCoord.xy / uDotScale; // screen-space grid
        vec2 gv = fract(p) - 0.5;             // cell-local coords (-0.5..0.5)
        float d = length(gv);                 // distance to cell center
        // baseline 0.38; multiply by uDotSize (>1 => thicker dots)
        float dotMask = step(d, 0.38 * uDotSize);

        if (uKeepFill < 0.5) {
          gl_FragColor.rgb *= dotMask;
          gl_FragColor.a   *= dotMask;
        } else {
          gl_FragColor.rgb = mix(gl_FragColor.rgb * 0.65, gl_FragColor.rgb, dotMask);
        }
        `
      );
    };

    // recompile when inputs change
    mat.needsUpdate = true;
  }, [dotScale, dotSize, fillBg]);

  return (
    <Text color={color} {...textProps}>
      {children}
      {/* Override Text's default material so we can hook the shader */}
      <meshBasicMaterial
        ref={matRef}
        transparent
        blending={THREE.NormalBlending} // "ink-like" result
        toneMapped={false}
      />
    </Text>
  );
}
