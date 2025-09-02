import { Text } from "@react-three/drei";
import { forwardRef, useRef } from "react";

const Logo = forwardRef((props, ref) => {
  const isMobile = window.innerWidth < 768;

  return (
    <>
      <group rotation={[0, 0, 0]} ref={ref} position={props.position}>
        <Text
          font="/fonts/Neue_Machina.ttf"
          fontSize={isMobile ? 3 : 6}
          color="#ffffff"
        >
          COLIBRITY
        </Text>
        <Text
          font="/fonts/Neue_Machina.ttf"
          fontSize={isMobile ? 0.5 : 0.9}
          color="#ffffff"
          position={isMobile ? [0, -2, 0] : [0, -3, 0]}
          maxWidth={isMobile ? 10 : 20} // world units, not px
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          lineHeight={1.2}
          letterSpacing={0}
          toneMapped={false} // keep pure white
        >
          créateur de sites internet haut de gamme, sur mesure et clés en main
        </Text>
      </group>
    </>
  );
});

export default Logo;
