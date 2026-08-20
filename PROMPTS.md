# Jaseem Nizardeen — 3D Holographic Portfolio · Prompt Pack

> Everything you need to build the site: the **3D "me"** prompt, the **UI** prompt,
> and the **Three.js build** prompt (paste this into any AI coding tool).

---

## 0. The Concept (one-liner)

A hi-tech, dark-themed single-page portfolio where a **3D holographic avatar of Jaseem**
starts as a floating **head + name**, and as the user **scrolls**, the camera travels down
the body (head → chest → legs) and transitions into the **next content sections**
(Skills, About/Location, Contact).

---

## 1. 📸 Prompt — Generate the 3D "Me" (avatar)

Use this with a likeness tool (Ready Player Me, Meshy, Tripo AI, Rodin, Luma, Kaedim)
or a text-to-3D tool (Meshy/Tripo). **For a real likeness, replace `[ATTACH YOUR PHOTO]`
with an actual clear front-facing photo of you.**

### 1a. Text-to-3D (no photo needed — stylized)
```
Stylized game-ready 3D avatar of a friendly young South Asian man in his early 20s,
short black hair, neat light beard, confident warm smile. Wearing a modern dark tech
hoodie. Full body, standing, arms relaxed, facing forward, A-pose.
Clean topology, watertight mesh, 1 single mesh or separated head/body/clothes.
PBR materials, dark navy + neon cyan and electric purple accents.
Realistic stylized (Pixar-quality). Neutral dark studio background.
Output: GLB/GLTF, rigged, ~50k triangles, 4K texture.
```

### 1b. Photo-to-3D (for your exact face)
```
Create a 3D head-and-shoulders model of the person in [ATTACH YOUR PHOTO].
Keep the exact facial proportions, skin tone, hair and beard.
Style: semi-realistic stylized hero character, friendly smile.
Output a clean GLB/GLTF with PBR textures, no background, centered, front-facing.
```

### 1c. Splitting it for the scroll effect (important!)
For the **head → body** scroll reveal, the model works best in **3 parts** so you can
fade/materialize each zone as the camera moves down:

| Part | What it shows |
|------|---------------|
| `head.glb` | Head + neck + shoulders — used in the hero |
| `torso.glb` | Chest, arms, hoodie |
| `legs.glb` | Legs + shoes |

If your tool outputs one full body, just ask: *"export as 3 separate GLB groups: head,
torso, legs, all sharing the same origin/rig."*

---

## 2. 🎨 Prompt — UI / Site Design (matches `ui-design.png`)

```
Hi-tech futuristic personal portfolio website, dark theme, single page, vertical scroll.
Hero: floating 3D holographic HEAD of a young South Asian man with rotating wireframe
rings, HUD targeting reticle, scanning lines and data readouts. Big neon name
"JASEEM NIZARDEEN" with subtle glitch effect, subtitle "Web Developer".
On scroll: the 3D body reveals progressively head -> chest -> legs, holographic wireframe
+ solid material, camera smoothly follows.
Next sections: (1) Skills chips — HTML, CSS, JavaScript, React, TypeScript, VBA, SQL;
(2) About — location "Kattankudy, Batticaloa, Sri Lanka"; (3) Contact "+94 759 825 269".
Neon cyan (#00F0FF) and electric purple (#7C3AED) on deep navy/black (#050814),
glassmorphism panels, faint grid lines, particle sparkles, right-side scroll indicator.
Typography: futuristic sans (Orbitron / Space Grotesk / Rajdhani).
Ultra-detailed UI/UX, Dribbble/Behance quality.
```

---

## 3. 🧱 Prompt — Build the Three.js Site (paste into an AI coder)

```
Build a single-page 3D animated portfolio website using Three.js (react-three-fiber is fine).

CONTENT
- Name: Jaseem Nizardeen
- Role: Web Developer
- Skills: HTML, CSS, JavaScript, React, TypeScript, VBA, SQL
- Location: Kattankudy 01, Batticaloa, Sri Lanka
- Contact: +94 759 825 269

TECH
- Three.js + GSAP ScrollTrigger (or react-three-fiber + framer-motion)
- Vite dev server, responsive, bind to 0.0.0.0
- Dark hi-tech theme: background #050814, neon cyan #00F0FF, purple #7C3AED
- Fonts: Orbitron (headings) + Rajdhani or Space Grotesk (body)

SCENE & SCROLL BEHAVIOUR (the core requirement)
1. Load a rigged GLB avatar (or 3 group GLBs: head / torso / legs) at world origin.
2. Section 1 (0% scroll) — camera close on the FACE. Around the head show a HUD:
   rotating wireframe ring, reticle, scan lines, floating data tags.
   Overlay: name "JASEEM NIZARDEEN" (glitch/neon) + "Web Developer" + scroll hint.
3. As the user scrolls (0% -> 40%), the camera moves DOWN the body:
   head -> chest -> legs. Use a holographic material shader that reveals each body
   part (fresnel glow + scanline dissolve) as the camera passes it.
4. Section 2 (~40% scroll) — camera at legs/full body, then transition to SKILLS:
   chips [HTML, CSS, JavaScript, React, TypeScript, VBA, SQL] with hover glow.
5. Section 3 — ABOUT: "Kattankudy 01, Batticaloa, Sri Lanka" with an animated
   location pin / map grid.
6. Section 4 — CONTACT: phone "+94 759 825 269" as a tap-to-call button,
   plus a mail/social row.
7. Smooth everything: lerp the camera, ease the scroll, parallax the HUD.

EFFECTS
- Post-processing: bloom (UnrealBloomPass) for the neon glow.
- Particle field (floating sparks) in the background.
- Grid floor + fog.
- Loading screen with progress bar.

DELIVERABLES
- Full working project, responsive (mobile: stack content, keep 3D behind).
- Clear README with run instructions (npm install && npm run dev).
```

---

## 4. 🗂️ Suggested Project Structure

```
profile-3d/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.js              # boot + scene setup
│   ├── App.jsx              # (if react) layout + sections
│   ├── three/
│   │   ├── Scene.js         # renderer, camera, lights, fog
│   │   ├── Avatar.js        # loads head/torso/legs GLBs, reveal shader
│   │   ├── HUD.js           # rings, reticle, data tags
│   │   ├── Particles.js     # sparkle field
│   │   └── effects.js       # bloom, scanlines
│   ├── sections/
│   │   ├── Hero.jsx
│   │   ├── Skills.jsx
│   │   ├── About.jsx
│   │   └── Contact.jsx
│   └── styles/global.css
├── public/models/           # head.glb, torso.glb, legs.glb (or me.glb)
└── README.md
```

---

## 5. 🎨 Design Tokens (for consistency)

| Token | Value |
|-------|-------|
| Background | `#050814` |
| Panel (glass) | `rgba(255,255,255,0.04)` + blur |
| Neon cyan | `#00F0FF` |
| Electric purple | `#7C3AED` |
| Text primary | `#EAF0FF` |
| Text muted | `#8B97B5` |
| Heading font | Orbitron |
| Body font | Rajdhani / Space Grotesk |
| Accent glow | cyan → purple gradient |

---

### ✅ What's in this repo now
- `ui-design.png` — the UI mockup (hero face + scroll reveal + sections).
- `avatar-3d.png` — 3D avatar concept reference for your "3D me".
- `PROMPTS.md` — this document.
