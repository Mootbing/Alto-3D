const DEFAULT_SELECTOR = "[data-alto-3d]:not([data-alto-ignore])";
const DEFAULT_CHARSET = " .,:;irsXA253hMHGS#9B&@";
const MAX_RESOLUTION_SCALE = 4;
const ANIMATION_STORE = new WeakMap();

export const ALTO_3D_RESOLUTION_PRESETS = {
  tiny: 0.55,
  low: 0.75,
  medium: 1,
  high: 1.35,
  ultra: 1.75
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampInteger(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? clamp(number, min, max) : fallback;
}

function normalizeLabel(label) {
  return String(label ?? "").replace(/\s+/g, " ").trim();
}

function resolutionScale(resolution) {
  if (resolution === undefined || resolution === null || resolution === "") {
    return 1;
  }

  if (typeof resolution === "number") {
    return Number.isFinite(resolution) ? clamp(resolution, 0.25, MAX_RESOLUTION_SCALE) : 1;
  }

  const value = String(resolution).trim().toLowerCase();

  if (value in ALTO_3D_RESOLUTION_PRESETS) {
    return clamp(ALTO_3D_RESOLUTION_PRESETS[value], 0.05, MAX_RESOLUTION_SCALE);
  }

  if (value.endsWith("%")) {
    const percent = Number.parseFloat(value.slice(0, -1));
    return Number.isFinite(percent) ? clamp(percent / 100, 0.25, MAX_RESOLUTION_SCALE) : 1;
  }

  if (value.endsWith("x")) {
    const multiplier = Number.parseFloat(value.slice(0, -1));
    return Number.isFinite(multiplier) ? clamp(multiplier, 0.25, MAX_RESOLUTION_SCALE) : 1;
  }

  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? clamp(numeric, 0.25, MAX_RESOLUTION_SCALE) : 1;
}

function resolveAsciiDimensions(options = {}, defaults = {}) {
  const scale = resolutionScale(options.resolution);
  const columnLimit = defaults.columnLimit || 180;
  const rowLimit = defaults.rowLimit || 100;
  const defaultColumns = clamp(Math.round((defaults.columns || 74) * scale), 24, columnLimit);
  const defaultRows = clamp(Math.round((defaults.rows || 38) * scale), 12, rowLimit);
  const columns = clampInteger(options.columns, 16, columnLimit, defaultColumns);
  const rows = clampInteger(options.rows, 8, rowLimit, defaultRows);

  return { columns, rows, scale };
}

function hashString(value) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function rotatePoint(point, rotationX, rotationY, rotationZ) {
  let { x, y, z } = point;
  const cosX = Math.cos(rotationX);
  const sinX = Math.sin(rotationX);
  const cosY = Math.cos(rotationY);
  const sinY = Math.sin(rotationY);
  const cosZ = Math.cos(rotationZ);
  const sinZ = Math.sin(rotationZ);

  let nextY = y * cosX - z * sinX;
  let nextZ = y * sinX + z * cosX;
  y = nextY;
  z = nextZ;

  let nextX = x * cosY + z * sinY;
  nextZ = -x * sinY + z * cosY;
  x = nextX;
  z = nextZ;

  nextX = x * cosZ - y * sinZ;
  nextY = x * sinZ + y * cosZ;

  return { x: nextX, y: nextY, z };
}

function normalizeVector(vector) {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1;

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length
  };
}

function torusProfile(model) {
  if (model === "ring" || model === "circle" || model === "circle-donut") {
    return {
      majorRadius: 1.22,
      minorRadius: 0.13,
      phiSteps: 108,
      thetaSteps: 18,
      zoom: 0.36
    };
  }

  return {
    majorRadius: 0.92,
    minorRadius: 0.38,
    phiSteps: 96,
    thetaSteps: 42,
    zoom: 0.33
  };
}

function blankGrid(columns, rows) {
  return Array.from({ length: rows }, () => Array.from({ length: columns }, () => " "));
}

function gridToString(grid) {
  return grid.map((row) => row.join("")).join("\n");
}

