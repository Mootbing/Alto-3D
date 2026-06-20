export type Alto3DPalette = {
  background: string;
  foreground: string;
  accent: string;
  muted: string;
  shadow: string;
};

export type Alto3DResolution =
  | "tiny"
  | "low"
  | "medium"
  | "high"
  | "ultra"
  | number
  | `${number}%`
  | `${number}x`;

export type Alto3DModelKind = "donut" | "ring" | "circle" | "circle-donut" | string;

export declare const ALTO_3D_RESOLUTION_PRESETS: {
  tiny: 0.55;
  low: 0.75;
  medium: 1;
  high: 1.35;
  ultra: 1.75;
};

export type CreateAsciiModelFrameOptions = {
  columns?: number;
  rows?: number;
  charset?: string;
  resolution?: Alto3DResolution;
  model?: Alto3DModelKind;
  majorRadius?: number;
  minorRadius?: number;
  thetaSteps?: number;
  phiSteps?: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  zoom?: number;
};

export type DrawAsciiToCanvasOptions = {
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  maxFontSize?: number;
  shadowBlur?: number;
  shadowColor?: string;
};

export type CanvasToAsciiFrameOptions = CreateAsciiModelFrameOptions & {
  alphaThreshold?: number;
  document?: Document;
  maxColumns?: number;
  maxRows?: number;
  scratchCanvas?: HTMLCanvasElement;
};

export type RenderAsciiModelToCanvasOptions =
  CreateAsciiModelFrameOptions & DrawAsciiToCanvasOptions;

export type RenderCanvasAsciiToCanvasOptions =
  CanvasToAsciiFrameOptions & DrawAsciiToCanvasOptions;

export type CreateAlto3DFallbackOptions = RenderAsciiModelToCanvasOptions & {
  animate?: boolean;
  className?: string;
  document?: Document;
  emptyLabelText?: string;
  fps?: number;
  palette?: Alto3DPalette;
  primaryColor?: string;
  respectEmptyLabel?: boolean;
  secondaryColor?: string;
  secondaryModel?: Alto3DModelKind;
  secondaryOpacity?: number;
  tagName?: keyof HTMLElementTagNameMap;
};

export type ReplaceBrokenModelOptions = CreateAlto3DFallbackOptions & {
  label?: string;
  onReplace?: (event: {
    element: Element;
    fallback: HTMLElement;
    label: string;
  }) => void;
  preserveClassName?: boolean;
  preserveSize?: boolean;
};

export type InstallAlto3DOptions = ReplaceBrokenModelOptions & {
  root?: Document | Element;
  selector?: string;
};

export function createAsciiModelFrame(options?: CreateAsciiModelFrameOptions): string;

export function drawAsciiToCanvas(
  canvas: HTMLCanvasElement,
  ascii: string,
  options?: DrawAsciiToCanvasOptions
): HTMLCanvasElement;

export function canvasToAsciiFrame(
  source: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement,
  options?: CanvasToAsciiFrameOptions
): string;

export function renderCanvasAsciiToCanvas(
  source: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement,
  canvas: HTMLCanvasElement,
  options?: RenderCanvasAsciiToCanvasOptions
): string;

export function renderAsciiModelToCanvas(
  canvas: HTMLCanvasElement,
  options?: RenderAsciiModelToCanvasOptions
): string;

export function createAlto3DFallback(
  label: string,
  options?: CreateAlto3DFallbackOptions
): HTMLElement;

export function replaceBrokenModel(
  element: Element,
  options?: ReplaceBrokenModelOptions
): HTMLElement | null;

export function fitAlto3DFallback(
  fallback: HTMLElement,
  options?: RenderAsciiModelToCanvasOptions
): HTMLElement;

export function startAlto3DAnimation(
  fallback: HTMLElement,
  options?: CreateAlto3DFallbackOptions
): () => void;

export function stopAlto3DAnimation(fallback: HTMLElement): void;

export function installAlto3D(options?: InstallAlto3DOptions): () => void;

export function paletteFromModel(label: string): Alto3DPalette;

export const Alto3D: {
  ALTO_3D_RESOLUTION_PRESETS: typeof ALTO_3D_RESOLUTION_PRESETS;
  canvasToAsciiFrame: typeof canvasToAsciiFrame;
  createAlto3DFallback: typeof createAlto3DFallback;
  createAsciiModelFrame: typeof createAsciiModelFrame;
  drawAsciiToCanvas: typeof drawAsciiToCanvas;
  fitAlto3DFallback: typeof fitAlto3DFallback;
  installAlto3D: typeof installAlto3D;
  paletteFromModel: typeof paletteFromModel;
  renderCanvasAsciiToCanvas: typeof renderCanvasAsciiToCanvas;
  renderAsciiModelToCanvas: typeof renderAsciiModelToCanvas;
  replaceBrokenModel: typeof replaceBrokenModel;
  startAlto3DAnimation: typeof startAlto3DAnimation;
  stopAlto3DAnimation: typeof stopAlto3DAnimation;
};
