import { ElementType, Direction, TextElementConfig } from '../domain/model/types';
import { ElementDeclaration, ensureId } from '../domain/model/element';
import { createElement, endElement } from '../application/element-factory';

/**
 * Helpers de Estilo Macro para facilitar o uso da API
 */

// Helper para criar um elemento e fechá-lo imediatamente (sem filhos)
export function element(
  type: ElementType, 
  config: ElementDeclaration = {}
): void {
  console.log(`Criando elemento ${type}`);
  createElement(type, ensureId(config, 'element'));
  endElement();
}

// Helper para criar um retângulo e fechá-lo imediatamente
export function rect(config: ElementDeclaration = {}): void {
  console.log(`Criando retângulo ${config.id || 'sem id'}`);
  element('rectangle', ensureId(config, 'rect'));
}

// Helper para criar um círculo e fechá-lo imediatamente
export function circle(config: ElementDeclaration = {}): void {
  console.log(`Criando círculo ${config.id || 'sem id'}`);
  element('circle', ensureId(config, 'circle'));
}

// Helper para criar um elemento de texto e fechá-lo imediatamente
export function text(content: string, config: ElementDeclaration = {}): void {
  console.log(`Criando elemento de texto ${config.id || 'sem id'}`);
  
  // Forma única e simples:
  // text("Meu texto", { backgroundColor: "red", fontSize: 16, color: "blue" });
  
  const processedConfig: ElementDeclaration = { 
    ...config,
    text: content
  };
  
  element('text', ensureId(processedConfig, 'text'));
}

// Helper para criar um elemento com filho(s) usando uma função de callback
export function withChildren(
  type: ElementType,
  config: ElementDeclaration,
  children: () => void
): void {
  console.log(`Abrindo elemento ${type} com filhos`);
  createElement(type, ensureId(config, type));
  children();
  endElement();
  console.log(`Fechando elemento ${type} com filhos`);
}

// Helper para criar um retângulo com filho(s)
export function withRect(
  config: ElementDeclaration,
  children: () => void
): void {
  withChildren('rectangle', ensureId(config, 'rect'), children);
}

// Helper de grupo para organizar elementos
export function group(
  config: ElementDeclaration = { fillColor: 'transparent' },
  children: () => void
): void {
  withRect(ensureId(config, 'group'), children);
}

// Helper de linha (grupo horizontal)
export function row(
  config: ElementDeclaration = { fillColor: 'transparent' },
  children: () => void
): void {
  withRect(ensureId({
    ...config,
    direction: Direction.ROW
  }, 'row'), children);
}

// Helper de coluna (grupo vertical)
export function column(
  config: ElementDeclaration = { fillColor: 'transparent' },
  children: () => void
): void {
  withRect(ensureId({
    ...config,
    direction: Direction.COLUMN
  }, 'column'), children);
} 