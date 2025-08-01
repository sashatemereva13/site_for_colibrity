import { useState, useRef, useEffect } from "react";
import DraggableShape from "./DraggableShape";
import "../css/GameUI.css";

const shapes = [
  { id: "circle", svg: "/gameShapes/circle.svg" },
  { id: "square", svg: "/gameShapes/square.svg" },
  { id: "triangle", svg: "/gameShapes/triangle.svg" },
  { id: "star", svg: "/gameShapes/star.svg" },
];

const cellSize = 130 + 20;
const gridSize = 3;

const holePositions = [];

for (let row = 0; row < gridSize; row++) {
  for (let col = 0; col < gridSize; col++) {
    holePositions.push({
      left: `${100 + col * cellSize}px`,
      top: `${row * cellSize}px`,
    });
  }
}

console.log("Generated hole positions:", holePositions);

const ShapeMatchingGame = () => {
  const [placedShapes, setPlacedShapes] = useState({});
  const [gameWon, setGameWon] = useState(false);
  const [holeLayout, setHoleLayout] = useState([]);
  const [lockedZones, setLockedZones] = useState({});

  const dropZoneRefs = useRef({});

  useEffect(() => {
    const updateLayout = () => {
      const availablePositions = holePositions.filter(
        (pos) =>
          !Object.values(lockedZones).some(
            (locked) => locked.left === pos.left && locked.top === pos.top
          )
      );

      const shuffled = [...availablePositions].sort(() => 0.5 - Math.random());
      const newLayout = [];

      for (let shape of shapes) {
        if (lockedZones[shape.id]) {
          newLayout.push(lockedZones[shape.id]);
        } else {
          newLayout.push(shuffled.pop());
        }
      }

      setHoleLayout(newLayout);
    };

    updateLayout();
    const interval = setInterval(updateLayout, 5000);
    return () => clearInterval(interval);
  }, [placedShapes, lockedZones]);

  useEffect(() => {
    if (Object.keys(placedShapes).length === shapes.length) {
      setGameWon(true);
    }
  }, [placedShapes]);

  const handleDropSuccess = (id) => {
    const index = shapes.findIndex((s) => s.id === id);

    setPlacedShapes((prev) => ({ ...prev, [id]: true }));

    setLockedZones((prev) => ({
      ...prev,
      [id]: holeLayout[index],
    }));
  };

  return (
    <div className="shapeGameContainer">
      {shapes.map((shape, index) => {
        const pos = holeLayout[index];
        if (!pos) return null;

        return (
          <div
            key={shape.id}
            ref={(el) => (dropZoneRefs.current[shape.id] = el)}
            className={`dropZone ${
              placedShapes[shape.id] ? "filled" : "empty"
            }`}
            style={pos}
            data-id={shape.id}
          >
            {placedShapes[shape.id] ? (
              <img src={shape.svg} alt={shape.id} className="lockedShape" />
            ) : (
              <img src={shape.svg} alt={shape.id} className="previewShape" />
            )}
          </div>
        );
      })}

      <div className="shapeRow">
        {shapes.map(
          (shape) =>
            !placedShapes[shape.id] && (
              <DraggableShape
                key={shape.id}
                shape={shape}
                dropZones={dropZoneRefs}
                onDropSuccess={handleDropSuccess}
              />
            )
        )}
      </div>
      <div className="gameRules">
        <p>pull and shoot the shapes into the matching holes</p>
      </div>

      {gameWon && <div className="winMessage">✨ You Win! ✨</div>}
    </div>
  );
};

export default ShapeMatchingGame;
