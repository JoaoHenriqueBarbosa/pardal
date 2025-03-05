import { ChildAlignment, Color, CornerRadius, Direction, ElementType, LayoutConfig, Padding, SizingAxis, TextElementConfig, TextAlignment, TextWrapMode } from './types';

// Interfaces para processamento de texto
export interface MeasuredWord {
  text: string;
  startOffset: number;  // Posição inicial no texto original
  length: number;       // Comprimento da palavra
  width: number;        // Largura calculada
  height: number;       // Altura calculada
  next?: number;        // Índice da próxima palavra
  bold?: boolean;       // Indica se a palavra é negrito
  italic?: boolean;     // Indica se a palavra é itálico
}

export interface WrappedTextLine {
  dimensions: { width: number, height: number };
  content: MeasuredWord[];
  startOffset: number;
  length: number;
}

// Declaração de configuração de um elemento
export interface ElementDeclaration {
  id?: string;
  layout?: Partial<LayoutConfig>;
  backgroundColor?: string | Color;
  cornerRadius?: CornerRadius;
  padding?: number | Padding;
  childGap?: number;
  width?: SizingAxis;
  height?: SizingAxis;
  fillColor?: string | Color;
  elementType?: ElementType;
  direction?: Direction;
  childAlignment?: ChildAlignment;
  
  // Propriedades de texto
  text?: TextElementConfig | string; // Conteúdo do texto ou configuração completa (para compatibilidade)
  
  // Propriedades individuais de formatação de texto
  // Estas podem ser usadas diretamente no objeto principal de configuração
  fontSize?: number;
  color?: string | Color;
  fontId?: number;
  letterSpacing?: number;
  lineHeight?: number;
  textAlignment?: TextAlignment;
  wrapMode?: TextWrapMode;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
}

// Elemento de layout (entidade de domínio)
import { Dimensions } from './types';

export interface LayoutElement {
  id: string;
  children: LayoutElement[];
  dimensions: Dimensions;
  minDimensions: Dimensions;
  layoutConfig: LayoutConfig;
  backgroundColor: Color;
  cornerRadius?: CornerRadius;
  elementType: ElementType;
  textConfig?: TextElementConfig; // Configuração de texto para elementos do tipo text
  // Campos para processamento de texto avançado
  measuredWords?: MeasuredWord[]; // Palavras medidas para elementos de texto
  wrappedTextLines?: WrappedTextLine[]; // Linhas de texto após quebra
}

// Contadores para geração automática de IDs
export const idCounters: Record<string, number> = {
  rect: 0,
  circle: 0,
  group: 0,
  row: 0,
  column: 0,
  element: 0,
  rectangle: 0
};

// Função para gerar um ID automático
export function generateId(type: string): string {
  idCounters[type] = (idCounters[type] || 0) + 1;
  return `auto-${type}-${idCounters[type]}`;
}

// Garantir que o config tenha um ID, gerando automaticamente se não tiver
export function ensureId(config: ElementDeclaration, type: string): ElementDeclaration {
  if (!config.id) {
    return {
      ...config,
      id: generateId(type)
    };
  }
  return config;
} 