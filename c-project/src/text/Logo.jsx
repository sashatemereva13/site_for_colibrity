import { Text } from "@react-three/drei";
import { forwardRef, useRef } from "react";

const Logo = forwardRef((props, ref) => {
  return (
    <>
      <group rotation={[0, 0, 0]} ref={ref} position={props.position}>
        <Text font="/fonts/Neue_Machina.ttf" fontSize={6} color="#AFAAAD">
          COLIBRITY
        </Text>
      </group>
    </>
  );
});

export default Logo;
