import { useRef, useState } from "react";
import { useSpring, animated } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";

const DraggableShape = ({ shape, dropZones, onDropSuccess }) => {
  const ref = useRef();

  const [spring, api] = useSpring(() => ({
    x: 0,
    y: 0,
    config: { tension: 300, friction: 20 },
  }));

  const bind = useDrag(
    ({ down, movement: [mx, my], last }) => {
      if (down) {
        api.start({ x: mx, y: my });
      }

      if (last) {
        const dragDistance = Math.sqrt(mx * mx + my * my);
        const strength = Math.min(dragDistance / 100, 2.5);

        const impulseX = -mx * strength;
        const impulseY = -my * strength;

        api.start({
          x: impulseX,
          y: impulseY,
          config: { tension: 150, friction: 15 },
          onRest: () => {
            const shapeRect = ref.current.getBoundingClientRect();

            for (const [id, el] of Object.entries(dropZones.current)) {
              if (!el) continue;
              const zoneRect = el.getBoundingClientRect();

              const shapeCenterX = shapeRect.left + shapeRect.width / 2;
              const shapeCenterY = shapeRect.top + shapeRect.height / 2;

              const isHit =
                shapeCenterX > zoneRect.left &&
                shapeCenterX < zoneRect.right &&
                shapeCenterY > zoneRect.top &&
                shapeCenterY < zoneRect.bottom;

              if (isHit && id === shape.id) {
                onDropSuccess(id);
                return;
              }
            }

            // Snap back if no match
            api.start({ x: 0, y: 0, config: { tension: 300, friction: 20 } });
          },
        });
      }
    },
    {
      from: () => [0, 0], // Always drag relative to original
      bounds: undefined, // No limits
      rubberband: true, // Allow elastic pull
    }
  );

  return (
    <animated.div
      {...bind()}
      ref={ref}
      className="draggableShape"
      style={spring}
    >
      <img src={shape.svg} alt={shape.id} />
    </animated.div>
  );
};

export default DraggableShape;
