import { useState, useRef, useEffect } from "react";
import DraggableShape from "./DraggableShape";
import "../css/GameUI.css";

const shapes = [
  { id: "design", svg: "/gameShapes/design.svg" },
  { id: "development", svg: "/gameShapes/development.svg" },
  { id: "innovation", svg: "/gameShapes/innovation.svg" },
  { id: "marketing", svg: "/gameShapes/marketing.svg" },
];

const isMobile = window.innerWidth < 768;
const cellSize = isMobile ? 180 : 250; // 150 + 20
const gridSize = 2;

const marginLeft = isMobile ? 50 : 170;
const marginTop = isMobile ? 80 : 70;

const holePositions = [];
for (let row = 0; row < gridSize; row++) {
  for (let col = 0; col < gridSize; col++) {
    holePositions.push({
      left: `${marginLeft + col * cellSize}px`,
      top: `${marginTop + row * cellSize}px`,
    });
  }
}

const ShapeMatchingGame = ({ onWin, onDragStart }) => {
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
    const interval = setInterval(updateLayout, 1700);
    return () => clearInterval(interval);
  }, [placedShapes, lockedZones]);

  useEffect(() => {
    if (Object.keys(placedShapes).length === shapes.length) {
      if (!gameWon) {
        setGameWon(true);
        onWin?.();
      }
    }
  }, [placedShapes, gameWon]);

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
                onDragStart={onDragStart}
              />
            )
        )}
      </div>
    </div>
  );
};

export default ShapeMatchingGame;
