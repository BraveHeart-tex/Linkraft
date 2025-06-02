import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

interface SanitizeSVGResult {
  success: boolean;
  sanitized?: Buffer;
  error?: string;
}

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const DOMPurify = createDOMPurify(dom.window);

export function sanitizeSVG(svgContent: Buffer): SanitizeSVGResult {
  try {
    const content = svgContent.toString('utf8');

    if (!content?.trim()) {
      return { success: false, error: 'Empty SVG content' };
    }

    // Basic SVG structure check
    if (!content.includes('<svg')) {
      return { success: false, error: 'Invalid SVG structure' };
    }

    // More permissive sanitization - just remove the most dangerous stuff
    const sanitized = DOMPurify.sanitize(content, {
      USE_PROFILES: { svg: true },

      // Remove only the most dangerous tags
      FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'link', 'style'],

      // Remove only the most dangerous attributes
      FORBID_ATTR: [
        'onload',
        'onerror',
        'onclick',
        'onmouseover',
        'onfocus',
        'onblur',
        'onchange',
        'onsubmit',
        'onreset',
        'onselect',
        'onkeydown',
        'onkeypress',
        'onkeyup',
        'onmousedown',
        'onmouseup',
        'onmousemove',
      ],

      ALLOW_DATA_ATTR: false,
      SANITIZE_DOM: true,
    });

    // Post-process to clean up external URLs in fill/stroke
    let cleanedSvg = sanitized;

    // Replace external URLs with safe alternatives
    cleanedSvg = cleanedSvg.replace(
      /fill\s*=\s*["']url\s*\([^)]*:\/\/[^)]*\)["']/gi,
      'fill="none"'
    );
    cleanedSvg = cleanedSvg.replace(
      /fill\s*=\s*["']url\s*\(\s*["']?\/\/[^)]*\)["']/gi,
      'fill="none"'
    );
    cleanedSvg = cleanedSvg.replace(
      /stroke\s*=\s*["']url\s*\([^)]*:\/\/[^)]*\)["']/gi,
      'stroke="none"'
    );
    cleanedSvg = cleanedSvg.replace(
      /stroke\s*=\s*["']url\s*\(\s*["']?\/\/[^)]*\)["']/gi,
      'stroke="none"'
    );

    // Remove href attributes from any remaining elements
    cleanedSvg = cleanedSvg.replace(
      /\s(href|xlink:href)\s*=\s*["'][^"']*["']/gi,
      ''
    );

    cleanedSvg = cleanedSvg.replace(
      /fill\s*=\s*["']url\s*\([^)]*\)["']/gi,
      'fill="none"'
    );
    cleanedSvg = cleanedSvg.replace(
      /stroke\s*=\s*["']url\s*\([^)]*\)["']/gi,
      'stroke="none"'
    );

    // Remove empty anchor tags
    cleanedSvg = cleanedSvg.replace(/<a\s*>\s*([^<]*)\s*<\/a>/gi, '$1');

    // Remove text content that's not in proper SVG text elements
    cleanedSvg = cleanedSvg.replace(/>\s*([^<>]+)\s*</g, (match, content) => {
      // Keep text if it's clearly SVG content (numbers, coordinates, etc.)
      if (/^[\d\s.,-]+$/.test(content.trim())) {
        return match;
      }
      // Remove other loose text
      return '><';
    });

    // Final minimal safety check - only block the absolutely dangerous stuff
    const criticalPatterns = [/<script/i, /javascript:/i, /vbscript:/i];

    for (const pattern of criticalPatterns) {
      if (pattern.test(cleanedSvg)) {
        return { success: false, error: 'Critical security threat detected' };
      }
    }

    return {
      success: true,
      sanitized: Buffer.from(cleanedSvg.trim()),
    };
  } catch (error) {
    return {
      success: false,
      error: `Sanitization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
