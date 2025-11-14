// components/Loader.jsx
import { Html, useProgress } from "@react-three/drei";

export default function Loader() {
  const { progress } = useProgress();

  return (
    <Html center>
      <div
        style={{ color: "#fff", fontFamily: "sans-serif", textAlign: "center" }}
      >
        <div>Loading...</div>
        <div>{progress.toFixed(0)}%</div>
      </div>
    </Html>
  );
}
