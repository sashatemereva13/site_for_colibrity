# Colibrity Interactive Website — Summer Internship 2025

This repo contains all work completed during my summer internship at **Colibrity**, a Paris‑based creative digital agency. The project is an immersive, multi‑scene 3D website built using **React**, **React Three Fiber**, **Three.js**, **Framer Motion**, and custom shaders.

The site follows a narrative experience centered around a hummingbird (the _Colibri_ mascot) that travels through different rooms and corridors, each representing a part of the agency's world.

---

## 🚀 Project Overview

### **Core Concept**

Create a fluid, immersive 3D journey where a hummingbird guides the user through:

- Floating corridor
- Interactive room
- Storytelling‑driven UI overlays
- Interactive screens (TVs, laptops, panels)

The goal was to produce something visually impressive but lightweight enough to run smoothly in a browser.

---

## 🧩 Main Features

### 🕊️ **Hummingbird System**

- `MainBird`, `WinBird`, and `PersistentBird` models
- Smooth spline‑based flight path animation
- State transitions between scenes
- Subtle idle motions (wings, body tilt, rotation)

### 🌀 **Portals & Transitions**

- Custom portal shader with distortion + glow
- Animated portal bursts when entering/exiting scenes
- Rain particles inside portals
- Scene‑to‑scene camera interpolation

### 🧱 **Scenes & Rooms**

- Corridor rooms with animated materials (`CorridorWallMaterial`, custom floor shaders)
- Story rooms representing various teams (developers, designers, project managers)
- Ambient lighting designed for depth and mood
- Clouds, sparkles, god rays, sea‑like floor effects

### 📺 **Interactive Objects**

- TV screens that trigger mini‑experiences
- Laptop displays with animated text
- Tables, clouds, floating elements
- A quiz that triggers a 2D drag‑and‑drop game on a TV screen

### 🎮 **Games & Micro‑Interactions**

- Drag‑and‑Drop Shape Matching (React + Framer Motion)
- Shape physics using `@use-gesture/react` and `@react-spring/web`
- Visual glow effects and success animations

### ✨ **Shaders**

Custom GLSL shaders created or improved during the internship:

- Portal shader
- Portal burst shader
- Floor grid shader
- Cloud glow shader
- Spark particle shader (GPU‑friendly)

---

## 🏗️ Tech Stack

- **React 18**
- **React Three Fiber (R3F)**
- **Three.js**
- **Framer Motion**
- **React Spring**
- **@use-gesture/react**
- **Vite**
- **GLSL shaders**

---

## 📂 Project Structure (High-Level)

```
src/
├─ components/
│  ├─ birds/
│  ├─ portals/
│  ├─ rooms/
│  ├─ shaders/
│  ├─ ui/
│  └─ tvGame/
├─ scenes/
├─ assets/
│  ├─ models/
│  └─ textures/
├─ utils/
└─ App.jsx
```

---

## 🎯 Key Contributions

During this internship I:

- Built multiple R3F scenes completely from scratch
- Created custom shaders and improved existing ones
- Designed interactive 3D transitions and immersive storytelling flow
- Implemented the entire drag‑and‑drop game system
- Optimized asset loading and memory usage
- Set up structure for future extensibility (scenes, bird logic, portal system)

---

## 🔮 Future Improvements

- Add mobile‑optimized fallback scenes
- LOD (Level of Detail) for heavier objects
- Add more mini‑games inside TVs
- Expand world with new corridors and environments

---

## 👤 Authors

**Sasha Temereva** — Front‑End Developer & 3D Web Designer
Summer Internship at **Colibrity**, Paris (2025)

The 3D objects were created by 3D Desgners.

The project was led by Maria Vasyk, the CEO of Colibrity.

---

If you're reviewing this repo for recruitment or collaboration, feel free to reach out for a walkthrough of the architecture or any scene logic!
