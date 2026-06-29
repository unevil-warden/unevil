// Centralized visual theme for the globe + UI.
// Swap these values to retune the whole map (e.g. amber/red or mono) without touching components.
export const THEME = {
  space: "#05070d", // near-black background / starfield
  earth: "#16314a", // deep blue landmass fill
  earthEdge: "#2c4a66", // subtle land borders
  water: "#0a1524", // ocean (the globe sphere surface)
  atmosphere: "#2a6f9e", // rim glow color
  point: "#38e1ff", // glowing surveillance point
  pointBright: "#9af0ff", // selected / pulse highlight
  cluster: "#38e1ff",
  clusterText: "#03121a",
  uiText: "#dbe6f2",
  uiMuted: "#7d8ba0",
} as const;
