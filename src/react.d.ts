import type { ComponentPropsWithoutRef, CSSProperties, ElementType, ReactElement } from "react";
import type { Alto3DModelKind, Alto3DPalette, Alto3DResolution } from "./index.js";

export type AsciiModelProps<TElement extends ElementType = "span"> =
  Omit<ComponentPropsWithoutRef<TElement>, "children" | "as"> & {
    animate?: boolean;
    as?: TElement;
    columns?: number;
    emptyLabelText?: string;
    fps?: number;
    label?: string;
    model?: Alto3DModelKind;
    palette?: Alto3DPalette;
    respectEmptyLabel?: boolean;
    resolution?: Alto3DResolution;
    rows?: number;
    secondaryModel?: Alto3DModelKind;
    secondaryOpacity?: number;
    style?: CSSProperties;
  };

export type Alto3DCanvasProps = Omit<ComponentPropsWithoutRef<"canvas">, "children"> & {
  fallbackClassName?: string;
  fallbackStyle?: CSSProperties;
  fallbackWhen?: boolean;
  label?: string;
  onAlto3DError?: (event: Event) => void;
  onWebGLContextLost?: (event: Event) => void;
};

export function AsciiModel<TElement extends ElementType = "span">(
  props: AsciiModelProps<TElement>
): ReactElement;

export function Alto3DCanvas(props: Alto3DCanvasProps): ReactElement;
