// App.jsx
import { Canvas } from "@react-three/fiber";
import { ScrollControls } from "@react-three/drei";
import { useState } from "react";
import { EffectComposer, Bloom } from "@react-three/postprocessing";

import Scene1 from "./scene/Scene1";
import ShapeMatchingGame from "./game2D/ShapeMatchingGame";

export default function App() {
  const [showGame, setShowGame] = useState(false);

  return (
    <>
      <Canvas camera={{ fov: 60 }}>
        <ScrollControls pages={5} damping={0.2}>
          <Scene1 onGameTrigger={() => setShowGame(true)} />
        </ScrollControls>
      </Canvas>

      {showGame && (
        <div className="gameOverlay">
          <ShapeMatchingGame />
        </div>
      )}
    </>
  );
}