export function createAsciiModelFrame(options = {}) {
  const { columns, rows } = resolveAsciiDimensions(options);
  const charset = String(options.charset || DEFAULT_CHARSET);
  const model = String(options.model || "donut").toLowerCase();
  const profile = torusProfile(model);
  const majorRadius = Number.isFinite(options.majorRadius) ? options.majorRadius : profile.majorRadius;
  const minorRadius = Number.isFinite(options.minorRadius) ? options.minorRadius : profile.minorRadius;
  const thetaSteps = clampInteger(options.thetaSteps, 8, 160, profile.thetaSteps);
  const phiSteps = clampInteger(options.phiSteps, 16, 240, profile.phiSteps);
  const rotationX = Number.parseFloat(options.rotationX) || 0;
  const rotationY = Number.parseFloat(options.rotationY) || 0;
  const rotationZ = Number.parseFloat(options.rotationZ) || 0;
  const zoom = Number.isFinite(options.zoom) ? options.zoom : profile.zoom;
  const centerX = (columns - 1) / 2;
  const centerY = (rows - 1) / 2;
  const grid = blankGrid(columns, rows);
  const zBuffer = new Float32Array(columns * rows).fill(-Infinity);
  const light = normalizeVector({ x: -0.24, y: -0.72, z: 1 });

  for (let thetaIndex = 0; thetaIndex < thetaSteps; thetaIndex += 1) {
    const theta = (thetaIndex / thetaSteps) * Math.PI * 2;
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);

    for (let phiIndex = 0; phiIndex < phiSteps; phiIndex += 1) {
      const phi = (phiIndex / phiSteps) * Math.PI * 2;
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);
      const radius = majorRadius + minorRadius * cosTheta;
      const point = rotatePoint({
        x: radius * cosPhi,
        y: radius * sinPhi,
        z: minorRadius * sinTheta
      }, rotationX, rotationY, rotationZ);
      const normal = normalizeVector(rotatePoint({
        x: cosTheta * cosPhi,
        y: cosTheta * sinPhi,
        z: sinTheta
      }, rotationX, rotationY, rotationZ));
      const x = Math.round(centerX + point.x * columns * zoom);
      const y = Math.round(centerY - point.y * rows * zoom * 1.52);

      if (x < 0 || x >= columns || y < 0 || y >= rows) {
        continue;
      }

      const depth = point.z;
      const offset = y * columns + x;

      if (depth <= zBuffer[offset]) {
        continue;
      }

      const shade = clamp(
        0.26 + (normal.x * light.x + normal.y * light.y + normal.z * light.z) * 0.62 + depth * 0.1,
        0,
        1
      );
      const characterIndex = clamp(Math.round(shade * (charset.length - 1)), 0, charset.length - 1);
      zBuffer[offset] = depth;
      grid[y][x] = charset[characterIndex] || "@";
    }
  }

  return gridToString(grid);
}

function animationFrame(callback, element) {
  const view = element?.ownerDocument?.defaultView || globalThis;

  if (typeof view.requestAnimationFrame === "function") {
    return view.requestAnimationFrame(callback);
  }

  callback(0);
  return 0;
}

function cancelAnimationFrameFor(element, frameId) {
  const view = element?.ownerDocument?.defaultView || globalThis;

  if (typeof view.cancelAnimationFrame === "function" && frameId) {
    view.cancelAnimationFrame(frameId);
  }
}

function setGridStyleProperties(element, columns, rows) {
  element.style.setProperty("--alto3d-columns", String(columns));
  element.style.setProperty("--alto3d-rows", String(rows));
}

function setPaletteProperties(element, palette) {
  element.style.setProperty("--alto3d-bg", palette.background);
  element.style.setProperty("--alto3d-fg", palette.foreground);
  element.style.setProperty("--alto3d-accent", palette.accent);
  element.style.setProperty("--alto3d-muted", palette.muted);
  element.style.setProperty("--alto3d-shadow", palette.shadow);
}

function setOptionalNumberProperty(element, propertyName, value, min, max) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  const number = Number.parseFloat(value);

  if (Number.isFinite(number)) {
    element.style.setProperty(propertyName, String(clamp(number, min, max)));
  }
}

function cssLength(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "number") {
    return `${value}px`;
  }

  return String(value);
}

