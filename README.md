# Alto-3D ASCII

Alto-3D is a small, dependency-free browser package for turning 3D model previews into ASCII. It can sample a live WebGL canvas so the ASCII matches the actual uploaded object, and it can still generate animated ASCII fallbacks when a Three.js/WebGL/model-loader path fails.

The homepage demo uses Three.js and `FBXLoader` to upload an `.fbx`, spin it in 3D, and draw a transparent ASCII canvas from that rendered frame. The fallback path still uses two transparent canvas layers: a spinning ASCII donut and a second spinning circle-donut/ring layer. Alto-3D keeps the model label available to assistive technology and leaves styling to a tiny CSS file with the same compact Alto feel.

## Install

```sh
npm install alto-3d-ascii
```

Import the JavaScript and CSS:

```js
import { installAlto3D } from "alto-3d-ascii";
import "alto-3d-ascii/style.css";

const stopAlto3D = installAlto3D();
```

## Demo

Run the local demo:

```sh
npm run demo
```

Then open:

```text
http://127.0.0.1:4173/
```

The demo starts with a procedural Three.js torus. Upload an `.fbx` to replace it with your model and watch the ASCII canvas update from the live WebGL render.

## Quick Start

Mark a model surface with `data-alto-3d`, then dispatch an error event when your loader fails:

```html
<canvas
  id="model-preview"
  data-alto-3d
  aria-label="Damaged satellite mesh preview"
></canvas>

<script type="module">
  import { installAlto3D } from "alto-3d-ascii";
  import "alto-3d-ascii/style.css";

  installAlto3D();

  try {
    await loadModelIntoThreeScene();
  } catch {
    document.querySelector("#model-preview").dispatchEvent(new Event("alto3d:error"));
  }
</script>
```

When the model fails, Alto-3D replaces the canvas with:

```html
<span class="alto3d-fallback" role="img" aria-label="Damaged satellite mesh preview">
  <span class="alto3d-fallback__stage" aria-hidden="true">
    <canvas class="alto3d-fallback__canvas alto3d-fallback__canvas--primary"></canvas>
    <canvas class="alto3d-fallback__canvas alto3d-fallback__canvas--secondary"></canvas>
  </span>
</span>
```

The canvases themselves are transparent, so they can sit over the styled fallback frame or any parent surface you provide.

## Data Attributes

Use these attributes on model preview elements:

```html
<canvas
  data-alto-3d
  data-alto-3d-model="donut"
  data-alto-3d-secondary-model="ring"
  data-alto-3d-resolution="2x"
  aria-label="Failed product model"
></canvas>
```

Supported attributes:

- `data-alto-3d`: opt the element into Alto-3D.
- `data-alto-3d-failed`: replace immediately on install.
- `data-alto-3d-model`: primary ASCII model, usually `donut`.
- `data-alto-3d-secondary-model`: secondary ASCII model, usually `ring`.
- `data-alto-3d-resolution`: explicit `x` scale, percentage, or number.
- `data-alto-3d-columns`: exact ASCII columns.
- `data-alto-3d-rows`: exact ASCII rows.
- `data-alto-3d-label`: label fallback when no `aria-label`, `alt`, or `title` exists.
- `data-alto-ignore`: opt an element out of Alto-3D.

Alto-3D listens for `alto3d:error`, `error`, and `webglcontextlost`.

## Manual Fallback

```js
import { createAlto3DFallback } from "alto-3d-ascii";
import "alto-3d-ascii/style.css";

const fallback = createAlto3DFallback("Missing robot arm model", {
  model: "donut",
  secondaryModel: "ring",
  secondaryOpacity: 0.5,
  resolution: "2x"
});

document.querySelector("#preview").replaceChildren(fallback);
```

## FBX To ASCII

Alto-3D does not bundle Three.js. Use your app's renderer, then sample the rendered canvas:

```js
import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { renderCanvasAsciiToCanvas } from "alto-3d-ascii";

const renderer = new THREE.WebGLRenderer({
  alpha: true,
  canvas: modelCanvas,
  preserveDrawingBuffer: true
});

const buffer = await file.arrayBuffer();
const model = new FBXLoader().parse(buffer, "");
scene.add(model);

renderer.render(scene, camera);
renderCanvasAsciiToCanvas(renderer.domElement, asciiCanvas, {
  resolution: "1x",
  color: "#f7fbff"
});
```

Use `preserveDrawingBuffer: true` when you need to sample the WebGL canvas after rendering.

## Static Frames

`createAsciiModelFrame()` returns a plain text frame for snapshots, tests, or server-side examples.

```js
import { createAsciiModelFrame } from "alto-3d-ascii";

const frame = createAsciiModelFrame({
  columns: 72,
  model: "donut",
  rotationX: 0.4,
  rotationY: 1.2,
  rows: 34
});
```

