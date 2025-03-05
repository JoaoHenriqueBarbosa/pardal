import { MeasuredWord } from '../model/element';
import { BoundingBox, Color, CornerRadius } from '../model/types';

// Tipos de comandos de renderização
export enum RenderCommandType {
  RECTANGLE = 'RECTANGLE',
  CIRCLE = 'CIRCLE',
  SCISSOR_START = 'SCISSOR_START',
  SCISSOR_END = 'SCISSOR_END',
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
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
      content: MeasuredWord[];
      color: Color;
      fontId?: number;
      fontSize?: number;
      letterSpacing?: number;
      lineHeight?: number;
    };
    image?: {
      source: string;
      fit: string;
      opacity: number;
      cornerRadius?: CornerRadius;
      rounded?: boolean;
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
  content: MeasuredWord[],
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
    content: MeasuredWord[],
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

/**
 * Cria um comando de renderização de imagem
 */
export function createImageCommand(
  boundingBox: BoundingBox,
  source: string,
  options: {
    fit?: string,
    opacity?: number,
    cornerRadius?: CornerRadius,
    rounded?: boolean
  } = {},
  zIndex: number = 0
): RenderCommand {
  return {
    boundingBox,
    renderData: {
      image: {
        source,
        fit: options.fit || 'CONTAIN',
        opacity: options.opacity !== undefined ? options.opacity : 1.0,
        cornerRadius: options.cornerRadius,
        rounded: options.rounded
      }
    },
    commandType: RenderCommandType.IMAGE,
    zIndex
  };
}

/**
 * Cria um comando de renderização de imagem a partir de uma configuração
 */
export function createImageCommandFromConfig(
  boundingBox: BoundingBox,
  imageConfig: {
    source: string,
    fit?: string,
    opacity?: number,
    cornerRadius?: CornerRadius,
    rounded?: boolean
  },
  zIndex: number = 0
): RenderCommand {
  return createImageCommand(
    boundingBox,
    imageConfig.source,
    {
      fit: imageConfig.fit,
      opacity: imageConfig.opacity,
      cornerRadius: imageConfig.cornerRadius,
      rounded: imageConfig.rounded
    },
    zIndex
  );
} 