function dimensionsFromElement(element, options) {
  const rect = typeof element.getBoundingClientRect === "function"
    ? element.getBoundingClientRect()
    : { width: 0, height: 0 };
  const widthAttribute = element.getAttribute?.("width");
  const heightAttribute = element.getAttribute?.("height");
  const width = rect.width || element.width || clampInteger(widthAttribute, 1, 4096, 0) || 640;
  const height = rect.height || element.height || clampInteger(heightAttribute, 1, 4096, 0) || 420;
  const defaultColumns = clamp(Math.round(width / 8), 36, 108);
  const defaultRows = clamp(Math.round(height / 12), 18, 64);

  return {
    height,
    width,
    ...resolveAsciiDimensions(options, {
      columnLimit: 240,
      columns: defaultColumns,
      rowLimit: 140,
      rows: defaultRows
    })
  };
}

function optionsFromElement(element, options) {
  const dataset = element.dataset || {};

  return {
    ...options,
    columns: dataset.alto3dColumns || dataset.altoColumns || dataset.altoCols || options.columns,
    model: dataset.alto3dModel || dataset.altoModel || options.model,
    resolution: dataset.alto3dResolution || dataset.altoResolution || options.resolution,
    rows: dataset.alto3dRows || dataset.altoRows || options.rows,
    secondaryModel: dataset.alto3dSecondaryModel || options.secondaryModel
  };
}

function styleFallbackSize(fallback, element, options) {
  if (options.preserveSize === false) {
    return;
  }

  const rect = typeof element.getBoundingClientRect === "function"
    ? element.getBoundingClientRect()
    : { width: 0, height: 0 };
  const width = rect.width || element.width || element.getAttribute?.("width");
  const height = rect.height || element.height || element.getAttribute?.("height");

  if (width) {
    fallback.style.inlineSize = cssLength(width);
  }

  if (height) {
    fallback.style.blockSize = cssLength(height);
  }
}

function computedColor(element, propertyName, fallback) {
  const view = element?.ownerDocument?.defaultView;
  const value = view?.getComputedStyle?.(element)?.getPropertyValue(propertyName)?.trim();

  return value || fallback;
}

function canvasSize(canvas) {
  const rect = typeof canvas.getBoundingClientRect === "function"
    ? canvas.getBoundingClientRect()
    : { width: 0, height: 0 };
  const parentRect = typeof canvas.parentElement?.getBoundingClientRect === "function"
    ? canvas.parentElement.getBoundingClientRect()
    : { width: 0, height: 0 };

  return {
    height: rect.height || parentRect.height || Number.parseFloat(canvas.getAttribute?.("height")) || 320,
    width: rect.width || parentRect.width || Number.parseFloat(canvas.getAttribute?.("width")) || 640
  };
}

export function drawAsciiToCanvas(canvas, ascii, options = {}) {
  const context = canvas?.getContext?.("2d");

  if (!context) {
    throw new Error("drawAsciiToCanvas requires a canvas with a 2D context.");
  }

  const { height, width } = canvasSize(canvas);
  const view = canvas.ownerDocument?.defaultView || globalThis;
  const ratio = Math.max(1, view.devicePixelRatio || 1);
  const lines = String(ascii || "").split("\n");
  const rows = Math.max(1, lines.length);
  const columns = lines.reduce((longest, line) => Math.max(longest, line.length), 0) || 1;
  const fontSize = clamp(
    Number.parseFloat(options.fontSize) || Math.min(height / (rows * 0.86), width / (columns * 0.58)),
    5,
    Number.parseFloat(options.maxFontSize) || 24
  );
  const lineHeight = fontSize * (Number.parseFloat(options.lineHeight) || 0.86);
  const fontFamily = options.fontFamily || 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));
  canvas.style.inlineSize = "100%";
  canvas.style.blockSize = "100%";

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.font = `${fontSize}px ${fontFamily}`;
  context.textBaseline = "top";
  context.fillStyle = options.color || "#f7fbff";
  context.shadowColor = options.shadowColor || "transparent";
  context.shadowBlur = Number.parseFloat(options.shadowBlur) || 0;

  const textWidth = Math.max(...lines.map((line) => context.measureText(line || " ").width), 1);
  const textHeight = rows * lineHeight;
  const xScale = clamp(width / textWidth, 0.48, 3);
  const left = (width - textWidth * xScale) / 2;
  const top = (height - textHeight) / 2;

  context.save();
  context.translate(left, top);
  context.scale(xScale, 1);
  lines.forEach((line, index) => {
    context.fillText(line, 0, index * lineHeight);
  });
  context.restore();

  return canvas;
}

