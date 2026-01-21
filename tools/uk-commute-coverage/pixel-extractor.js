/**
 * Pixel Extraction Module
 * Extracts pixel colors from PNG images and handles color matching
 */

/**
 * Extract RGB color from an image at specific pixel coordinates
 * Uses Canvas API to draw the image and get pixel data
 * @param {Image|HTMLImageElement|Blob} imageData - Image element or blob
 * @param {number} pixelX - X coordinate of pixel (0-255)
 * @param {number} pixelY - Y coordinate of pixel (0-255)
 * @returns {Promise<Object>} {r, g, b, hex}
 */
async function extractPixelColor(imageData, pixelX, pixelY) {
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

        const imageData = ctx.getImageData(x, y, 1, 1);
        const data = imageData.data;

        const color = {
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
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {string} Hex color string (e.g., "#7d2093")
 */
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Convert hex color to RGB
 * @param {string} hex - Hex color string (e.g., "#7d2093")
 * @returns {Object} {r, g, b}
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate Euclidean distance between two RGB colors
 * @param {Object} color1 - {r, g, b}
 * @param {Object} color2 - {r, g, b}
 * @returns {number} Distance in 3D RGB space
 */
function colorDistance(color1, color2) {
  const dr = color1.r - color2.r;
  const dg = color1.g - color2.g;
  const db = color1.b - color2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Map a color to a coverage level based on tolerance
 * @param {string} hex - Hex color to match
 * @param {Object} colorMap - Map of coverage levels to hex colors
 * @param {number} tolerance - RGB tolerance (default 10)
 * @returns {number|null} Coverage level (0-4) or null if no match
 */
function mapColorToCoverageLevel(hex, colorMap, tolerance = 10) {
  const extractedRgb = hexToRgb(hex);
  if (!extractedRgb) {
    return null;
  }

  let bestMatch = null;
  let bestDistance = Infinity;

  for (const [level, colorHex] of Object.entries(colorMap)) {
    const mappedRgb = hexToRgb(colorHex);
    if (!mappedRgb) continue;

    const distance = colorDistance(extractedRgb, mappedRgb);

    if (distance <= tolerance && distance < bestDistance) {
      bestMatch = parseInt(level);
      bestDistance = distance;
    }
  }

  return bestMatch;
}

/**
 * Standard coverage color map
 * Maps coverage levels to Ofcom tile colors
 */
const COVERAGE_COLOR_MAP = {
  4: '#7d2093', // Good outdoor and in-home (purple)
  3: '#cd7be4', // Good outdoor, variable in-home (light purple)
  2: '#0081b3', // Good outdoor (blue)
  1: '#83e5f6', // Variable outdoor (cyan)
  0: '#d4d4d4'  // Poor to none outdoor (gray)
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    extractPixelColor,
    rgbToHex,
    hexToRgb,
    colorDistance,
    mapColorToCoverageLevel,
    COVERAGE_COLOR_MAP
  };
}
