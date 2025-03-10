import type { MeasuredWord } from "../model/element";
import type { BoundingBox, CornerRadius } from "../model/types";

// Tipos de comandos de renderização
export enum RenderCommandType {
  RECTANGLE = "RECTANGLE",
  CIRCLE = "CIRCLE",
  SCISSOR_START = "SCISSOR_START",
  SCISSOR_END = "SCISSOR_END",
  TEXT = "TEXT",
  IMAGE = "IMAGE",
}

// Comando de renderização
export interface RenderCommand {
  id: string;
  pageId: number;
  boundingBox: BoundingBox;
  renderData: {
    rectangle?: {
      backgroundColor: string;
      cornerRadius?: CornerRadius;
      opacity?: number;
      spreadness?: number;
      source?: Buffer;
    };
    circle?: {
      backgroundColor: string;
    };
    text?: {
      content: MeasuredWord[];
      color: string;
      fontId?: number;
      fontSize?: number;
      letterSpacing?: number;
      lineHeight?: number;
    };
    image?: {
      source: Buffer;
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
  id: string,
  pageId: number,
  boundingBox: BoundingBox,
  backgroundColor: string,
  cornerRadius?: CornerRadius,
  opacity?: number,
  spreadness?: number,
  source?: Buffer,
  zIndex = 0
): RenderCommand {
  return {
    id,
    pageId,
    boundingBox,
    renderData: {
      rectangle: {
        backgroundColor,
        cornerRadius,
        opacity,
        spreadness,
        source,
      },
    },
    commandType: RenderCommandType.RECTANGLE,
    zIndex,
  };
}

export function createCircleCommand(
  id: string,
  pageId: number,
  boundingBox: BoundingBox,
  backgroundColor: string,
  zIndex = 0
): RenderCommand {
  return {
    id,
    pageId,
    boundingBox,
    renderData: {
      circle: {
        backgroundColor,
      },
    },
    commandType: RenderCommandType.CIRCLE,
    zIndex,
  };
}

export function createTextCommand(
  id: string,
  pageId: number,
  boundingBox: BoundingBox,
  content: MeasuredWord[],
  color: string,
  fontOptions: {
    fontId?: number;
    fontSize?: number;
    letterSpacing?: number;
    lineHeight?: number;
  } = {},
  zIndex = 0
): RenderCommand {
  return {
    id,
    pageId,
    boundingBox,
    renderData: {
      text: {
        content,
        color,
        fontId: fontOptions.fontId,
        fontSize: fontOptions.fontSize || 16,
        letterSpacing: fontOptions.letterSpacing,
        lineHeight: fontOptions.lineHeight,
      },
    },
    commandType: RenderCommandType.TEXT,
    zIndex,
  };
}

// Sobrecarga que aceita diretamente um TextElementConfig
export function createTextCommandFromConfig(
  id: string,
  pageId: number,
  boundingBox: BoundingBox,
  textConfig: {
    content: MeasuredWord[];
    color?: string;
    fontId?: number;
    fontSize?: number;
    letterSpacing?: number;
    lineHeight?: number;
  },
  zIndex = 0
): RenderCommand {
  return {
    id,
    pageId,
    boundingBox,
    renderData: {
      text: {
        content: textConfig.content,
        color: textConfig.color || "#000000",
        fontId: textConfig.fontId,
        fontSize: textConfig.fontSize || 16,
        letterSpacing: textConfig.letterSpacing,
        lineHeight: textConfig.lineHeight,
      },
    },
    commandType: RenderCommandType.TEXT,
    zIndex,
  };
}

/**
 * Cria um comando de renderização de imagem
 */
export function createImageCommand(
  id: string,
  pageId: number,
  boundingBox: BoundingBox,
  source: Buffer,
  options: {
    fit?: string;
    opacity?: number;
    cornerRadius?: CornerRadius;
    rounded?: boolean;
  } = {},
  zIndex = 0
): RenderCommand {
  return {
    id,
    pageId,
    boundingBox,
    renderData: {
      image: {
        source,
        fit: options.fit || "CONTAIN",
        opacity: options.opacity !== undefined ? options.opacity : 1.0,
        cornerRadius: options.cornerRadius,
        rounded: options.rounded,
      },
    },
    commandType: RenderCommandType.IMAGE,
    zIndex,
  };
}

/**
 * Cria um comando de renderização de imagem a partir de uma configuração
 */
export function createImageCommandFromConfig(
  id: string,
  pageId: number,
  boundingBox: BoundingBox,
  imageConfig: {
    source: Buffer;
    fit?: string;
    opacity?: number;
    cornerRadius?: CornerRadius;
    rounded?: boolean;
  },
  zIndex = 0
): RenderCommand {
  return createImageCommand(
    id,
    pageId,
    boundingBox,
    imageConfig.source,
    {
      fit: imageConfig.fit,
      opacity: imageConfig.opacity,
      cornerRadius: imageConfig.cornerRadius,
      rounded: imageConfig.rounded,
    },
    zIndex
  );
}
