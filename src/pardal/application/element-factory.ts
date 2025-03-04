import { LayoutConfig, ElementType, Direction, LayoutAlignmentX, LayoutAlignmentY, TextElementConfig, TextAlignment, TextWrapMode } from '../domain/model/types';
import { ElementDeclaration, LayoutElement, ensureId } from '../domain/model/element';
import { parseColor } from '../domain/utils/color';
import { parsePadding } from '../domain/utils/padding';
import { getCurrentContext } from '../domain/layout/context';
import { Sizing } from '../domain/layout/sizing';

/**
 * Cria um elemento com a configuração especificada
 */
export function createElement(elementType: ElementType, config: ElementDeclaration = {}): void {
  const currentContext = getCurrentContext();
  
  // Processar cor de fundo e padding
  const backgroundColor = parseColor(config.fillColor || config.backgroundColor);
  const padding = parsePadding(config.padding);
  
  // Processamento especial para texto
  let textConfig: TextElementConfig | undefined;
  if (elementType === 'text' && config.text) {
    // Forma única: texto como string, e todas as configurações no objeto principal
    if (typeof config.text === 'string') {
      textConfig = {
        content: config.text,
        color: config.color || config.fillColor || config.backgroundColor || '#000000',
        fontSize: config.fontSize || 16,
        wrapMode: config.wrapMode || TextWrapMode.WORDS,
        textAlignment: config.textAlignment || TextAlignment.LEFT,
        lineHeight: config.lineHeight,
        letterSpacing: config.letterSpacing,
        fontId: config.fontId,
        fontFamily: config.fontFamily,
        fontWeight: config.fontWeight,
        fontStyle: config.fontStyle
      };
    } 
    // Para compatibilidade com código existente
    else {
      textConfig = {
        ...config.text,
        // Garantir que todos os parâmetros obrigatórios existam
        content: config.text.content || '',
        // Aplicar valores padrão se não forem especificados
        color: config.text.color || config.fillColor || config.backgroundColor || '#000000',
        fontSize: config.text.fontSize || 16,
        wrapMode: config.text.wrapMode || TextWrapMode.WORDS,
        textAlignment: config.text.textAlignment || TextAlignment.LEFT
      };
    }
  }
  
  // Configuração padrão para o layout
  const defaultLayoutConfig: LayoutConfig = {
    sizing: {
      width: config.width || Sizing.fit(),
      height: config.height || Sizing.fit()
    },
    padding,
    childGap: config.childGap !== undefined ? config.childGap : 0,
    childAlignment: {
      x: LayoutAlignmentX.LEFT,
      y: LayoutAlignmentY.TOP
    },
    layoutDirection: config.direction || Direction.COLUMN
  };
  
  // Mesclando a configuração de layout fornecida com a padrão
  const finalLayoutConfig: LayoutConfig = {
    ...defaultLayoutConfig,
    ...(config.layout || {}),
    // Garantir que os valores específicos tenham precedência
    padding,
    childGap: config.childGap !== undefined ? config.childGap : defaultLayoutConfig.childGap,
    sizing: {
      width: config.width || (config.layout?.sizing?.width || defaultLayoutConfig.sizing.width),
      height: config.height || (config.layout?.sizing?.height || defaultLayoutConfig.sizing.height)
    },
    // Usar o campo direction se fornecido
    layoutDirection: config.direction || (config.layout?.layoutDirection || defaultLayoutConfig.layoutDirection),
    // Usar o campo childAlignment se fornecido
    childAlignment: config.childAlignment || (config.layout?.childAlignment || defaultLayoutConfig.childAlignment)
  };
  
  // Configuração completa do elemento
  const element: LayoutElement = {
    id: config.id || `element-${currentContext.generation}-${currentContext.layoutElements.length}`,
    children: [],
    dimensions: { width: 0, height: 0 },
    minDimensions: { width: 0, height: 0 },
    layoutConfig: finalLayoutConfig,
    backgroundColor,
    cornerRadius: config.cornerRadius,
    elementType,
    textConfig
  };
  
  if (currentContext.debugMode) {
    console.log(`Criando elemento ${element.id} (${elementType}) com childAlignment: x=${finalLayoutConfig.childAlignment.x}, y=${finalLayoutConfig.childAlignment.y}`);
  }
  
  // Adicionar ao contexto
  currentContext.layoutElements.push(element);
  
  // Adicionar ao pai atual
  if (currentContext.openLayoutElementStack.length > 0) {
    const parent = currentContext.openLayoutElementStack[currentContext.openLayoutElementStack.length - 1];
    parent.children.push(element);
  }
  
  // Adicionar ao stack de elementos abertos
  currentContext.openLayoutElementStack.push(element);
  
  // Adicionar ao mapa de ids
  if (element.id) {
    currentContext.idMap.set(element.id, element);
  }
}

/**
 * Fecha o elemento atual
 */
export function endElement(): void {
  const currentContext = getCurrentContext();
  
  if (currentContext.openLayoutElementStack.length === 0) {
    throw new Error('No open element to close.');
  }
  
  currentContext.openLayoutElementStack.pop();
} 