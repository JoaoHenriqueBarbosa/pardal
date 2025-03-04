import { Color, DEFAULT_ALPHA } from '../model/types';

// Conversor de cor hexadecimal para RGBA
export function hexToRgba(hex: string, alpha: number = DEFAULT_ALPHA): Color {
  // Verificar se é uma cor hexadecimal
  if (typeof hex !== 'string' || !hex.match(/^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)) {
    return { r: 0, g: 0, b: 0, a: alpha * 255 };
  }

  const hexCode = hex.startsWith('#') ? hex.substring(1) : hex;
  
  // Lidar com formatos curtos como #FFF
  const isShortHex = hexCode.length === 3;
  const r = parseInt(isShortHex ? hexCode[0] + hexCode[0] : hexCode.substring(0, 2), 16);
  const g = parseInt(isShortHex ? hexCode[1] + hexCode[1] : hexCode.substring(2, 4), 16);
  const b = parseInt(isShortHex ? hexCode[2] + hexCode[2] : hexCode.substring(4, 6), 16);
  
  return { r, g, b, a: alpha * 255 };
}

// Converter entrada de cor em objeto Color
export function parseColor(input: string | Color | undefined): Color {
  if (!input) {
    return { r: 255, g: 255, b: 255, a: 255 };
  }
  
  if (typeof input === 'string') {
    return hexToRgba(input);
  }
  
  return input;
}

// Converter cor para formato hexadecimal
export function colorToHex(color: Color): string {
  const r = color.r.toString(16).padStart(2, '0');
  const g = color.g.toString(16).padStart(2, '0');
  const b = color.b.toString(16).padStart(2, '0');
  
  return `#${r}${g}${b}`;
} 