function sourceCanvasSize(source) {
  const rect = typeof source?.getBoundingClientRect === "function"
    ? source.getBoundingClientRect()
    : { width: 0, height: 0 };

  return {
    height: source?.videoHeight || source?.naturalHeight || source?.height || rect.height || 320,
    width: source?.videoWidth || source?.naturalWidth || source?.width || rect.width || 640
  };
}

function resolveCanvasAsciiDimensions(source, options = {}) {
  const { height, width } = sourceCanvasSize(source);
  const defaultColumns = clamp(Math.round(width / 8), 36, 140);
  const defaultRows = clamp(Math.round(height / 12), 18, 90);

  return resolveAsciiDimensions(options, {
    columnLimit: options.maxColumns || 260,
    columns: defaultColumns,
    rowLimit: options.maxRows || 180,
    rows: defaultRows
  });
}

export function canvasToAsciiFrame(source, options = {}) {
  const doc = options.document || source?.ownerDocument || globalThis.document;

  if (!doc?.createElement) {
    throw new Error("canvasToAsciiFrame requires a DOM document.");
  }

  const { columns, rows } = resolveCanvasAsciiDimensions(source, options);
  const charset = String(options.charset || DEFAULT_CHARSET);
  const alphaThreshold = Number.isFinite(options.alphaThreshold) ? options.alphaThreshold : 0.05;
  const scratch = options.scratchCanvas || doc.createElement("canvas");
  const context = scratch.getContext?.("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("canvasToAsciiFrame could not create a 2D canvas context.");
  }

  scratch.width = columns;
  scratch.height = rows;
  context.clearRect(0, 0, columns, rows);
  context.drawImage(source, 0, 0, columns, rows);

  const pixels = context.getImageData(0, 0, columns, rows).data;
  const lines = [];

  for (let y = 0; y < rows; y += 1) {
    let line = "";

    for (let x = 0; x < columns; x += 1) {
      const offset = (y * columns + x) * 4;
      const red = pixels[offset];
      const green = pixels[offset + 1];
      const blue = pixels[offset + 2];
      const alpha = pixels[offset + 3] / 255;

      if (alpha <= alphaThreshold) {
        line += " ";
        continue;
      }

      const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
      const value = clamp(alpha * (0.18 + luminance * 0.82), 0, 1);
      const characterIndex = clamp(Math.round(value * (charset.length - 1)), 0, charset.length - 1);
      line += charset[characterIndex] || "@";
    }

    lines.push(line);
  }

  return lines.join("\n");
}

export function renderCanvasAsciiToCanvas(source, canvas, options = {}) {
  const ascii = canvasToAsciiFrame(source, options);
  drawAsciiToCanvas(canvas, ascii, options);

  return ascii;
}

export function renderAsciiModelToCanvas(canvas, options = {}) {
  const ascii = createAsciiModelFrame(options);
  drawAsciiToCanvas(canvas, ascii, options);

  return ascii;
}

export function paletteFromModel(label) {
  const seed = hashString(normalizeLabel(label) || "alto-3d");
  const hue = seed % 360;
  const accentHue = (hue + 146 + (seed % 48)) % 360;

  return {
    background: `hsl(${hue} 24% 11%)`,
    foreground: `hsl(${(hue + 36) % 360} 88% 93%)`,
    accent: `hsl(${accentHue} 80% 58%)`,
    muted: `hsl(${hue} 16% 27%)`,
    shadow: `hsl(${hue} 34% 6%)`
  };
}

