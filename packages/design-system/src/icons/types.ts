/**
 * Icon Types
 * Common types for all icons in the design system
 */

/**
 * Icon props interface
 */
export interface IconProps {
  /** Icon size in pixels or CSS value */
  size?: number | string;
  /** Icon color (defaults to currentColor) */
  color?: string;
  /** Additional CSS class names */
  className?: string;
  /** Stroke width for outlined icons */
  strokeWidth?: number;
  /** Accessible label for the icon */
  ariaLabel?: string;
  /** Whether the icon is decorative (hidden from screen readers) */
  ariaHidden?: boolean;
}

/**
 * Icon data structure for framework-agnostic usage
 */
export interface IconData {
  /** SVG viewBox attribute */
  viewBox: string;
  /** Icon name for identification */
  name: string;
  /** SVG path data (d attribute) */
  path?: string;
  /** Multiple paths for complex icons */
  paths?: IconPath[];
  /** Default fill rule */
  fillRule?: 'nonzero' | 'evenodd';
  /** Whether the icon uses strokes instead of fills */
  stroke?: boolean;
}

/**
 * Individual path in an icon
 */
export interface IconPath {
  /** Path data (d attribute) */
  d: string;
  /** Fill color or 'none' for stroke-only */
  fill?: string;
  /** Stroke color */
  stroke?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Fill rule for this path */
  fillRule?: 'nonzero' | 'evenodd';
}

/**
 * SVG element types for complex icons
 */
export type SvgElement =
  | { type: 'path'; d: string; fill?: string; stroke?: string; strokeWidth?: number }
  | { type: 'circle'; cx: number; cy: number; r: number; fill?: string; stroke?: string }
  | { type: 'rect'; x: number; y: number; width: number; height: number; rx?: number; ry?: number; fill?: string; stroke?: string }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number; stroke?: string; strokeWidth?: number }
  | { type: 'polyline'; points: string; fill?: string; stroke?: string }
  | { type: 'polygon'; points: string; fill?: string; stroke?: string };

/**
 * Complex icon data with multiple SVG elements
 */
export interface ComplexIconData {
  viewBox: string;
  name: string;
  elements: SvgElement[];
}

/**
 * Default icon props
 */
export const defaultIconProps: Required<Omit<IconProps, 'className' | 'ariaLabel'>> = {
  size: 24,
  color: 'currentColor',
  strokeWidth: 2,
  ariaHidden: true,
};

/**
 * Create SVG string from icon data
 */
export function createSvgString(
  icon: IconData | ComplexIconData,
  props: IconProps = {}
): string {
  const {
    size = defaultIconProps.size,
    color = defaultIconProps.color,
    strokeWidth = defaultIconProps.strokeWidth,
    ariaLabel,
    ariaHidden = defaultIconProps.ariaHidden,
  } = props;

  const sizeAttr = typeof size === 'number' ? `${size}` : size;
  const ariaAttrs = ariaLabel
    ? `aria-label="${ariaLabel}" role="img"`
    : ariaHidden
    ? 'aria-hidden="true"'
    : '';

  let content = '';

  if ('path' in icon && icon.path) {
    content = `<path d="${icon.path}" fill="${color}" />`;
  } else if ('paths' in icon && icon.paths) {
    content = icon.paths
      .map(p => `<path d="${p.d}" fill="${p.fill || color}" stroke="${p.stroke || 'none'}" />`)
      .join('');
  } else if ('elements' in icon) {
    content = (icon as ComplexIconData).elements
      .map(el => renderSvgElement(el, color, strokeWidth))
      .join('');
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sizeAttr}" height="${sizeAttr}" viewBox="${icon.viewBox}" ${ariaAttrs}>${content}</svg>`;
}

/**
 * Render a single SVG element to string
 */
function renderSvgElement(element: SvgElement, defaultColor: string, defaultStrokeWidth: number): string {
  switch (element.type) {
    case 'path':
      return `<path d="${element.d}" fill="${element.fill || 'none'}" stroke="${element.stroke || defaultColor}" stroke-width="${element.strokeWidth || defaultStrokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`;
    case 'circle':
      return `<circle cx="${element.cx}" cy="${element.cy}" r="${element.r}" fill="${element.fill || 'none'}" stroke="${element.stroke || defaultColor}" />`;
    case 'rect':
      return `<rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" rx="${element.rx || 0}" ry="${element.ry || 0}" fill="${element.fill || 'none'}" stroke="${element.stroke || defaultColor}" />`;
    case 'line':
      return `<line x1="${element.x1}" y1="${element.y1}" x2="${element.x2}" y2="${element.y2}" stroke="${element.stroke || defaultColor}" stroke-width="${element.strokeWidth || defaultStrokeWidth}" stroke-linecap="round" />`;
    case 'polyline':
      return `<polyline points="${element.points}" fill="${element.fill || 'none'}" stroke="${element.stroke || defaultColor}" stroke-linecap="round" stroke-linejoin="round" />`;
    case 'polygon':
      return `<polygon points="${element.points}" fill="${element.fill || 'none'}" stroke="${element.stroke || defaultColor}" />`;
    default:
      return '';
  }
}
