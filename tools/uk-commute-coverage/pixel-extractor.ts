/**
 * Pixel Extraction Module
 * Extracts pixel colors from PNG images and handles color matching
 */

import type { RgbColor, ExtractedColor, CoverageLevel, CoverageColorMap } from '../../types/coverage.js';

/**
 * Extract RGB color from an image at specific pixel coordinates
 * Uses Canvas API to draw the image and get pixel data
 * @param imageData - Image element or blob
 * @param pixelX - X coordinate of pixel (0-255)
 * @param pixelY - Y coordinate of pixel (0-255)
 * @returns {r, g, b, hex}
 */
export async function extractPixelColor(imageData: HTMLImageElement | Blob, pixelX: number, pixelY: number): Promise<ExtractedColor> {
  return new Promise((resolve, reject) => {
    try {
      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        throw new Error('Could not get canvas 2D context');
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Ensure pixel coordinates are within bounds
        const x = Math.max(0, Math.min(pixelX, img.width - 1));
        const y = Math.max(0, Math.min(pixelY, img.height - 1));

        const imgData = ctx.getImageData(x, y, 1, 1);
        const data = imgData.data;

        const color: ExtractedColor = {
          r: data[0],
          g: data[1],
          b: data[2],
          a: data[3],
          hex: rgbToHex(data[0], data[1], data[2])
        };

        resolve(color);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      // Handle both Image elements and Blobs
      if (imageData instanceof Blob) {
        const url = URL.createObjectURL(imageData);
        img.src = url;
      } else if (imageData instanceof Image) {
        img.src = imageData.src;
      } else {
        reject(new Error('Invalid image data type'));
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Convert RGB to hex color string
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns Hex color string (e.g., "#7d2093")
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Convert hex color to RGB
 * @param hex - Hex color string (e.g., "#7d2093")
 * @returns {r, g, b}
 */
export function hexToRgb(hex: string): RgbColor | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate Euclidean distance between two RGB colors
 * @param color1 - {r, g, b}
 * @param color2 - {r, g, b}
 * @returns Distance in 3D RGB space
 */
export function colorDistance(color1: RgbColor, color2: RgbColor): number {
  const dr = color1.r - color2.r;
  const dg = color1.g - color2.g;
  const db = color1.b - color2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Map a color to a coverage level based on tolerance
 * @param hex - Hex color to match
 * @param colorMap - Map of coverage levels to hex colors
 * @param tolerance - RGB tolerance (default 10)
 * @returns Coverage level (0-4) or null if no match
 */
export function mapColorToCoverageLevel(hex: string, colorMap: CoverageColorMap, tolerance = 10): CoverageLevel {
  const extractedRgb = hexToRgb(hex);
  if (!extractedRgb) {
    return null;
  }

  let bestMatch: CoverageLevel = null;
  let bestDistance = Infinity;

  for (const [level, colorHex] of Object.entries(colorMap)) {
    const mappedRgb = hexToRgb(colorHex);
    if (!mappedRgb) continue;

    const distance = colorDistance(extractedRgb, mappedRgb);

    if (distance <= tolerance && distance < bestDistance) {
      bestMatch = parseInt(level) as CoverageLevel;
      bestDistance = distance;
    }
  }

  return bestMatch;
}

/**
 * Standard coverage color map
 * Maps coverage levels to Ofcom tile colors
 */
export const COVERAGE_COLOR_MAP: CoverageColorMap = {
  4: '#7d2093', // Good outdoor and in-home (purple)
  3: '#cd7be4', // Good outdoor, variable in-home (light purple)
  2: '#0081b3', // Good outdoor (blue)
  1: '#83e5f6', // Variable outdoor (cyan)
  0: '#d4d4d4'  // Poor to none outdoor (gray)
};
