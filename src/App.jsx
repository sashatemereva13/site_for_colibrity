// App.jsx
import { Canvas } from "@react-three/fiber";

import {
  ScrollControls,
  Preload,
  Loader,
  useGLTF,
  useTexture,
} from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";

import Scene1 from "./scene/Scene1";
import Scene2 from "./scene/Scene2";
import ShapeMatchingGame from "./game2D/ShapeMatchingGame";
import PersistentBird from "./sceneSwitch/PersistentBird";

import logo from "/textures/pattern.svg";

import WelcomeOverlay from "./scene1elements/WelcomeOverlay";
import AudioManager from "./allScenes/AudioManager";

import { useLanguage } from "./allScenes/LanguageProvider";

import GlobalButtons from "./allScenes/GlobalButtons";
import ThemePicker from "./allScenes/ThemePicker";
import BirdDebug from "./utils/BirdDebug";
import TVbutton from "./game2D/TVbutton";

export default function App() {
  const isMobile = window.innerWidth < 768;
  const [scenePhase, setScenePhase] = useState(1);
  const { lang, cycleLanguage } = useLanguage();
  const [transitionOn, setTransitionOn] = useState(false);

  const birdRef = useRef(null);

  const [showGame, setShowGame] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [activeTVId, setActiveTVId] = useState(() => "entrance");
  const [proceed, setProceed] = useState(false);

  // --- Assets to preload (fill these with your actual paths) ---
  const GLB_ASSETS = [
    // Scene 1
    "/models/hummingbird.glb",
    "/models/birdWithGlasses.glb",
    "/models/TV.glb",
    "/models/laptop.glb",
    // Scene 2
    "/models/hummingbird.glb",
  ];

  const TEX_ASSETS = [
    "/textures/pattern.svg",
    "/TV/TV_Analytics.mp4",
    "TV/TV_AR.mp4",
    "TV/TV_Code.mp4",
    "TV/TV_Design.mp4",
  ];

  // Optional: JS code-split prefetch (if you switch to lazy() chunks later)
  async function prefetchSceneModules() {
    // These imports tell the browser to fetch the JS chunks ahead of time
    import("./scene/Scene1");
    import("./scene/Scene2");
  }

  function PreloadAssets() {
    useEffect(() => {
      // Preload GLBs & textures
      GLB_ASSETS.forEach((p) => useGLTF.preload(p));
      TEX_ASSETS.forEach((p) => useTexture.preload(p));

      // Optional JS prefetch
      prefetchSceneModules();

      // Optional DRACO/KTX2 config if your GLBs are compressed:
      // useGLTF.setDecoderPath("/draco/");          // put draco wasm files here
      // useGLTF.setKTX2TranscoderPath("/basis/");   // if using KTX2 textures
    }, []);
    return null;
  }
  const { t } = useLanguage();
  const tvScreenById = {
    design: t("TVdesign"),
    development: t("TVdevelopment"),
    innovation: t("TVinnovation"),
    marketing: t("TVmarketing"),
    exit: t("TVexit"),
    entrance: t("TVentrance"),
  };

  const [themeOpen, setThemeOpen] = useState(false);

  const [withSound, setWithSound] = useState(null);

  const handleSelectMode = (val) => {
    setWithSound(val);
    localStorage.setItem("withSound", JSON.stringify(val));
  };

  const toggleSound = () => {
    const next = !withSound;
    setWithSound(next);
    localStorage.setItem("withSound", JSON.stringify(next));
  };

  return (
    <>
      {themeOpen && <ThemePicker />}
      {withSound === null && <WelcomeOverlay onSelect={handleSelectMode} />}
      <AudioManager
        enabled={withSound === true}
        src="/audio/soundtrack.mp3"
        volume={0.45}
      />
      <GlobalButtons
        withSound={withSound}
        onToggleSound={toggleSound}
        language={lang}
        onCycleLanguage={cycleLanguage}
        onToggleTheme={() => setThemeOpen((o) => !o)}
      />

      <Canvas
        onCreated={({ gl }) => {
          gl.setClearColor("#000", 1); // match both scenes
          gl.autoClear = false; // no automatic clear between renders
        }}
        frameloop="always"
        camera={{ fov: isMobile ? 65 : 55 }}
        gl={{ alpha: true }}
      >
        <Suspense>
          {gameWon && (
            <PersistentBird
              scenePhase={scenePhase}
              position={[-5, 2, -3]}
              ref={birdRef}
            />
          )}
          {scenePhase === 1 ? (
            <ScrollControls key="scene1" pages={10} damping={0.2}>
              <Scene1
                persistentBirdRef={birdRef}
                onGameTrigger={() => setShowGame(true)}
                tvActiveId={activeTVId}
                tvScreenById={tvScreenById}
                gameWon={gameWon}
                setGameWon={setGameWon}
                proceed={proceed}
                setProceed={setProceed}
                showGame={showGame}
                setShowGame={setShowGame}
                setActiveTVId={setActiveTVId}
                onWinBirdExit={() => {
                  setScenePhase(2);
                  requestAnimationFrame(() => {
                    document.querySelector("[data-scroll]")?.scrollTo(0, 0);
                  });
                }}
              />
            </ScrollControls>
          ) : (
            <ScrollControls key="scene2" pages={10} damping={0.15}>
              <Scene2 persistentBirdRef={birdRef} />
            </ScrollControls>
          )}

          {/* <Preload all /> */}
          <PreloadAssets />
        </Suspense>
      </Canvas>

      {showGame && (
        <>
          <div id="tvGameSlot" className="gameOverlay">
            <img className="tvGameLogo" src={logo} />
            <ShapeMatchingGame
              onWin={() => {
                setGameWon(true);

                setActiveTVId("exit");
              }}
              onDragStart={(id) => setActiveTVId(id)}
            />
          </div>

          <TVbutton
            armed={gameWon}
            onClick={() => {
              setProceed(true);
              setShowGame(false);
            }}
          />
        </>
      )}

      {/* Put this once in App.jsx, typically after the Canvas */}
      <Loader
        // optional styling:
        containerStyles={{ background: "#0b0b0b" }} // page backdrop while loading
        innerStyles={{ borderRadius: 8 }}
        barStyles={{ height: 6 }}
        dataStyles={{ fontSize: 14 }}
        dataInterpolation={(p) => `${p.toFixed(0)}%`}
        initialState={(active) => active} // show if anything is loading
      />
    </>
  );
}
