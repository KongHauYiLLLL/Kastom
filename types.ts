export interface WidgetCustomization {
  backgroundColor: string;
  fontSize: number;
  borderRadius: number;
}

export interface WidgetData {
  id: string;
  title: string;
  prompt: string;
  html: string;
  css: string;
  js: string;
  data?: any; // For internal widget state persistence (e.g., table data, notebook text)
  position: { x: number; y: number };
  size: { w: number; h: number };
  zIndex: number;
  createdAt: number;
  customization: WidgetCustomization;
}

export interface GenerationResponse {
  html: string;
  css: string;
  js: string;
  title: string;
}

export enum DragMode {
  NONE,
  DRAG,
  RESIZE,
  PAN
}

export interface DragState {
  mode: DragMode;
  widgetId: string | null;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
  initialW: number;
  initialH: number;
}