export function startAlto3DAnimation(fallback, options = {}) {
  if (!fallback?.querySelectorAll) {
    return () => {};
  }

  stopAlto3DAnimation(fallback);

  const canvases = Array.from(fallback.querySelectorAll(".alto3d-fallback__canvas"));

  if (!canvases.length) {
    return () => {};
  }

  const { columns, rows } = resolveAsciiDimensions(options);
  const start = fallback.ownerDocument?.defaultView?.performance?.now?.() || 0;
  const fps = clampInteger(options.fps, 8, 60, 24);
  const state = {
    frameId: 0,
    lastFrame: 0,
    stopped: false
  };

  function draw(now = 0) {
    if (state.stopped) {
      return;
    }

    if (now - state.lastFrame >= 1000 / fps || state.lastFrame === 0) {
      const time = ((now || 0) - start) / 1000;
      const foreground = computedColor(fallback, "--alto3d-fg", "#f7fbff");
      const accent = computedColor(fallback, "--alto3d-accent", "#76e4f7");
      const shadow = computedColor(fallback, "--alto3d-shadow", "rgba(0, 0, 0, 0.7)");

      renderAsciiModelToCanvas(canvases[0], {
        ...options,
        color: options.primaryColor || foreground,
        columns,
        model: options.model || "donut",
        rotationX: time * 0.72,
        rotationY: time * 1.08,
        rotationZ: time * 0.22,
        rows,
        shadowBlur: options.shadowBlur ?? 5,
        shadowColor: options.shadowColor || shadow
      });

      if (canvases[1]) {
        renderAsciiModelToCanvas(canvases[1], {
          ...options,
          color: options.secondaryColor || accent,
          columns,
          model: options.secondaryModel || "ring",
          rotationX: time * -0.44 + 0.85,
          rotationY: time * 0.62,
          rotationZ: time * -1.12,
          rows,
          shadowBlur: options.secondaryShadowBlur ?? 7,
          shadowColor: options.secondaryShadowColor || accent
        });
      }

      state.lastFrame = now;
    }

    state.frameId = animationFrame(draw, fallback);
  }

  ANIMATION_STORE.set(fallback, state);
  state.frameId = animationFrame(draw, fallback);

  return () => stopAlto3DAnimation(fallback);
}

export function stopAlto3DAnimation(fallback) {
  const state = ANIMATION_STORE.get(fallback);

  if (!state) {
    return;
  }

  state.stopped = true;
  cancelAnimationFrameFor(fallback, state.frameId);
  ANIMATION_STORE.delete(fallback);
}

export function fitAlto3DFallback(fallback, options = {}) {
  const canvases = fallback?.querySelectorAll?.(".alto3d-fallback__canvas");

  if (!canvases?.length) {
    return fallback;
  }

  const { columns, rows } = resolveAsciiDimensions(options);
  const foreground = computedColor(fallback, "--alto3d-fg", "#f7fbff");
  const accent = computedColor(fallback, "--alto3d-accent", "#76e4f7");

  renderAsciiModelToCanvas(canvases[0], {
    ...options,
    color: options.primaryColor || foreground,
    columns,
    model: options.model || "donut",
    rows
  });

  if (canvases[1]) {
    renderAsciiModelToCanvas(canvases[1], {
      ...options,
      color: options.secondaryColor || accent,
      columns,
      model: options.secondaryModel || "ring",
      rotationX: 0.85,
      rotationZ: -0.45,
      rows
    });
  }

  return fallback;
}

export function createAlto3DFallback(label, options = {}) {
  const doc = options.document || globalThis.document;

  if (!doc?.createElement) {
    throw new Error("createAlto3DFallback requires a DOM document.");
  }

  const text = normalizeLabel(label);
  const accessibleLabel = text || normalizeLabel(options.emptyLabelText) || "3D model unavailable";
  const { columns, rows } = resolveAsciiDimensions(options);
  const fallback = doc.createElement(options.tagName || "span");
  const stage = doc.createElement("span");
  const primaryCanvas = doc.createElement("canvas");
  const secondaryCanvas = doc.createElement("canvas");
  const classes = ["alto3d-fallback", options.className].filter(Boolean);
  const decorative = options.respectEmptyLabel !== false && text.length === 0;

  fallback.className = classes.join(" ");
  fallback.dataset.alto3dFallback = "";
  setGridStyleProperties(fallback, columns, rows);
  setPaletteProperties(fallback, options.palette || paletteFromModel(accessibleLabel));
  setOptionalNumberProperty(fallback, "--alto3d-secondary-opacity", options.secondaryOpacity, 0, 1);

  if (decorative) {
    fallback.setAttribute("aria-hidden", "true");
  } else {
    fallback.setAttribute("role", "img");
    fallback.setAttribute("aria-label", accessibleLabel);
  }

  stage.className = "alto3d-fallback__stage";
  stage.setAttribute("aria-hidden", "true");
  primaryCanvas.className = "alto3d-fallback__canvas alto3d-fallback__canvas--primary";
  secondaryCanvas.className = "alto3d-fallback__canvas alto3d-fallback__canvas--secondary";
  primaryCanvas.dataset.alto3dLayer = "primary";
  secondaryCanvas.dataset.alto3dLayer = "secondary";
  stage.append(primaryCanvas, secondaryCanvas);
  fallback.append(stage);

  if (options.animate !== false) {
    animationFrame(() => startAlto3DAnimation(fallback, options), fallback);
  } else {
    animationFrame(() => fitAlto3DFallback(fallback, options), fallback);
  }

  return fallback;
}

