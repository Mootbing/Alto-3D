import assert from "node:assert/strict";
import test from "node:test";
import {
  ALTO_3D_RESOLUTION_PRESETS,
  canvasToAsciiFrame,
  createAsciiModelFrame,
  paletteFromModel
} from "../src/index.js";

test("createAsciiModelFrame returns the requested grid size", () => {
  const ascii = createAsciiModelFrame({
    columns: 48,
    rows: 18
  });
  const lines = ascii.split("\n");

  assert.equal(lines.length, 18);
  assert.ok(lines.every((line) => line.length === 48));
});

test("createAsciiModelFrame is deterministic for a fixed rotation", () => {
  const options = {
    columns: 52,
    model: "donut",
    rotationX: 0.4,
    rotationY: 1.2,
    rows: 20
  };
  const first = createAsciiModelFrame(options);
  const second = createAsciiModelFrame(options);

  assert.equal(first, second);
});

test("donut and ring profiles produce different silhouettes", () => {
  const baseOptions = {
    columns: 56,
    rotationX: 0.5,
    rotationY: 0.8,
    rows: 24
  };
  const donut = createAsciiModelFrame({
    ...baseOptions,
    model: "donut"
  });
  const ring = createAsciiModelFrame({
    ...baseOptions,
    model: "ring"
  });

  assert.notEqual(donut, ring);
});

test("resolution presets adjust the generated grid size", () => {
  const low = createAsciiModelFrame({ resolution: "low" });
  const high = createAsciiModelFrame({ resolution: "high" });

  assert.ok(low.split("\n")[0].length < high.split("\n")[0].length);
  assert.ok(low.split("\n").length < high.split("\n").length);
});

test("maxColumns and maxRows allow demos to opt into higher detail", () => {
  const defaultUltra = createAsciiModelFrame({ resolution: "4x" });
  const liftedUltra = createAsciiModelFrame({
    maxColumns: 360,
    maxRows: 220,
    resolution: "4x"
  });
  const defaultLines = defaultUltra.split("\n");
  const liftedLines = liftedUltra.split("\n");

  assert.ok(defaultLines[0].length < liftedLines[0].length);
  assert.ok(defaultLines.length < liftedLines.length);
  assert.equal(liftedLines[0].length, 296);
  assert.equal(liftedLines.length, 152);
});

test("explicit columns and rows override resolution presets", () => {
  const ascii = createAsciiModelFrame({
    columns: 34,
    resolution: "ultra",
    rows: 14
  });
  const lines = ascii.split("\n");

  assert.equal(lines.length, 14);
  assert.ok(lines.every((line) => line.length === 34));
});

test("resolution preset values are exported", () => {
  assert.equal(ALTO_3D_RESOLUTION_PRESETS.medium, 1);
  assert.ok(ALTO_3D_RESOLUTION_PRESETS.high > ALTO_3D_RESOLUTION_PRESETS.low);
});

test("paletteFromModel returns CSS color strings", () => {
  const palette = paletteFromModel("Damaged satellite mesh");

  assert.match(palette.background, /^hsl\(/);
  assert.match(palette.foreground, /^hsl\(/);
  assert.match(palette.accent, /^hsl\(/);
  assert.match(palette.muted, /^hsl\(/);
  assert.match(palette.shadow, /^hsl\(/);
});

test("canvasToAsciiFrame samples transparent object pixels", () => {
  const ascii = canvasToAsciiFrame(
    {
      height: 2,
      width: 4
    },
    {
      columns: 4,
      document: {
        createElement() {
          return {
            getContext() {
              return {
                clearRect() {},
                drawImage() {},
                getImageData(_x, _y, width, height) {
                  const data = new Uint8ClampedArray(width * height * 4);

                  for (let y = 0; y < height; y += 1) {
                    for (let x = 0; x < width; x += 1) {
                      if (x < width / 4 || x >= width * 0.75) {
                        continue;
                      }

                      const offset = (y * width + x) * 4;
                      data[offset] = 255;
                      data[offset + 1] = 255;
                      data[offset + 2] = 255;
                      data[offset + 3] = 255;
                    }
                  }

                  return {
                    data
                  };
                }
              };
            }
          };
        }
      },
      rows: 2
    }
  );

  const lines = ascii.split("\n");

  assert.equal(lines.length, 8);
  assert.ok(lines.every((line) => line.length === 16));
  assert.match(ascii, /@@@@/);
});
