import { createContext, useContext, useMemo, useState, useEffect } from "react";
import matcap1 from "/matcaps/1.png";
import matcap2 from "/matcaps/2.png";
import matcap3 from "/matcaps/3.png";
import matcap4 from "/matcaps/4.png";
import matcap5 from "/matcaps/5.png";
import matcap6 from "/matcaps/6.png";
import matcap7 from "/matcaps/7.png";
import matcap8 from "/matcaps/8.png";
import matcap9 from "/matcaps/9.png";
import matcap10 from "/matcaps/10.png";
import matcap11 from "/matcaps/11.png";
import matcap12 from "/matcaps/12.png";

export const ThemeCtx = createContext(null);

export const MATCAPS = [
  matcap1,
  matcap2,
  matcap3,
  matcap4,
  matcap5,
  matcap6,
  matcap7,
  matcap8,
  matcap9,
  matcap10,
  matcap11,
  matcap12,
];

const TINTS = [
  "#FFF4EF",
  "#F5E6FF",
  "#E0C3FC",
  "#C6E7FF",
  "#B8FFC8",
  "#FFE8B3",
  "#FFC6C6",
  "#FFD6E3",
  "#C9FFE6",
  "#B3E5FF",
  "#D0D0FF",
  "#E9FFB3",
];

export function ThemeProvider({ children }) {
  const [matcapIndex, setMatcapIndex] = useState(() => {
    const v = localStorage.getItem("matcapIndex");
    return v ? Number(v) : 0;
  });

  const [tintIndex, setTintIndex] = useState(() => {
    const v = localStorage.getItem("tintIndex");
    return v ? Number(v) : 0;
  });

  const [shade, setShade] = useState(() => {
    const v = localStorage.getItem("shade");
    return v ? Number(v) : 0.7;
  });

  useEffect(
    () => localStorage.setItem("matcapIndex", String(matcapIndex)),
    [matcapIndex]
  );
  useEffect(
    () => localStorage.setItem("tintIndex", String(tintIndex)),
    [tintIndex]
  );
  useEffect(() => localStorage.setItem("shade", String(shade)), [shade]);

  const value = useMemo(
    () => ({
      mats: MATCAPS,
      tints: TINTS,
      matcapIndex,
      tintIndex,
      shade,
      setMatcapIndex,
      setTintIndex,
      setShade,
      nextMatcap: () => setMatcapIndex((i) => (i + 1) % MATCAPS.length),
      nextTint: () => setTintIndex((i) => (i + 1) % TINTS.length),
      randomize: () => {
        setMatcapIndex(Math.floor(Math.random() * MATCAPS.length));
        setTintIndex(Math.floor(Math.random() * TINTS.length));
        setShade(Math.random() * 0.5 + 0.5);
      },
    }),
    [matcapIndex, tintIndex, shade]
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
