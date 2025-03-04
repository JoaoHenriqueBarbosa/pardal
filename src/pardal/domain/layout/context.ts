import { Dimensions } from '../model/types';
import { FontOptions, DEFAULT_FONTS } from '../model/types';
import { LayoutElement } from '../model/element';
import { RenderCommand } from '../rendering/commands';

// Contexto do Pardal
export interface PardalContext {
  layoutDimensions: Dimensions;
  layoutElements: LayoutElement[];
  renderCommands: RenderCommand[];
  openLayoutElementStack: LayoutElement[];
  currentParentId: number;
  generation: number;
  idMap: Map<string, LayoutElement>;
  debugMode: boolean;
  fonts?: FontOptions;
}

// Contexto global
let currentContext: PardalContext | null = null;

// Obter o contexto atual
export function getCurrentContext(): PardalContext {
  if (!currentContext) {
    throw new Error('Context not initialized. Call initialize() first.');
  }
  return currentContext;
}

// Inicializar o contexto
export function initialize(
  dimensions: Dimensions, 
  debug: boolean = false,
  fonts?: FontOptions
): PardalContext {
  const context: PardalContext = {
    layoutDimensions: dimensions,
    layoutElements: [],
    renderCommands: [],
    openLayoutElementStack: [],
    currentParentId: 0,
    generation: 0,
    idMap: new Map(),
    debugMode: debug,
    fonts: fonts || DEFAULT_FONTS
  };
  
  currentContext = context;
  console.log(`Contexto inicializado com dimensões ${dimensions.width}x${dimensions.height}`);
  if (debug) {
    console.log("Modo de depuração ativado");
  }
  if (fonts) {
    console.log("Fontes personalizadas carregadas:", Object.keys(fonts).filter(k => fonts[k as keyof typeof fonts]).join(', '));
  } else {
    console.log("Usando fontes padrão");
  }
  return context;
}

// Começar o layout
export function beginLayout(): void {
  if (!currentContext) {
    throw new Error('Context not initialized. Call initialize() first.');
  }
  
  currentContext.layoutElements = [];
  currentContext.renderCommands = [];
  currentContext.openLayoutElementStack = [];
  currentContext.generation++;
  console.log("Layout iniciado");
}

// Finalizar o layout
export function endLayout(): RenderCommand[] {
  if (!currentContext) {
    throw new Error('Context not initialized. Call initialize() first.');
  }
  
  // Fechar quaisquer elementos abertos restantes
  while (currentContext.openLayoutElementStack.length > 0) {
    currentContext.openLayoutElementStack.pop();
  }
  
  return currentContext.renderCommands;
}

// Definir contexto atual (útil para testes)
export function setCurrentContext(context: PardalContext): void {
  currentContext = context;
} 