import React, { forwardRef, useState, useEffect } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { useSpring, animated } from "@react-spring/three";

const Inspire = forwardRef(
  ({ text, angleToCamera = 180, position = [0, 0, 0], ...props }, ref) => {
    const [hovered, setHovered] = useState(false);

    const opacityTarget = THREE.MathUtils.clamp(
      (angleToCamera - 120) / 60, // fades from 120° to 180°
      0,
      1
    );

    const { scale, animatedOpacity } = useSpring({
      scale: hovered ? 1.07 : 1,
      animatedOpacity: opacityTarget,
      config: { mass: 1, tension: 170, friction: 20 },
    });

    return (
      <animated.group
        ref={ref}
        position={position}
        scale={scale}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <Text
          font="/fonts/Neue_Machina.ttf"
          fontSize={3}
          anchorX="center"
          anchorY="middle"
          {...props}
        >
          <animated.meshBasicMaterial
            transparent
            opacity={animatedOpacity}
            color={hovered ? "#FF8C4F" : "#E7F4FF"}
          />
          {text}
        </Text>
      </animated.group>
    );
  }
);

export default Inspire;
