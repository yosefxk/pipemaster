# PipeMaster 🧩💧

A sleek, mobile-first pipe puzzle game for Android & Modern Browsers, inspired by classic infinity loops and minimalist pipe conduit puzzles.

---

## 📱 Features

- **🎮 Mobile-First & Android Native**:
  - Full-screen immersive mode with system bar hiding.
  - Native hardware back key navigation.
  - Tactile haptic vibration on rotation & victory via `AndroidNative` bridge.
  - Wake-lock to keep screen active during level play.
- **⚡ 100% Offline & Instant**: Zero external network or asset dependencies. Procedural Web Audio API sound synthesizer and vector SVG graphics.
- **🎲 Solvable Spanning Tree Generator**:
  - Uses randomized Prim's spanning tree algorithms with toroidal wrap-around adjacency to guarantee 100% solvable boards every time.
  - Difficulty tiers: **Easy** (simple curves), **Medium** (balanced network), **Hard** (dense tees & loops), **Master** (complex cross intersections).
- **🌐 Torus Wrap-Around Mode**:
  - Toggle edge flow where conduits exiting one screen edge seamlessly connect with the opposite border.
- **✨ Smart Hints & Solver**:
  - Solves one misaligned conduit and pins/locks it with a visual badge 📌 so it won't accidentally rotate.
- **⏱️ Live Timer & Stats Tracking**:
  - Real-time precision timer, move counter, hints tracker, and star ratings (★★★).
  - High score best times saved locally in storage.
- **🎨 4 Visual Themes**:
  - **Minimal Dark** (Classic slate, pearl pipes, glowing ice cyan water, lavender hub).
  - **Cyber Neon** (Dark matrix background, electric cyan plasma flow, magenta hub).
  - **Architect Blueprint** (Navy engineering grid, crisp chalk schematics, mint glow).
  - **Zen Garden** (Charcoal slate, golden bamboo conduits, emerald liquid).

---

## 🕹️ Controls & Navigation

| Action | Mobile Gesture / Mouse |
| :--- | :--- |
| **Rotate Clockwise (90°)** | Tap / Left-click tile |
| **Rotate Counter-Clockwise (90°)** | Long-press / Right-click tile |
| **Use Magic Hint** | Tap magic wand FAB button at bottom center |
| **Undo Last Move** | Tap **Undo** button in toolbar |
| **Restart Level** | Tap **Restart** button in toolbar |
| **Quick Play** | Launches immediately with Settings defaults |
| **Custom Game** | Configure dimensions ($3\times3$ to $12\times12$), difficulty, & wrap edges |

---

## 📦 Project Structure

```
pipes-game/
├── index.html              # Main mobile web app UI & game HUD
├── manifest.json           # PWA Web App Manifest
├── sw.js                   # Offline Service Worker cache
├── css/
│   └── style.css           # Minimal dark styling & responsive grid
├── js/
│   ├── engine.js           # Solvable Spanning Tree generator & flow solver
│   ├── render.js           # Scalable SVG pipe renderer with smooth transforms
│   ├── audio.js            # Procedural Web Audio synthesizer & haptics bridge
│   └── app.js              # State manager, timer, modals, & event handlers
├── icons/                  # PWA and app launcher icons
├── android/                # Native Android Gradle project (Kotlin + WebView)
│   ├── app/src/main/
│   │   ├── java/com/pipemaster/game/MainActivity.kt
│   │   ├── res/            # Colors, themes, icons, layouts
│   │   └── assets/         # Bundled offline web assets
│   ├── build.gradle.kts
│   └── gradlew
├── .github/workflows/
│   └── build-apk.yml       # GitHub Actions CI workflow to build APK
├── Dockerfile              # Lightweight Nginx container
├── docker-compose.yml      # Local container orchestration
└── README.md               # Documentation
```

---

## 🚀 How to Run & Build

### 1. Run in Browser / Local Server
Open `index.html` in any modern web browser or serve via Python:
```bash
python3 -m http.server 8080
```
Open `http://localhost:8080`.

### 2. Run via Docker Compose
```bash
docker compose up -d --build
```
Access at `http://localhost:8087`.

### 3. Build Android APK
When pushed to GitHub (`main` or `master` branch), the GitHub Actions workflow automatically compiles and outputs a standalone release APK:
- **GitHub Release**: Download the signed APK directly from the repository Releases.
- **Local Gradle Build** (if Android SDK is installed):
  ```bash
  cd android
  ./gradlew assembleDebug
  ```
  The resulting APK will be at `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 📜 License
MIT License
