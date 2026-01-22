/**
 * Global type declarations for browser environment
 */

import type { Chart as ChartJS } from 'chart.js';

declare global {
  /** proj4 library - dynamically loaded */
  interface Window {
    proj4?: Proj4Static;
    google?: typeof google;
  }

  /** Chart.js global */
  const Chart: typeof ChartJS & {
    getChart(canvas: HTMLCanvasElement | string): ChartJS | undefined;
  };
}

/** proj4 projection library types */
interface Proj4Static {
  (fromProjection: string, toProjection: string, coordinates: [number, number]): [number, number];
  defs(name: string): string | undefined;
  defs(name: string, definition: string): void;
  default?: Proj4Static;
}

export {};
