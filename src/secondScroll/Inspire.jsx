// src/secondScroll/Inspire.jsx
import React, { forwardRef, useState } from "react";
import { Text } from "@react-three/drei";
import { animated, useSpring } from "@react-spring/three";

const Inspire = forwardRef(function Inspire(
  {
    text,
    isActive = true,
    position = [0, 0, 0], // outer position controlled by Scene2Scroll
    fontSize = 2.2,
    maxWidth = 10,
    color = "#E7F4FF",
  },
  ref
) {
  const [hovered, setHovered] = useState(false);

  const fade = useSpring({
    // opacity: isActive ? 1 : 0,
    config: { tension: 160, friction: 26 },
  });
  const hover = useSpring({
    scale: hovered ? 1.06 : 1,
    config: { tension: 170, friction: 18 },
  });

  return (
    <group ref={ref} position={position}>
      <animated.group position-y={fade.y} scale={hover.scale}>
        <Text
          font="/fonts/Neue_Machina.ttf"
          fontSize={fontSize}
          maxWidth={maxWidth}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          toneMapped={false}
          depthTest={false}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <animated.meshBasicMaterial
            transparent
            opacity={fade.opacity}
            color={color}
          />
          {text}
        </Text>
      </animated.group>
    </group>
  );
});

export default Inspire;
