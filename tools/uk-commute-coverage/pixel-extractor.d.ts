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
export declare function extractPixelColor(imageData: HTMLImageElement | Blob, pixelX: number, pixelY: number): Promise<ExtractedColor>;
/**
 * Convert RGB to hex color string
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns Hex color string (e.g., "#7d2093")
 */
export declare function rgbToHex(r: number, g: number, b: number): string;
/**
 * Convert hex color to RGB
 * @param hex - Hex color string (e.g., "#7d2093")
 * @returns {r, g, b}
 */
export declare function hexToRgb(hex: string): RgbColor | null;
/**
 * Calculate Euclidean distance between two RGB colors
 * @param color1 - {r, g, b}
 * @param color2 - {r, g, b}
 * @returns Distance in 3D RGB space
 */
export declare function colorDistance(color1: RgbColor, color2: RgbColor): number;
/**
 * Map a color to a coverage level based on tolerance
 * @param hex - Hex color to match
 * @param colorMap - Map of coverage levels to hex colors
 * @param tolerance - RGB tolerance (default 10)
 * @returns Coverage level (0-4) or null if no match
 */
export declare function mapColorToCoverageLevel(hex: string, colorMap: CoverageColorMap, tolerance?: number): CoverageLevel;
/**
 * Standard coverage color map
 * Maps coverage levels to Ofcom tile colors
 */
export declare const COVERAGE_COLOR_MAP: CoverageColorMap;
