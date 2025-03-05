/**
 * Pardal - Sistema minimalista de renderização para PDFKit baseado na lógica do Clay
 * Suporte para retângulos e círculos com posicionamento absoluto
 */

// Re-exportar tipos do domínio
export * from "./domain/model/types";
export * from "./domain/model/element";
export * from "./domain/rendering/commands";

// Exportar utilitários de layout
export { Alignment } from "./domain/layout/alignment";
export { Sizing } from "./domain/layout/sizing";

// Exportar serviços de aplicação
export { LayoutService } from "./application/layout-service";
export { createElement, endElement } from "./application/element-factory";

// Exportar helpers de elementos da interface
export {
  element,
  rect,
  circle,
  text,
  withChildren,
  withRect,
  group,
  row,
  column,
} from "./interface/element-helpers";

// Exportar funções principais como funções diretas para compatibilidade
import { LayoutService } from "./application/layout-service";
import { Dimensions, FontOptions, DEFAULT_FONTS } from "./domain/model/types";
import { createPDFDocument as createPDF } from "./infrastructure/pdf-renderer";
import { RenderCommand } from "./domain/rendering/commands";

// Exportar serviços de infraestrutura
export { renderToPDF } from "./infrastructure/pdf-renderer";

/**
 * Inicializar o contexto
 */
export function initialize(
  dimensions: Dimensions,
  debug: boolean = false,
  font?: FontOptions
): void {
  LayoutService.initialize(dimensions, debug, font);
}

/**
 * Começar o layout
 */
export function beginLayout(): void {
  LayoutService.beginLayout();
}

/**
 * Finalizar o layout e obter comandos de renderização
 */
export function endLayout(): RenderCommand[] {
  return LayoutService.endLayout();
}

/**
 * Criar um documento PDF
 */
export function createPDFDocument(options?: {
  margin?: { top: number, left: number, bottom: number, right: number };
  size?: [number, number];
  debug?: boolean;
  font?: FontOptions;
}): any {
  const doc = createPDF(options);
  initialize(
    { width: options?.size?.[0] ?? 595.28, height: options?.size?.[1] ?? 841.89 },
    !!options?.debug,
    options?.font || DEFAULT_FONTS
  );

  return doc;
}
