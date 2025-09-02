import { useEffect, useRef } from "react";

export default function AudioManager({
  enabled,
  src = "/audio/soundtrack.mp3",
  loop = true,
  volume = 0.5,
}) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.loop = loop;
      audioRef.current.volume = volume;
    }

    audioRef.current.loop = loop;
    audioRef.current.volume = volume;
  }, [src, loop, volume]);

  useEffect(() => {
    if (enabled) {
      audioRef.current?.play().catch(() => {
        // autoplay might be blocked if there is no user gesture
      });
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [enabled]);

  return null;
}
