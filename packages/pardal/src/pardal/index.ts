import { createElement, endElement } from "./application/element-factory";
import { calculateFinalLayout } from "./domain/layout/engine";
import { ElementDeclaration, LayoutElement } from "./domain/model/element";
import {
  DEFAULT_FONTS,
  Dimensions,
  Direction,
  ElementType,
  FontOptions,
} from "./domain/model/types";
import { RenderCommand } from "./domain/rendering/commands";
import { renderToPDF } from "./infrastructure/pdf-renderer";
import { PDFKitFactory, DefaultPDFKitFactory } from "./domain/model/pdfkit";
// Importando Logger como tipo para evitar problemas
import type { Logger } from "./domain/utils/logger";
import { ConsoleLogger, LogLevel } from "./domain/utils/logger";

// Utility functions
function ensureIdAndPageId(
  context: PardalContext,
  config: ElementDeclaration,
  prefix: string
): ElementDeclaration {
  if (!config.id) {
    config.id = `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }
  if (!config.pageId) {
    config.pageId = context.currentPageId;
  }
  return config;
}

export interface Page {
  sizes: Dimensions;
  id: number;
}

// Contexto do Pardal
export interface PardalContext {
  layoutDimensions: Dimensions;
  layoutElements: LayoutElement[];
  renderCommands: RenderCommand[];
  processedElements: Set<string>;
  openLayoutElementStack: LayoutElement[];
  currentParentId: number;
  generation: number;
  idMap: Map<string, LayoutElement>;
  debugMode: boolean;
  fonts?: FontOptions;
  pdfKitFactory: PDFKitFactory;
  logger: Logger;
  pages: Page[];
  currentPageId: number;
}

export default class Pardal {
  private context: PardalContext;

  constructor() {
    this.context = {
      layoutDimensions: { width: 0, height: 0 },
      layoutElements: [],
      renderCommands: [],
      processedElements: new Set(),
      openLayoutElementStack: [],
      currentParentId: 0,
      generation: 0,
      idMap: new Map(),
      debugMode: false,
      fonts: DEFAULT_FONTS,
      pdfKitFactory: new DefaultPDFKitFactory(),
      logger: new ConsoleLogger(),
      pages: [],
      currentPageId: 0,
    };
  }

  static createDocument(
    options: {
      dimensions: Dimensions;
      debugMode?: boolean;
      fonts?: FontOptions;
      pdfKitFactory?: PDFKitFactory;
      logger?: Logger;
      logLevel?: LogLevel;
    },
    childrenFn: (pardal: Pardal) => void
  ): Promise<ArrayBuffer> {
    const pardal = new Pardal();
    pardal.context.layoutDimensions = options.dimensions;
    pardal.context.debugMode = options.debugMode || false;
    pardal.context.fonts = options.fonts || DEFAULT_FONTS;

    // Usar factory e logger injetados, se disponíveis
    if (options.pdfKitFactory) {
      pardal.context.pdfKitFactory = options.pdfKitFactory;
    }

    if (options.logger) {
      pardal.context.logger = options.logger;
    } else {
      // Define o nível de log baseado nas opções fornecidas
      const logLevel = options.logLevel || (options.debugMode ? LogLevel.DEBUG : LogLevel.INFO);
      pardal.context.logger = new ConsoleLogger(logLevel);
    }

    childrenFn(pardal);

    return pardal.render();
  }

  render(): Promise<ArrayBuffer> {
    calculateFinalLayout(this);
    return renderToPDF(this);
  }

  page(configOrChildren: {sizes: Dimensions} | ((pardal: Pardal) => void), children?: (pardal: Pardal) => void): void {
    const pageId = this.context.pages.length + 1;
    this.context.currentPageId = pageId;

    if ("sizes" in configOrChildren && children) {
      this.context.pages.push({ id: pageId, sizes: configOrChildren.sizes });
      children(this);
    } else if (typeof configOrChildren === "function") {
      this.context.pages.push({ id: pageId, sizes: this.context.layoutDimensions });
      configOrChildren(this);
    }
  }

  element(type: ElementType, config: ElementDeclaration = {}): void {
    if (this.context.debugMode) {
      this.context.logger.debug(`Criando elemento ${type}`);
    }
    createElement(this, type, ensureIdAndPageId(this.context, config, "element"));
    endElement(this);
  }

  // Helper para criar um retângulo e fechá-lo imediatamente
  rect(config: ElementDeclaration = {}): void {
    if (this.context.debugMode) {
      this.context.logger.debug(`Criando retângulo ${config.id || "sem id"}`);
    }
    this.element("rectangle", ensureIdAndPageId(this.context, config, "rect"));
  }

  // Helper para criar um círculo e fechá-lo imediatamente
  circle(config: ElementDeclaration = {}): void {
    if (this.context.debugMode) {
      this.context.logger.debug(`Criando círculo ${config.id || "sem id"}`);
    }
    this.element("circle", ensureIdAndPageId(this.context, config, "circle"));
  }

  // Helper para criar um elemento de texto e fechá-lo imediatamente
  text(content: string, config: ElementDeclaration = {}): void {
    if (this.context.debugMode) {
      this.context.logger.debug(
        `Criando elemento de texto ${config.id || "sem id"}`
      );
    }

    // Forma única e simples:
    // text("Meu texto", { backgroundColor: "red", fontSize: 16, color: "blue" });

    const processedConfig: ElementDeclaration = {
      ...config,
      text: content,
    };

    this.element("text", ensureIdAndPageId(this.context, processedConfig, "text"));
  }

  // Helper para criar um elemento com filho(s) usando uma função de callback
  withChildren(
    type: ElementType,
    config: ElementDeclaration,
    children: () => void
  ): void {
    if (this.context.debugMode) {
      this.context.logger.debug(`Abrindo elemento ${type} com filhos`);
    }
    createElement(this, type, ensureIdAndPageId(this.context, config, type));
    children();
    endElement(this);
    if (this.context.debugMode) {
      this.context.logger.debug(`Fechando elemento ${type} com filhos`);
    }
  }

  // Helper para criar um retângulo com filho(s)
  withRect(config: ElementDeclaration, children: () => void): void {
    this.withChildren("rectangle", ensureIdAndPageId(this.context, config, "rect"), children);
  }

  // Helper de grupo para organizar elementos
  group(
    config: ElementDeclaration = { fillColor: "transparent" },
    children: () => void
  ): void {
    this.withRect(ensureIdAndPageId(this.context, config, "group"), children);
  }

  // Helper de linha (grupo horizontal)
  row(
    config: ElementDeclaration = { fillColor: "transparent" },
    children: () => void
  ): void {
    this.withRect(
      ensureIdAndPageId(this.context,
        {
          ...config,
          direction: Direction.ROW,
        },
        "row"
      ),
      children
    );
  }

  // Helper de coluna (grupo vertical)
  column(
    config: ElementDeclaration = { fillColor: "transparent" },
    children: () => void
  ): void {
    this.withRect(
      ensureIdAndPageId(this.context,
        {
          ...config,
          direction: Direction.COLUMN,
        },
        "column"
      ),
      children
    );
  }

  // Helper para criar um elemento de imagem com filho(s)
  withImage(
    source: string,
    config: ElementDeclaration,
    children: () => void
  ): void {
    const processedConfig: ElementDeclaration = {
      ...config,
      source: source,
    };

    this.withChildren("image", ensureIdAndPageId(this.context, processedConfig, "image"), children);
  }

  // Helper para criar um elemento de imagem e fechá-lo imediatamente ou com filhos
  image(
    source: string,
    config: ElementDeclaration = {},
    children?: () => void
  ): void {
    if (this.context.debugMode) {
      this.context.logger.debug(
        `Criando elemento de imagem ${config.id || "sem id"}`
      );
    }

    const processedConfig: ElementDeclaration = {
      ...config,
      source: source,
    };

    if (children) {
      this.withChildren("image", ensureIdAndPageId(this.context, processedConfig, "image"), children);
    } else {
      this.element("image", ensureIdAndPageId(this.context, processedConfig, "image"));
    }
  }

  // Add context getters
  getContext(): PardalContext {
    return this.context;
  }

  getLayoutElements(): LayoutElement[] {
    return this.context.layoutElements;
  }

  getLayoutDimensions(): Dimensions {
    return this.context.layoutDimensions;
  }

  getRenderCommands(): RenderCommand[] {
    return this.context.renderCommands;
  }

  getProcessedElements(): Set<string> {
    return this.context.processedElements;
  }

  getOpenLayoutElementStack(): LayoutElement[] {
    return this.context.openLayoutElementStack;
  }

  getCurrentParentId(): number {
    return this.context.currentParentId;
  }

  getGeneration(): number {
    return this.context.generation;
  }

  getIdMap(): Map<string, LayoutElement> {
    return this.context.idMap;
  }

  getDebugMode(): boolean {
    return this.context.debugMode;
  }

  getFonts(): FontOptions | undefined {
    return this.context.fonts;
  }

  // Setters

  setLayoutDimensions(dimensions: Dimensions): void {
    this.context.layoutDimensions = dimensions;
  }

  addOpenLayoutElementStack(element: LayoutElement): void {
    this.context.openLayoutElementStack.push(element);
  }

  popOpenLayoutElementStack(): void {
    this.context.openLayoutElementStack.pop();
  }

  addIdMap(id: string, element: LayoutElement): void {
    this.context.idMap.set(id, element);
  }

  addLayoutElement(element: LayoutElement): void {
    this.context.layoutElements.push(element);
  }

  addRenderCommand(command: RenderCommand): void {
    this.context.renderCommands.push(command);
  }

  setDebugMode(debugMode: boolean): void {
    this.context.debugMode = debugMode;
  }

  setFonts(fonts: FontOptions): void {
    this.context.fonts = fonts;
  }

  clearRenderCommands(): void {
    this.context.renderCommands = [];
  }

  clearProcessedElements(): void {
    this.context.processedElements.clear();
  }
}
