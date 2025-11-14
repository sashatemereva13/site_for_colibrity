import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

const ParallaxLayer = ({ scrollRef, depth = 0, speed = 1, children }) => {
  const group = useRef();

  useFrame(() => {
    if (group.current && scrollRef.current !== undefined) {
      const t = scrollRef.current;
      group.current.position.z = -depth + t * speed;
    }
  });

  return <group ref={group}>{children}</group>;
};

export default ParallaxLayer;