export function replaceBrokenModel(element, options = {}) {
  if (!element || element.dataset?.altoIgnore !== undefined) {
    return null;
  }

  const elementOptions = optionsFromElement(element, options);
  const label = element.getAttribute?.("aria-label")
    || element.getAttribute?.("alt")
    || element.getAttribute?.("title")
    || element.dataset?.alto3dLabel
    || element.dataset?.altoLabel
    || elementOptions.label
    || "";
  const dimensions = dimensionsFromElement(element, elementOptions);
  const fallback = createAlto3DFallback(label, {
    ...elementOptions,
    columns: elementOptions.columns ?? dimensions.columns,
    rows: elementOptions.rows ?? dimensions.rows
  });

  if (elementOptions.preserveClassName !== false && element.className) {
    fallback.className = `${element.className} ${fallback.className}`.trim();
  }

  styleFallbackSize(fallback, element, elementOptions);
  element.replaceWith(fallback);
  elementOptions.onReplace?.({ element, fallback, label });

  return fallback;
}

export function installAlto3D(options = {}) {
  const doc = options.document || globalThis.document;

  if (!doc?.querySelectorAll) {
    return () => {};
  }

  const root = options.root || doc;
  const selector = options.selector || DEFAULT_SELECTOR;
  const observed = new WeakSet();
  const listeners = new Map();

  const enhance = (element) => {
    if (!element || observed.has(element) || element.dataset?.altoIgnore !== undefined) {
      return;
    }

    observed.add(element);

    if (
      element.dataset?.alto3dFailed !== undefined
      || element.dataset?.altoModelFailed !== undefined
      || element.dataset?.altoFailed !== undefined
    ) {
      replaceBrokenModel(element, options);
      return;
    }

    const onError = () => {
      const registered = listeners.get(element) || [];
      registered.forEach(([eventName, listener]) => {
        element.removeEventListener(eventName, listener);
      });
      listeners.delete(element);
      replaceBrokenModel(element, options);
    };
    const eventNames = ["alto3d:error", "error", "webglcontextlost"];
    const registered = eventNames.map((eventName) => {
      element.addEventListener(eventName, onError, { once: true });
      return [eventName, onError];
    });

    listeners.set(element, registered);
  };

  const scan = (scope) => {
    if (scope.matches?.(selector)) {
      enhance(scope);
    }

    scope.querySelectorAll?.(selector).forEach(enhance);
  };

  scan(root);

  const observer = typeof MutationObserver === "undefined"
    ? null
    : new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            scan(node);
          }
        });
      }
    });

  observer?.observe(root === doc ? doc.documentElement : root, {
    childList: true,
    subtree: true
  });

  return () => {
    observer?.disconnect();
    listeners.forEach((registered, element) => {
      registered.forEach(([eventName, listener]) => {
        element.removeEventListener(eventName, listener);
      });
    });
    listeners.clear();
  };
}

export const Alto3D = {
  ALTO_3D_RESOLUTION_PRESETS,
  canvasToAsciiFrame,
  createAlto3DFallback,
  createAsciiModelFrame,
  drawAsciiToCanvas,
  fitAlto3DFallback,
  installAlto3D,
  paletteFromModel,
  renderCanvasAsciiToCanvas,
  renderAsciiModelToCanvas,
  replaceBrokenModel,
  startAlto3DAnimation,
  stopAlto3DAnimation
};
