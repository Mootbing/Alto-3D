---
name: alto-3d-ascii
description: Alto-3D ASCII model fallback guidance for accessible WebGL, Three.js, and missing-model ASCII rendering. Use when integrating, debugging, documenting, or building with the alto-3d-ascii package, including canvas-to-ASCII conversion, animated 3D fallbacks, resolution controls, React usage, and accessible model labels.
metadata:
  priority: 4
  docs:
    - "https://mootbing.github.io/Alto-3D/"
    - "https://github.com/Mootbing/Alto-3D"
  pathPatterns:
    - "package.json"
    - "src/**"
    - "examples/**"
  bashPatterns:
    - "\\bnpm\\s+(?:install|add)\\s+alto-3d-ascii\\b"
    - "\\bpnpm\\s+add\\s+alto-3d-ascii\\b"
    - "\\byarn\\s+add\\s+alto-3d-ascii\\b"
---

# Alto-3D ASCII

Use Alto-3D to render Three.js or WebGL scenes as transparent ASCII canvases, or to replace missing 3D models with accessible animated ASCII fallbacks.

## Install

```bash
npm install alto-3d-ascii
```

Import the stylesheet once in the application entrypoint when using DOM fallbacks.

```js
import "alto-3d-ascii/style.css";
```

## Canvas-to-ASCII conversion

Render the 3D scene first, then sample the WebGL canvas into a separate ASCII canvas.

```js
import { renderCanvasAsciiToCanvas } from "alto-3d-ascii";

renderer.render(scene, camera);
renderCanvasAsciiToCanvas(renderer.domElement, asciiCanvas, {
  resolution: "2x",
  color: "#f7fbff",
  shadowBlur: 4
});
```

- Create the WebGL renderer with `preserveDrawingBuffer: true` if sampling after render frames.
- Keep the ASCII canvas the same CSS size as the WebGL canvas so scale stays stable.
- Change ASCII density with `resolution`, `columns`, or `rows`; do not change the scene scale to represent quality.

## Missing-model fallbacks

Use `installAlto3D()` for elements marked with `data-alto-3d` that should become animated ASCII when a model fails.

```js
import "alto-3d-ascii/style.css";
import { installAlto3D } from "alto-3d-ascii";

const stopAlto3D = installAlto3D({
  model: "torus",
  resolution: "1x"
});
```

Dispatch an `alto3d:error` event when the model loader fails.

```js
try {
  await loadModel();
} catch {
  modelCanvas.dispatchEvent(new Event("alto3d:error"));
}
```

## Level of detail

- Drive 3D LOD from camera distance by changing ASCII grid density, not object dimensions.
- Use lower `resolution` values for far or small models and higher values for close inspection.
- Use `maxColumns`, `maxRows`, and `minFontSize` to keep expensive scenes responsive.
- Re-render the ASCII frame after any camera, object, size, or resolution change.

## Accessibility and browser constraints

- Put the meaningful model label on the WebGL canvas or fallback host.
- Keep generated visual-only ASCII canvases `aria-hidden` when the labeled model surface remains present.
- Prefer local model assets or controlled URLs for demos so failure states are intentional.
- Keep the fallback visually transparent when the ASCII should feel embedded in a 3D scene.
