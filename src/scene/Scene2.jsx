import { useThree, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import "../css/StartButton.css";
import "../css/GameUI.css";

import DraggableShape from "../game/DraggableShape";
import ShapeHole from "../game/ShapeHole";
import GlowingNetwork from "../game/GlowingNetwork";
import teams from "../game/teams";

export default function Scene2({ onBack, gameStarted }) {
  const { camera } = useThree();
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [shapesPlaced, setShapesPlaced] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [networkVisible, setNetworkVisible] = useState(false);
  const [lockedHoles, setLockedHoles] = useState({});

  const progressRef = useRef(0);

  const startPos = new THREE.Vector3(0, 1.2, 3);
  const targetPos = new THREE.Vector3(0, 2, 8);

  // Smoothly move camera as soon as Scene2 is mounted
  useFrame(() => {
    progressRef.current = Math.min(progressRef.current + 0.01, 1);
    const lerpedPos = new THREE.Vector3().lerpVectors(
      startPos,
      targetPos,
      progressRef.current
    );
    camera.position.lerp(lerpedPos, 0.1);
    camera.lookAt(0, 1.5, 0);
  });

  // Timer logic only runs once game starts
  useEffect(() => {
    if (gameStarted && timeLeft > 0 && !gameOver && shapesPlaced < 4) {
      const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft <= 0) {
      setGameOver(true);
    }
  }, [gameStarted, timeLeft, gameOver, shapesPlaced]);

  const handleCorrectDrop = (id) => {
    setShapesPlaced((p) => p + 1);
    setScore((s) => s + 100);
    setLockedHoles((prev) => ({ ...prev, [id]: true }));
  };

  const handleWrongDrop = () => {
    setTimeLeft((t) => Math.max(0, t - 2));
  };

  useEffect(() => {
    if (shapesPlaced === 4) {
      setNetworkVisible(true);
    }
  }, [shapesPlaced]);

  return (
    <>
      {/* Scene background & lighting */}
      <color attach="background" args={["#B96921"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />

      {/* Timer */}
      {gameStarted && shapesPlaced < 4 && !gameOver && (
        <Html position={[0, 5, 0]} transform pointerEvents="none">
          <div className="timer">Time: {timeLeft}s</div>
        </Html>
      )}

      {/* Score */}
      {gameStarted && (
        <Html position={[0, 4, 0]} transform pointerEvents="none">
          <div className="score">Score: {score}</div>
        </Html>
      )}

      {/* Shapes progress */}
      {gameStarted && shapesPlaced < 4 && !gameOver && (
        <Html position={[0, -1, 0]} transform pointerEvents="none">
          <div className="shapesCounter">
            <div style={{ marginBottom: "0.5rem" }}>
              {shapesPlaced} / 4 Shapes Placed
            </div>
            <div>
              <div
                style={{
                  width: `${(shapesPlaced / 4) * 100}%`,
                  height: "100%",
                  background: "#5bffec",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        </Html>
      )}

      {/* Holes & shapes */}
      {teams.map((team) => (
        <ShapeHole
          key={team.id}
          {...team}
          position={team.holePos}
          speed={gameStarted ? 0.4 : 0}
          locked={lockedHoles[team.id]}
        />
      ))}

      {teams.map((team) => (
        <DraggableShape
          key={team.id}
          {...team}
          target={{ id: team.id, position: team.holePos }}
          onCorrectDrop={() => handleCorrectDrop(team.id)}
          onWrongDrop={handleWrongDrop}
          disabled={!gameStarted}
        />
      ))}

      {/* Network reveal after success */}
      {/* {networkVisible && (
        <>
          <GlowingNetwork
            points={[
              new THREE.Vector3(-3, 2, 0),
              new THREE.Vector3(-1, 2, 0),
              new THREE.Vector3(1, 2, 0),
              new THREE.Vector3(3, 2, 0),
              new THREE.Vector3(-3, 2, 0),
            ]}
          />
          <Html center position={[0, 3, 0]}>
            <div
              style={{
                color: "white",
                fontSize: "2rem",
                textAlign: "center",
              }}
            >
              Every team’s effort is vital.
              <br />
              Together, we deliver.
            </div>
            <button
              className="backButton"
              onClick={onBack}
              style={{ marginTop: "1rem" }}
            >
              Continue
            </button>
          </Html>
        </>
      )} */}

      {/* Game over */}
      {gameOver && (
        <Html center position={[0, 3, 0]}>
          <div style={{ color: "red", fontSize: "2rem" }}>Time’s up!</div>
          <button
            className="backButton"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </Html>
      )}
    </>
  );
}
