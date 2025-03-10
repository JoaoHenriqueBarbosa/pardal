// Tipos básicos do domínio do Pardal

// Representação de um ponto 2D
export interface Vector2 {
  x: number;
  y: number;
}

// Dimensões de um elemento
export interface Dimensions {
  width: number;
  height: number;
}

// Retângulo delimitador com posição e dimensões
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Representação de cor RGBA
export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

// Preenchimento ao redor de um elemento
export interface Padding {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

// Raios dos cantos arredondados
export type CornerRadius = number;

// Tipos de dimensionamento
export enum SizingType {
  FIT = "FIT", // Ajusta ao conteúdo
  GROW = "GROW", // Expande para preencher espaço disponível
  PERCENT = "PERCENT", // Percentual do tamanho do pai
  FIXED = "FIXED", // Tamanho fixo em pixels
}

// Direção do layout
export enum Direction {
  ROW = "row", // Horizontal - equivalente ao LEFT_TO_RIGHT do Clay
  COLUMN = "column", // Vertical - equivalente ao TOP_TO_BOTTOM do Clay
}

// Alinhamento horizontal
export enum LayoutAlignmentX {
  LEFT = "LEFT",
  CENTER = "CENTER",
  RIGHT = "RIGHT",
}

// Alinhamento vertical
export enum LayoutAlignmentY {
  TOP = "TOP",
  CENTER = "CENTER",
  BOTTOM = "BOTTOM",
}

// Dimensionamento mínimo e máximo
export interface SizingMinMax {
  min: number; // Tamanho mínimo em pixels
  max: number; // Tamanho máximo em pixels
}

// Configuração de dimensionamento para um eixo
export interface SizingAxis {
  type: SizingType;
  size: {
    minMax?: SizingMinMax;
    percent?: number;
    fixed?: number;
  };
}

// Dimensionamento completo (largura e altura)
export interface Sizing {
  width: SizingAxis;
  height: SizingAxis;
}

// Alinhamento de filhos
export interface ChildAlignment {
  x: LayoutAlignmentX;
  y: LayoutAlignmentY;
}

// Configuração de layout
export interface LayoutConfig {
  sizing: Sizing;
  padding: Padding;
  childGap: number;
  childAlignment: ChildAlignment;
  layoutDirection: Direction;
}

// Tipos de elementos suportados
export type ElementType = "rectangle" | "circle" | "text" | "image";

// Modo de quebra de texto
export enum TextWrapMode {
  WORDS = "WORDS", // Quebra em espaços (padrão)
  NEWLINES = "NEWLINES", // Quebra apenas em quebras de linha
  NONE = "NONE", // Sem quebra
}

// Alinhamento de texto
export enum TextAlignment {
  LEFT = "LEFT", // Alinhado à esquerda (padrão)
  CENTER = "CENTER", // Centralizado
  RIGHT = "RIGHT", // Alinhado à direita
}

// Configuração de elemento de texto
export interface TextElementConfig {
  content: string; // Conteúdo do texto
  color?: string | Color; // Cor do texto
  fontId?: number; // ID da fonte (0 = padrão)
  fontSize?: number; // Tamanho da fonte em pixels
  letterSpacing?: number; // Espaçamento adicional entre letras
  lineHeight?: number; // Altura da linha em pixels (padrão: fontSize * 1.2)
  lineSpacingFactor?: number; // Fator de espaçamento entre linhas (padrão: valor do contexto)
  wrapMode?: TextWrapMode; // Modo de quebra de texto
  textAlignment?: TextAlignment; // Alinhamento horizontal do texto (LEFT, CENTER, RIGHT)
  fontFamily?: string; // Família de fonte a usar
  fontWeight?: string; // Peso da fonte (regular, bold, etc)
  fontStyle?: string; // Estilo da fonte (normal, italic)
  // Nota: O texto é processado palavra por palavra e renderizado linha por linha,
  // similar à implementação do Clay. Isso permite quebras de linha adequadas,
  // medição precisa de texto, e alinhamento correto de cada linha.
  // Suporte nativo a Markdown para **negrito** e *itálico*
}

// Opções de fonte para elementos de texto
export interface FontOptions {
  thin?: string;
  regular?: string;
  bold?: string;
  thinItalic?: string;
  regularItalic?: string;
  boldItalic?: string;
  emoji?: string;
}

// Valores padrão
export const DEFAULT_MIN_SIZE = 0;
export const DEFAULT_MAX_SIZE = 100000;
export const DEFAULT_CHILD_GAP = 0;
export const DEFAULT_ALPHA = 1.0;
export const DEFAULT_PADDING = 0;

// Fontes padrão para elementos de texto
export const DEFAULT_FONTS: FontOptions = {
  thin: "Helvetica-Light",
  regular: "Helvetica",
  bold: "Helvetica-Bold",
  thinItalic: "Helvetica-LightOblique",
  regularItalic: "Helvetica-Oblique",
  boldItalic: "Helvetica-BoldOblique",
};

/**
 * Configuração de elemento de imagem
 */
export interface ImageElementConfig {
  source: string; // Caminho da imagem ou Buffer
  fit?: ImageFitMode; // Modo de ajuste da imagem
  opacity?: number; // Opacidade da imagem (0.0 - 1.0)
  cornerRadius?: CornerRadius; // Raio dos cantos (para imagens com cantos arredondados)
  rounded?: boolean; // Se verdadeiro, a imagem será recortada em formato circular
}

/**
 * Modos de ajuste da imagem dentro do seu container
 */
export enum ImageFitMode {
  FILL = "FILL", // Preenche todo o espaço, podendo distorcer
  CONTAIN = "CONTAIN", // Mantém proporções, cabe inteira no espaço
  COVER = "COVER", // Mantém proporções, cobre todo o espaço (pode cortar)
}
