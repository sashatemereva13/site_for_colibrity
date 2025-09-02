import { useRef, useState } from "react";
import { useSpring, animated } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";

const DraggableShape = ({
  shape,
  dropZones,
  onDropSuccess,
  onPullStart,
  onPullMove,
  onPullEnd,
  onDragStart,
}) => {
  const ref = useRef();
  const [locked, setLocked] = useState(false);

  const [spring, api] = useSpring(() => ({
    x: 0,
    y: 0,
    config: { duration: 0 }, // No easing
  }));

  const bind = useDrag(
    ({ down, movement: [mx, my], last, first, event }) => {
      if (first) {
        const start = { x: event.clientX, y: event.clientY };
        onPullStart?.(start);
        onDragStart?.(shape.id);
        setLocked(false);
        api.set({ x: 0, y: 0 }); // Reset position
      }

      if (down) {
        api.start({ x: mx, y: my, config: { duration: 0 } });

        const current = { x: event.clientX, y: event.clientY };
        onPullMove?.(current);
      }

      if (last) {
        onPullEnd?.();

        const dragDistance = Math.sqrt(mx * mx + my * my);
        const strength = Math.min(dragDistance / 100, 2.5);
        const impulseX = -mx * strength;
        const impulseY = -my * strength;

        api.start({
          x: impulseX,
          y: impulseY,
          config: { duration: 500, easing: (t) => t }, // Linear motion
          onChange: (result) => {
            const el = ref.current;
            if (!el || locked) return;

            const shapeRect = el.getBoundingClientRect();
            for (const [id, elZone] of Object.entries(dropZones.current)) {
              if (!elZone) continue;

              const zoneRect = elZone.getBoundingClientRect();
              const shapeCenterX = shapeRect.left + shapeRect.width / 2;
              const shapeCenterY = shapeRect.top + shapeRect.height / 2;

              const dx = shapeCenterX - (zoneRect.left + zoneRect.width / 2);
              const dy = shapeCenterY - (zoneRect.top + zoneRect.height / 2);
              const distance = Math.sqrt(dx * dx + dy * dy);

              const isMobile = window.innerWidth < 768;
              const isHit = distance < (isMobile ? 120 : 100);

              if (isHit && id === shape.id) {
                onDropSuccess(id);
                setLocked(true);

                api.stop();
                api.start({
                  x: zoneRect.left - shapeRect.left,
                  y: zoneRect.top - shapeRect.top,
                  config: {
                    duration: 1000,
                    easing: (t) =>
                      t === 0
                        ? 0
                        : t === 1
                        ? 1
                        : Math.pow(2, -10 * t) *
                            Math.sin(((t - 0.075) * (2 * Math.PI)) / 0.3) +
                          1,
                  },
                });
                return;
              }
            }
          },
          onRest: () => {
            if (!locked) {
              api.start({
                x: 0,
                y: 0,
                config: { duration: 300, easing: (t) => t },
              });
            }
          },
        });
      }
    },
    {
      from: () => [0, 0],
      bounds: undefined,
      rubberband: true,
    }
  );

  return (
    <animated.div
      {...bind()}
      ref={ref}
      className="draggableShape"
      style={spring}
    >
      <img src={shape.svg} alt={shape.id} draggable="false" />
    </animated.div>
  );
};

export default DraggableShape;
