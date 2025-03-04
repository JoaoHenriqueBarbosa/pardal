import { BoundingBox, Color, CornerRadius } from '../model/types';

// Tipos de comandos de renderização
export enum RenderCommandType {
  RECTANGLE = 'RECTANGLE',
  CIRCLE = 'CIRCLE',
  SCISSOR_START = 'SCISSOR_START',
  SCISSOR_END = 'SCISSOR_END',
  TEXT = 'TEXT',
}

// Comando de renderização
export interface RenderCommand {
  boundingBox: BoundingBox;
  renderData: {
    rectangle?: {
      backgroundColor: Color;
      cornerRadius?: CornerRadius;
    };
    circle?: {
      backgroundColor: Color;
    };
    text?: {
      content: string;
      color: Color;
      fontId?: number;
      fontSize?: number;
      letterSpacing?: number;
      lineHeight?: number;
    };
  };
  commandType: RenderCommandType;
  zIndex: number;
}

// Utilitários para criar comandos de renderização
export function createRectangleCommand(
  boundingBox: BoundingBox, 
  backgroundColor: Color, 
  cornerRadius?: CornerRadius, 
  zIndex: number = 0
): RenderCommand {
  return {
    boundingBox,
    renderData: {
      rectangle: {
        backgroundColor,
        cornerRadius
      }
    },
    commandType: RenderCommandType.RECTANGLE,
    zIndex
  };
}

export function createCircleCommand(
  boundingBox: BoundingBox, 
  backgroundColor: Color, 
  zIndex: number = 0
): RenderCommand {
  return {
    boundingBox,
    renderData: {
      circle: {
        backgroundColor
      }
    },
    commandType: RenderCommandType.CIRCLE,
    zIndex
  };
}

export function createTextCommand(
  boundingBox: BoundingBox,
  content: string,
  color: Color,
  fontOptions: {
    fontId?: number,
    fontSize?: number,
    letterSpacing?: number,
    lineHeight?: number
  } = {},
  zIndex: number = 0
): RenderCommand {
  return {
    boundingBox,
    renderData: {
      text: {
        content,
        color,
        fontId: fontOptions.fontId,
        fontSize: fontOptions.fontSize || 16,
        letterSpacing: fontOptions.letterSpacing,
        lineHeight: fontOptions.lineHeight
      }
    },
    commandType: RenderCommandType.TEXT,
    zIndex
  };
}

// Sobrecarga que aceita diretamente um TextElementConfig
export function createTextCommandFromConfig(
  boundingBox: BoundingBox,
  textConfig: {
    content: string,
    color?: Color,
    fontId?: number,
    fontSize?: number,
    letterSpacing?: number,
    lineHeight?: number
  },
  zIndex: number = 0
): RenderCommand {
  return {
    boundingBox,
    renderData: {
      text: {
        content: textConfig.content,
        color: textConfig.color || { r: 0, g: 0, b: 0, a: 1 },
        fontId: textConfig.fontId,
        fontSize: textConfig.fontSize || 16,
        letterSpacing: textConfig.letterSpacing,
        lineHeight: textConfig.lineHeight
      }
    },
    commandType: RenderCommandType.TEXT,
    zIndex
  };
} 