## React

React is optional and listed as a peer dependency.

```jsx
import { Alto3DCanvas, AsciiModel } from "alto-3d-ascii/react";
import "alto-3d-ascii/style.css";

export function Preview({ failed }) {
  return (
    <Alto3DCanvas
      fallbackWhen={failed}
      label="Configurator chair model"
      width={720}
      height={420}
    />
  );
}

export function DirectFallback() {
  return <AsciiModel label="Missing scanned artifact" resolution="2x" />;
}
```

## Next.js

Use `alto-3d-ascii/next` from Client Components in App Router projects. It re-exports the same client-safe React components.

```tsx
"use client";

import { Alto3DSceneFallback } from "alto-3d-ascii/next";
import "alto-3d-ascii/style.css";

export function ModelFallback() {
  return <Alto3DSceneFallback label="Unavailable GLB preview" />;
}
```

## Tailwind CSS

If your app uses Tailwind, import Alto-3D's Tailwind layer stylesheet instead of the plain stylesheet:

```css
@import "tailwindcss";
@import "alto-3d-ascii/tailwind.css";
```

You can size and theme fallbacks with normal classes and CSS variables:

```tsx
<AsciiModel
  label="Unavailable shoe model"
  className="h-80 w-full [--alto3d-padding:0] [--alto3d-bg:#111827]"
/>
```

## API Reference

### `installAlto3D(options?)`

Scans for matching model preview elements, listens for failure events, and replaces failed elements with Alto-3D fallbacks. Returns a cleanup function.

Options:

- `selector`: CSS selector for model elements. Default: `[data-alto-3d]:not([data-alto-ignore])`.
- `root`: document or element to scan. Default: `document`.
- `columns`, `rows`, `resolution`: ASCII scale controls such as `0.5x`, `1x`, or `2x`.
- `model`, `secondaryModel`: ASCII model profiles.
- `secondaryOpacity`: opacity for the second transparent canvas layer. Default: `0.5`.
- `className`: extra class added to generated fallbacks.
- `preserveClassName`: copy original element classes to fallback. Default: `true`.
- `preserveSize`: copy rendered or attribute size to fallback. Default: `true`.
- `emptyLabelText`: visual label used when no label exists.
- `respectEmptyLabel`: keep empty labels decorative for accessibility. Default: `true`.
- `onReplace`: callback called with `{ element, fallback, label }`.

### `replaceBrokenModel(element, options?)`

Replaces one model preview element with an Alto-3D fallback and returns the fallback element.

### `createAlto3DFallback(label, options?)`

Creates an animated fallback element without inserting it into the DOM.

### `createAsciiModelFrame(options?)`

Creates one plain text frame for `donut` or `ring` ASCII model profiles.

### `canvasToAsciiFrame(source, options?)`

Samples a readable image, video, or canvas source and returns one ASCII frame. This is the low-level API used for live model previews.

### `renderCanvasAsciiToCanvas(source, canvas, options?)`

Samples a rendered source canvas, draws the ASCII text onto a transparent target canvas, and returns the ASCII string. This is the main API for turning a loaded Three.js model render into ASCII.

### `renderAsciiModelToCanvas(canvas, options?)`

Renders one frame to a transparent canvas and returns the ASCII string used for that frame.

### `drawAsciiToCanvas(canvas, ascii, options?)`

Draws existing ASCII text to a transparent canvas.

### `startAlto3DAnimation(fallback, options?)`

Starts or restarts animation for a fallback.

### `stopAlto3DAnimation(fallback)`

Stops animation for a fallback.

### `fitAlto3DFallback(fallback, options?)`

Renders a static fitted frame into a fallback's canvases.

### `paletteFromModel(label)`

Returns deterministic CSS color strings for a model label.

## Styling

Import the default stylesheet:

```js
import "alto-3d-ascii/style.css";
```

The fallback uses CSS custom properties:

```css
.alto3d-fallback {
  --alto3d-bg: hsl(220 22% 12%);
  --alto3d-fg: hsl(48 88% 92%);
  --alto3d-accent: hsl(180 80% 58%);
  --alto3d-muted: hsl(220 16% 24%);
  --alto3d-shadow: hsl(220 28% 6%);
  --alto3d-radius: 0.5rem;
  --alto3d-padding: 0.75rem;
  --alto3d-secondary-opacity: 0.5;
}
```

## Accessibility

Alto-3D preserves meaningful model labels:

- Non-empty labels become `role="img"` plus `aria-label`.
- Empty labels remain decorative by default with `aria-hidden="true"`.
- ASCII is visual only. Keep labels descriptive, not raw ASCII.

## Development

```sh
npm test
npm run demo
npm run pack:check
```

This package is ESM-only and requires Node 18 or newer for local tests.

## License

MIT
