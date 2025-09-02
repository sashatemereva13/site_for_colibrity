function SceneTransition({
  show,
  color = "#0b0b0b",
  duration = 180, // ms
  blur = 0, // e.g. 6 for a soft blur veil
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
        // optional “filter” look:
        backdropFilter: blur ? `blur(${blur}px)` : "none",
        WebkitBackdropFilter: blur ? `blur(${blur}px)` : "none",
        background: color,
        opacity: show ? 1 : 0,
        transition: `opacity ${duration}ms linear`,
      }}
    />
  );
}

export default SceneTransition;
