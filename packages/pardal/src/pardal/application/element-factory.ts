import type Pardal from "..";
import { Sizing } from "../domain/layout/sizing";
import type { ElementDeclaration, LayoutElement } from "../domain/model/element";
import {
  Direction,
  type ElementType,
  type ImageElementConfig,
  ImageFitMode,
  LayoutAlignmentX,
  LayoutAlignmentY,
  type LayoutConfig,
  TextAlignment,
  type TextElementConfig,
  TextWrapMode,
} from "../domain/model/types";
import { parseColor } from "../domain/utils/color";
import { parsePadding } from "../domain/utils/padding";

/**
 * Cria um elemento com a configuração especificada
 */
export function createElement(
  pardal: Pardal,
  elementType: ElementType,
  config: ElementDeclaration = {}
): void {
  const currentContext = pardal.getContext();

  // Processar cor de fundo e padding
  const backgroundColor = parseColor(config.fillColor || config.backgroundColor);
  const padding = parsePadding(config.padding);

  // Processamento especial para texto
  let textConfig: TextElementConfig | undefined;
  if (elementType === "text" && config.text) {
    // Forma única: texto como string, e todas as configurações no objeto principal
    if (typeof config.text === "string") {
      textConfig = {
        content: config.text,
        color: config.color || config.fillColor || config.backgroundColor || "#000000",
        fontSize: config.fontSize || 16,
        wrapMode: config.wrapMode || TextWrapMode.WORDS,
        textAlignment: config.textAlignment || TextAlignment.LEFT,
        lineHeight: config.lineHeight,
        lineSpacingFactor: config.lineSpacingFactor,
        letterSpacing: config.letterSpacing,
        fontId: config.fontId,
        fontFamily: config.fontFamily,
        fontWeight: config.fontWeight,
        fontStyle: config.fontStyle,
      };
    }
    // Para compatibilidade com código existente
    else {
      textConfig = {
        ...config.text,
        // Garantir que todos os parâmetros obrigatórios existam
        content: config.text.content || "",
        // Aplicar valores padrão se não forem especificados
        color: config.text.color || config.fillColor || config.backgroundColor || "#000000",
        fontSize: config.text.fontSize || 16,
        wrapMode: config.text.wrapMode || TextWrapMode.WORDS,
        textAlignment: config.text.textAlignment || TextAlignment.LEFT,
        lineSpacingFactor: config.text.lineSpacingFactor || config.lineSpacingFactor,
      };
    }
  }

  // Processamento especial para imagem
  let imageConfig: ImageElementConfig | undefined = undefined;
  if (elementType === "image" && config.source) {
    imageConfig = {
      source: config.source,
      fit: (config.fit as ImageFitMode) || ImageFitMode.CONTAIN,
      opacity: config.opacity !== undefined ? config.opacity : 1.0,
      cornerRadius: config.cornerRadius,
      rounded: config.rounded,
    };
  }

  // Configuração padrão para o layout
  const defaultLayoutConfig: LayoutConfig = {
    sizing: {
      width: config.width || Sizing.fit(),
      height: config.height || Sizing.fit(),
    },
    padding,
    childGap: config.childGap !== undefined ? config.childGap : 0,
    childAlignment: {
      x: LayoutAlignmentX.LEFT,
      y: LayoutAlignmentY.TOP,
    },
    layoutDirection: config.direction || Direction.COLUMN,
  };

  // Mesclando a configuração de layout fornecida com a padrão
  const finalLayoutConfig: LayoutConfig = {
    ...defaultLayoutConfig,
    ...(config.layout || {}),
    // Garantir que os valores específicos tenham precedência
    padding,
    childGap: config.childGap !== undefined ? config.childGap : defaultLayoutConfig.childGap,
    sizing: {
      width: config.width || config.layout?.sizing?.width || defaultLayoutConfig.sizing.width,
      height: config.height || config.layout?.sizing?.height || defaultLayoutConfig.sizing.height,
    },
    // Usar o campo direction se fornecido
    layoutDirection:
      config.direction || config.layout?.layoutDirection || defaultLayoutConfig.layoutDirection,
    // Usar o campo childAlignment se fornecido
    childAlignment:
      config.childAlignment || config.layout?.childAlignment || defaultLayoutConfig.childAlignment,
  };

  // Configuração completa do elemento
  const element: LayoutElement = {
    id: config.id || `element-${currentContext.generation}-${currentContext.layoutElements.length}`,
    pageId: config.pageId || currentContext.currentPageId,
    children: [],
    dimensions: { width: 0, height: 0 },
    minDimensions: { width: 0, height: 0 },
    layoutConfig: finalLayoutConfig,
    backgroundColor,
    cornerRadius: config.cornerRadius,
    elementType,
    textConfig,
    imageConfig,
  };

  // Adicionar posição absoluta se fornecida
  if (config.absolute && config.x !== undefined && config.y !== undefined) {
    element.position = { x: config.x, y: config.y };
    element.absolute = true;
  }

  if (currentContext.debugMode) {
    currentContext.logger.debug(
      `Criando elemento ${element.id} (${elementType}) com childAlignment: x=${finalLayoutConfig.childAlignment.x}, y=${finalLayoutConfig.childAlignment.y}`
    );
    if (element.position) {
      currentContext.logger.debug(
        `  Posição absoluta definida: (${element.position.x}, ${element.position.y})`
      );
    }
  }

  // Adicionar ao contexto
  pardal.addLayoutElement(element);

  // Adicionar ao pai atual
  if (currentContext.openLayoutElementStack.length > 0) {
    const parent =
      currentContext.openLayoutElementStack[currentContext.openLayoutElementStack.length - 1];
    parent.children.push(element);
  }

  // Adicionar ao stack de elementos abertos
  pardal.addOpenLayoutElementStack(element);

  // Adicionar ao mapa de ids
  if (element.id) {
    pardal.addIdMap(element.id, element);
  }
}

/**
 * Fecha o elemento atual
 */
export function endElement(pardal: Pardal): void {
  const currentContext = pardal.getContext();

  if (currentContext.openLayoutElementStack.length === 0) {
    throw new Error("No open element to close.");
  }

  pardal.popOpenLayoutElementStack();
}
