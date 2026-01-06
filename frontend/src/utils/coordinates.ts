/**
 * Coordinate conversion utilities for PDF and DOM coordinate systems
 *
 * PDF Coordinate System:
 * - Origin: Bottom-left corner
 * - Y-axis: Increases upward
 *
 * DOM Coordinate System:
 * - Origin: Top-left corner
 * - Y-axis: Increases downward
 */

/**
 * Convert PDF Y coordinate to DOM Y coordinate
 * @param pdfY - Y coordinate in PDF space
 * @param pageHeight - Height of the PDF page in PDF units
 * @param scale - Current zoom scale
 * @returns Y coordinate in DOM space
 */
export function pdfToDomY(pdfY: number, pageHeight: number, scale: number): number {
  return (pageHeight - pdfY) * scale;
}

/**
 * Convert DOM Y coordinate to PDF Y coordinate
 * @param domY - Y coordinate in DOM space
 * @param pageHeight - Height of the PDF page in PDF units
 * @param scale - Current zoom scale
 * @returns Y coordinate in PDF space
 */
export function domToPdfY(domY: number, pageHeight: number, scale: number): number {
  return pageHeight - domY / scale;
}

/**
 * Convert PDF X coordinate to DOM X coordinate
 * @param pdfX - X coordinate in PDF space
 * @param scale - Current zoom scale
 * @returns X coordinate in DOM space
 */
export function pdfToDomX(pdfX: number, scale: number): number {
  return pdfX * scale;
}

/**
 * Convert DOM X coordinate to PDF X coordinate
 * @param domX - X coordinate in DOM space
 * @param scale - Current zoom scale
 * @returns X coordinate in PDF space
 */
export function domToPdfX(domX: number, scale: number): number {
  return domX / scale;
}

/**
 * Convert a PDF rectangle to DOM coordinates
 * @param pdfRect - Rectangle in PDF space
 * @param pageHeight - Height of the PDF page in PDF units
 * @param scale - Current zoom scale
 * @returns Rectangle in DOM space
 */
export function pdfRectToDomRect(
  pdfRect: { x: number; y: number; width: number; height: number },
  pageHeight: number,
  scale: number
): { x: number; y: number; width: number; height: number } {
  // PDF Y is at bottom of rect, DOM Y is at top
  const domY = pdfToDomY(pdfRect.y + pdfRect.height, pageHeight, scale);

  return {
    x: pdfToDomX(pdfRect.x, scale),
    y: domY,
    width: pdfRect.width * scale,
    height: pdfRect.height * scale,
  };
}

/**
 * Convert a DOM rectangle to PDF coordinates
 * @param domRect - Rectangle in DOM space
 * @param pageHeight - Height of the PDF page in PDF units
 * @param scale - Current zoom scale
 * @returns Rectangle in PDF space
 */
export function domRectToPdfRect(
  domRect: { x: number; y: number; width: number; height: number },
  pageHeight: number,
  scale: number
): { x: number; y: number; width: number; height: number } {
  const pdfWidth = domRect.width / scale;
  const pdfHeight = domRect.height / scale;

  // DOM Y is at top of rect, PDF Y should be at bottom
  const pdfY = domToPdfY(domRect.y + domRect.height, pageHeight, scale);

  return {
    x: domToPdfX(domRect.x, scale),
    y: pdfY,
    width: pdfWidth,
    height: pdfHeight,
  };
}

/**
 * Check if two rectangles intersect
 * @param rect1 - First rectangle
 * @param rect2 - Second rectangle
 * @returns True if rectangles intersect
 */
export function rectanglesIntersect(
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  );
}
