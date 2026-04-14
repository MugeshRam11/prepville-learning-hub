/**
 * Bounding Box Utilities
 * Handles normalization, rotation adjustment, and validation
 * for diagram cropping from PDF pages.
 */

export interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

/**
 * Normalize a bounding box:
 * - Fix swapped min/max values
 * - Convert pixel values (>100) to percentages assuming 2048px render
 * - Clamp all values to 0-100 range
 */
export function normalizeBoundingBox(box: any): BoundingBox | null {
  if (!box) return null;

  let { x_min, y_min, x_max, y_max } = box;

  // Ensure numeric
  x_min = Number(x_min) || 0;
  y_min = Number(y_min) || 0;
  x_max = Number(x_max) || 0;
  y_max = Number(y_max) || 0;

  // Fix swapped values
  if (x_min > x_max) [x_min, x_max] = [x_max, x_min];
  if (y_min > y_max) [y_min, y_max] = [y_max, y_min];

  // Detect pixel-based values and convert to percentage
  if (x_max > 100 || y_max > 100) {
    const assumedDimension = 2048;
    console.log('[BoundingBox] Detected pixel values, converting to percentages (assuming 2048px)');
    x_min = (x_min / assumedDimension) * 100;
    x_max = (x_max / assumedDimension) * 100;
    y_min = (y_min / assumedDimension) * 100;
    y_max = (y_max / assumedDimension) * 100;
  }

  // Clamp to valid range
  return {
    x_min: Math.max(0, Math.min(100, x_min)),
    y_min: Math.max(0, Math.min(100, y_min)),
    x_max: Math.max(0, Math.min(100, x_max)),
    y_max: Math.max(0, Math.min(100, y_max)),
  };
}

/**
 * Adjust bounding box coordinates for page rotation.
 * PDF.js may render pages with rotation (90, 180, 270 degrees).
 * The AI returns bounding boxes relative to the visual layout,
 * but the rendered image may be rotated.
 */
export function adjustForRotation(box: BoundingBox | null, rotation: number): BoundingBox | null {
  if (!box) return null;

  // Normalize rotation to 0, 90, 180, 270
  const rot = ((rotation % 360) + 360) % 360;

  if (rot === 90) {
    return {
      x_min: box.y_min,
      y_min: 100 - box.x_max,
      x_max: box.y_max,
      y_max: 100 - box.x_min,
    };
  }

  if (rot === 180) {
    return {
      x_min: 100 - box.x_max,
      y_min: 100 - box.y_max,
      x_max: 100 - box.x_min,
      y_max: 100 - box.y_min,
    };
  }

  if (rot === 270) {
    return {
      x_min: 100 - box.y_max,
      y_min: box.x_min,
      x_max: 100 - box.y_min,
      y_max: box.x_max,
    };
  }

  return box; // 0 degrees, no adjustment needed
}

/**
 * Validate that a bounding box produces a meaningful crop area.
 * Returns false if the box is too small or invalid.
 */
export function isValidBoundingBox(box: BoundingBox | null, minSizePercent: number = 1): boolean {
  if (!box) return false;
  const width = box.x_max - box.x_min;
  const height = box.y_max - box.y_min;
  return width >= minSizePercent && height >= minSizePercent;
}

/**
 * Calculate pixel crop coordinates from a percentage-based bounding box.
 * Returns clamped coordinates with optional padding.
 */
export function calculateCropCoordinates(
  box: BoundingBox,
  imageWidth: number,
  imageHeight: number,
  paddingPx: number = 10
) {
  let cropX = (box.x_min / 100) * imageWidth;
  let cropY = (box.y_min / 100) * imageHeight;
  let cropW = ((box.x_max - box.x_min) / 100) * imageWidth;
  let cropH = ((box.y_max - box.y_min) / 100) * imageHeight;

  // Failsafe: if crop area is too small, use center crop
  if (cropW < 20 || cropH < 20) {
    console.warn('[BoundingBox] Crop area too small, using center fallback');
    cropX = imageWidth * 0.2;
    cropY = imageHeight * 0.2;
    cropW = imageWidth * 0.6;
    cropH = imageHeight * 0.6;
    return { cropX, cropY, cropW, cropH, usedFallback: true };
  }

  // Apply padding
  const paddedX = Math.max(0, cropX - paddingPx);
  const paddedY = Math.max(0, cropY - paddingPx);
  const paddedW = Math.min(imageWidth - paddedX, cropW + paddingPx * 2);
  const paddedH = Math.min(imageHeight - paddedY, cropH + paddingPx * 2);

  return {
    cropX: paddedX,
    cropY: paddedY,
    cropW: paddedW,
    cropH: paddedH,
    usedFallback: false,
  };
}
