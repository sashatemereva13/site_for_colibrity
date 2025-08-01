import { Html } from "@react-three/drei";
import "../css/StartButton.css"; // optional, for styles

export default function StartButton({ position }) {
  return (
    <Html position={position} center zIndexRange={[100]}>
      <button className="start-button">Start Creating</button>
    </Html>
  );
}
