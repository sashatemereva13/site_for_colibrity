import { Canvas } from "@react-three/fiber";
import { useRef, useState, useEffect, Suspense } from "react";

import { Float } from "@react-three/drei";
import { ScrollControls as DreiScrollControls } from "@react-three/drei";

import Scene from "./scroll/Scene";
import Hummingbird from "./models/Hummingbird";

import Logo from "./text/Logo";
import Inspire from "./text/Inspire";

import Loader from "./utils/Loader";

import BackgroundFX from "./background/BackgroundFX";
import Flowers from "./models/Flowers";
import FlowerRing from "./models/FlowerRing";
import BackGarden from "./background/BackGarden";

export default function App() {
  const hummingbird = useRef();
  const logo = useRef();
  const scrollRef = useRef(0);

  // Create refs for all phrases
  const phraseRefs = [useRef(), useRef(), useRef()];
  const [phraseAngles, setPhraseAngles] = useState([180, 180, 180]);

  const [scrollValue, setScrollValue] = useState(0);

  const messages = [
    "trust the wings",
    "immerse yourself",
    "we are already flying",
  ];

  useEffect(() => {
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 0);
  }, []);

  // You can keep phrase state if you want to highlight current phrase or for other UI logic
  const [phrase, setPhrase] = useState(0);

  return (
    <>
      {/* 3D Canvas */}
      <div className="canvas-container">
        <Canvas
          dpr={window.devicePixelRatio}
          frameloop="always"
          camera={{ position: [0, 3, 0], fov: 45, near: 0.1, far: 1000 }}
          style={{ background: "black" }}
        >
          <ambientLight intensity={0.7} />

          <Suspense fallback={<Loader />}>
            <DreiScrollControls pages={20} damping={0.5}>
              <Scene
                setPhrase={setPhrase}
                logo={logo}
                hummingbird={hummingbird}
                phraseRefs={phraseRefs}
                scrollRef={scrollRef}
                setScrollValue={setScrollValue}
                setPhraseAngles={setPhraseAngles}
              />
              <Logo ref={logo} position={[0, 0, 0]} />
              {messages.map((text, i) => (
                <Inspire
                  key={i}
                  ref={phraseRefs[i]}
                  text={messages[i]}
                  position={[0, 0, 0]} // dummy, overwritten
                  angleToCamera={phraseAngles[i] ?? 180}
                />
              ))}

              <Float
                speed={3} // Animation speed, defaults to 1
                rotationIntensity={1} // XYZ rotation intensity, defaults to 1
                floatIntensity={0.5} // Up/down float intensity, works like a multiplier with floatingRange,defaults to 1
                floatingRange={[-1, 3]} // Range of y-axis values the object will float within, defaults to [-0.1,0.1]
              >
                <Hummingbird ref={hummingbird} />
              </Float>

              <Flowers />
              <FlowerRing yPosition={30} scrollRange={[0.3, 0.45]} />
              <FlowerRing yPosition={50} scrollRange={[0.7, 1]} />
              <FlowerRing yPosition={90} scrollRange={[0.9, 1]} />
            </DreiScrollControls>

            <BackgroundFX />
            <BackGarden scrollValue={scrollValue} />
          </Suspense>
          {/* <SparkleCloud scrollValue={scrollValue} /> */}
        </Canvas>
      </div>
    </>
  );
}
