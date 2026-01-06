import { pdfjs } from 'react-pdf';
import { rectanglesIntersect } from './coordinates';

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

/**
 * Extract text from a rectangular region in a PDF page
 * @param pdfDocument - The PDF document proxy from react-pdf
 * @param pageIndex - Zero-based page index
 * @param rect - Rectangle in PDF coordinates (bottom-left origin)
 * @returns Extracted text content
 */
export async function extractTextFromRect(
  pdfDocument: pdfjs.PDFDocumentProxy,
  pageIndex: number,
  rect: { x: number; y: number; width: number; height: number }
): Promise<string> {
  try {
    // Get the page (PDF.js uses 1-based indexing)
    const page = await pdfDocument.getPage(pageIndex + 1);

    // Get text content from the page
    const textContent = await page.getTextContent();

    // Collect text items that intersect with the selection rectangle
    const extractedItems: Array<{ str: string; y: number; x: number }> = [];

    textContent.items.forEach((item) => {
      // Type guard to ensure we have a text item with required properties
      if ('str' in item && 'transform' in item) {
        const textItem = item as TextItem;

        // Extract position and dimensions from transform matrix
        // transform[4] = x, transform[5] = y (bottom-left of text)
        const [, , , , itemX, itemY] = textItem.transform;
        const itemWidth = textItem.width || 0;
        const itemHeight = textItem.height || 10; // Default height if not available

        // Create bounding box for text item
        const itemRect = {
          x: itemX,
          y: itemY,
          width: itemWidth,
          height: itemHeight,
        };

        // Check if text item intersects with selection rectangle
        if (rectanglesIntersect(itemRect, rect)) {
          extractedItems.push({
            str: textItem.str,
            y: itemY,
            x: itemX,
          });
        }
      }
    });

    // Sort text items by position (top to bottom, left to right)
    // Since PDF uses bottom-left origin, higher Y values are at the top
    extractedItems.sort((a, b) => {
      // Sort by Y (descending - top to bottom)
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 5) {
        // Tolerance for same line
        return yDiff;
      }
      // Same line, sort by X (ascending - left to right)
      return a.x - b.x;
    });

    // Join text items with appropriate spacing
    let result = '';
    let lastY = -1;

    extractedItems.forEach((item, index) => {
      if (index > 0) {
        // Add line break if Y position changed significantly
        if (Math.abs(item.y - lastY) > 5) {
          result += '\n';
        } else {
          // Same line, add space
          result += ' ';
        }
      }
      result += item.str;
      lastY = item.y;
    });

    return result.trim();
  } catch (error) {
    console.error('Text extraction failed:', error);
    return '';
  }
}

/**
 * Simple fallback text extraction using DOM selection
 * This is less precise but works as a backup method
 * @returns Selected text from the DOM
 */
export function extractTextFromDOMSelection(): string {
  const selection = window.getSelection();
  return selection ? selection.toString().trim() : '';
}
