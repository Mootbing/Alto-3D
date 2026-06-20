"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  fitAlto3DFallback,
  paletteFromModel,
  startAlto3DAnimation,
  stopAlto3DAnimation
} from "./index.js";

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function cssVariablesForPalette(palette) {
  return {
    "--alto3d-bg": palette.background,
    "--alto3d-fg": palette.foreground,
    "--alto3d-accent": palette.accent,
    "--alto3d-muted": palette.muted,
    "--alto3d-shadow": palette.shadow
  };
}

function normalizeLabel(label) {
  return String(label ?? "").replace(/\s+/g, " ").trim();
}

export function AsciiModel({
  animate = true,
  as: Component = "span",
  className,
  columns,
  emptyLabelText,
  fps,
  label = "",
  model,
  palette,
  resolution,
  respectEmptyLabel = true,
  rows,
  secondaryModel,
  secondaryOpacity,
  style,
  ...props
}) {
  const fallbackRef = useRef(null);
  const accessibleLabel = normalizeLabel(label) || normalizeLabel(emptyLabelText) || "3D model unavailable";
  const decorative = respectEmptyLabel && normalizeLabel(label).length === 0;
  const resolvedPalette = useMemo(
    () => palette || paletteFromModel(accessibleLabel),
    [accessibleLabel, palette]
  );

  useEffect(() => {
    const fallback = fallbackRef.current;

    if (!fallback) {
      return undefined;
    }

    const options = {
      columns,
      fps,
      model,
      resolution,
      rows,
      secondaryModel
    };

    if (animate) {
      return startAlto3DAnimation(fallback, options);
    }

    fitAlto3DFallback(fallback, options);

    return () => stopAlto3DAnimation(fallback);
  }, [animate, columns, fps, model, resolution, rows, secondaryModel]);

  return React.createElement(
    Component,
    {
      ...props,
      "aria-hidden": decorative ? "true" : props["aria-hidden"],
      "aria-label": decorative ? undefined : props["aria-label"] || accessibleLabel,
      className: classNames("alto3d-fallback", className),
      ref: fallbackRef,
      role: decorative ? props.role : props.role || "img",
      style: {
        ...cssVariablesForPalette(resolvedPalette),
        "--alto3d-columns": columns === undefined ? undefined : String(columns),
        "--alto3d-rows": rows === undefined ? undefined : String(rows),
        "--alto3d-secondary-opacity": secondaryOpacity === undefined ? undefined : String(secondaryOpacity),
        ...style
      }
    },
    React.createElement(
      "span",
      {
        "aria-hidden": "true",
        className: "alto3d-fallback__stage"
      },
      React.createElement("canvas", {
        className: "alto3d-fallback__canvas alto3d-fallback__canvas--primary",
        "data-alto3d-layer": "primary"
      }),
      React.createElement("canvas", {
        className: "alto3d-fallback__canvas alto3d-fallback__canvas--secondary",
        "data-alto3d-layer": "secondary"
      })
    )
  );
}

export function Alto3DCanvas({
  fallbackClassName,
  fallbackStyle,
  fallbackWhen = false,
  label = "",
  onAlto3DError,
  onError,
  onWebGLContextLost,
  ...canvasProps
}) {
  const [failed, setFailed] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || failed || fallbackWhen) {
      return undefined;
    }

    const handleAlto3DError = (event) => {
      setFailed(true);
      onAlto3DError?.(event);
    };
    const handleContextLost = (event) => {
      setFailed(true);
      onWebGLContextLost?.(event);
    };

    canvas.addEventListener("alto3d:error", handleAlto3DError, { once: true });
    canvas.addEventListener("webglcontextlost", handleContextLost, { once: true });

    return () => {
      canvas.removeEventListener("alto3d:error", handleAlto3DError);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
    };
  }, [failed, fallbackWhen, onAlto3DError, onWebGLContextLost]);

  if (failed || fallbackWhen) {
    return React.createElement(AsciiModel, {
      className: fallbackClassName || canvasProps.className,
      label,
      style: {
        height: canvasProps.height,
        width: canvasProps.width,
        ...fallbackStyle
      }
    });
  }

  return React.createElement("canvas", {
    ...canvasProps,
    "aria-label": canvasProps["aria-label"] || label,
    "data-alto-3d": canvasProps["data-alto-3d"] ?? "",
    ref: canvasRef,
    onError(event) {
      setFailed(true);
      onError?.(event);
    }
  });
}
