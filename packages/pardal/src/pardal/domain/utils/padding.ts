import { Padding, DEFAULT_PADDING } from '../model/types';

// Converter entrada de padding
export function parsePadding(input: number | Padding | undefined): Padding {
  if (input === undefined) {
    return { left: DEFAULT_PADDING, right: DEFAULT_PADDING, top: DEFAULT_PADDING, bottom: DEFAULT_PADDING };
  }
  
  if (typeof input === 'number') {
    return { left: input, right: input, top: input, bottom: input };
  }
  
  return input;
} 