import ShapeHole from "./ShapeHole";
import DraggableShape from "./DraggableShape";
import teams from "./Teams";
import { useState, useEffect, useRef, useMemo } from "react";
import { Text, useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import ConfettiBurst from "../effects/ConfettiBurst";
import TV from "../details/TV";

const HOLE_SPOTS = [
  [-0.8, 1.8, 0.05],
  [0.8, 1.8, 0.05],
  [-0.8, 0.2, 0.05],
  [0.8, 0.2, 0.05],
];

const getRandomSpots = (count, usedSpots = []) => {
  const available = HOLE_SPOTS.filter(
    (spot) =>
      !usedSpots.some(
        (u) => u[0] === spot[0] && u[1] === spot[1] && u[2] === spot[2]
      )
  );

  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }

  return available.slice(0, count);
};

const TVgame = ({ tvRef, onWrongDrop }) => {
  const [holePositions, setHolePositions] = useState(() =>
    Object.fromEntries(teams.map((team) => [team.id, team.holePos]))
  );
  const [lockedHoles, setLockedHoles] = useState({});
  const [movingHoles, setMovingHoles] = useState(false);

  const [gameWon, setGameWon] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const [highlightedHoleId, setHighlightedHoleId] = useState(null);

  const holePositionsRef = useRef(holePositions);
  holePositionsRef.current = holePositions;

  const lockedHolesRef = useRef(lockedHoles);
  lockedHolesRef.current = lockedHoles;

  const holeRefs = useRef({}); // Store refs for each hole for GSAP animations

  const scroll = useScroll();
  const teamIds = useMemo(() => teams.map((t) => t.id), []);

  // Centralized move function (so we can use it on mount & in intervals)
  const moveHoles = () => {
    setMovingHoles(true);

    const currentPositions = { ...holePositionsRef.current };
    const lockedIds = teamIds.filter((id) => lockedHolesRef.current[id]);
    const unlockedIds = teamIds.filter((id) => !lockedHolesRef.current[id]);

    const lockedPositions = lockedIds.map((id) => currentPositions[id]);
    const freshPositions = getRandomSpots(unlockedIds.length, lockedPositions);

    unlockedIds.forEach((id, idx) => {
      currentPositions[id] = freshPositions[idx];
    });

    const newPositions = { ...currentPositions };
    holePositionsRef.current = newPositions;
    setHolePositions({ ...newPositions, _tick: Date.now() }); // Force React re-render

    // Animate holes when they move
    unlockedIds.forEach((id) => {
      const hole = holeRefs.current[id];
      if (!hole) return;

      const material = hole.material;
      if (!material) return;
    });

    // Log snap readiness
    const snapDelay = 700;
    setTimeout(() => {
      console.log(
        `%c🟢 Holes finished moving, shapes can now snap (after ${snapDelay}ms)`,
        "color: limegreen; font-weight: bold"
      );
      setMovingHoles(false);
    }, snapDelay);
  };

  useEffect(() => {
    if (gameWon) return;

    // Pop animation when the game starts
    teams.forEach((team) => {
      if (!lockedHolesRef.current[team.id] && holeRefs.current[team.id]) {
        gsap.fromTo(
          holeRefs.current[team.id].group.scale,
          { x: 1, y: 1, z: 1 },
          {
            x: 0.5,
            y: 0.5,
            z: 1,
            duration: 0.2,
            ease: "power2.in",
            yoyo: true, // bounce back effect
            repeat: 1,
          }
        );
      }
    });

    // First shuffle & continuous interval
    moveHoles();
    const intervalId = setInterval(moveHoles, 4000);

    return () => clearInterval(intervalId);
  }, [gameWon, teamIds]);

  const handleCorrectDrop = (id) => {
    const lockedPos = holePositionsRef.current[id];
    setHolePositions((prev) => ({ ...prev, [id]: lockedPos }));
    holePositionsRef.current[id] = lockedPos;

    setLockedHoles((prev) => {
      const updated = { ...prev, [id]: true };

      if (Object.keys(updated).length === teams.length) {
        setGameWon(true);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 6000);
      }
      return updated;
    });
  };

  useFrame(() => {
    const t = scroll.offset;
    if (t >= 0.951 && !showHelp) setShowHelp(true);
    else if (t < 0.95 && showHelp) setShowHelp(false);
  });

  return (
    <group ref={tvRef} position={[0, 3, -11]}>
      <TV />

      {/* Holes */}
      {teams.map((team) => (
        <ShapeHole
          key={`hole-${team.id}`}
          ref={(el) => (holeRefs.current[team.id] = el)}
          {...team}
          position={holePositions[team.id] || team.holePos}
          locked={lockedHoles[team.id]}
          highlighted={highlightedHoleId === team.id}
        />
      ))}

      {/* Draggable Shapes */}
      {teams.map((team) => (
        <DraggableShape
          key={`shape-${team.id}`}
          {...team}
          position={team.position}
          target={
            holePositions[team.id]
              ? {
                  id: team.id,
                  shape: team.shape,
                  position: holePositions[team.id],
                }
              : null
          }
          onCorrectDrop={handleCorrectDrop}
          onWrongDrop={onWrongDrop}
          onHighlightHole={(id) => setHighlightedHoleId(id)}
          disabled={movingHoles}
          movingHoles={movingHoles}
        />
      ))}

      {/* Win text + confetti */}
      {gameWon && (
        <>
          <Text
            position={[0, -1, 0.2]}
            fontSize={0.5}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            and it works
          </Text>
          {showConfetti && <ConfettiBurst count={80} area={[5, 5]} />}
        </>
      )}

      {/* Help text */}
      {showHelp && !gameWon && (
        <Text
          rotation={[Math.PI / 7, 0, 0]}
          fontSize={0.2}
          color="white"
          maxWidth={3}
          lineHeight={1.2}
          letterSpacing={0.02}
          textAlign="center"
          anchorX="center"
          anchorY="bottom"
          position={[0, 3.3, -1]}
        >
          pull and shoot the shapes into the matching holes
        </Text>
      )}
    </group>
  );
};

export default TVgame;
