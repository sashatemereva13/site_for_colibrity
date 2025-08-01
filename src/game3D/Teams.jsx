const teams = [
  {
    id: "cube",
    shape: "cube",
    label: "Personal Vision",
    color: "#A6FFD1",
    position: [1.2, -1, 2],

    birdPos: [0, -1, 1], // initial position

    holePos: [-0.7, 1.8, 0.05],
    holeDepth: 0.8,
    holeColor: "#649E80",
  },
  {
    id: "sphere",
    shape: "sphere",
    label: "Ideas",
    color: "#89C2FF",
    position: [0.4, -1, 2],

    birdPos: [0, -1.2, 1],

    holePos: [-0.7, 0, 0.05],
    holeDepth: 1,
    holeColor: "#547AA2",
  },
  {
    id: "cone",
    shape: "cone",
    label: "Thoughts",
    color: "#B89BFF",
    position: [-0.2, -1, 2],

    birdPos: [0.2, -0.5, 1],

    holePos: [0.7, 1.5, 0.05],
    holeDepth: -0.3,
    holeColor: "#7360A6",
  },
  {
    id: "torus",
    shape: "torus",
    label: "Inspiration",
    color: "#FFD580",
    position: [-0.7, -1, 2],

    birdPos: [0, -1, 1],

    holePos: [0.7, 0, 0.05],
    holeDepth: 1,
    holeColor: "#AA8B4E",
  },
];

export default teams;
