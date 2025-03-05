import { Dimensions } from '../domain/model/types';
import { FontOptions } from '../domain/model/types';
import { beginLayout, getCurrentContext, initialize } from '../domain/layout/context';
import { calculateFinalLayout } from '../domain/layout/engine';
import { RenderCommand } from '../domain/rendering/commands';

/**
 * Classe de serviço para operações de layout
 */
export class LayoutService {
  /**
   * Inicializa o sistema de layout
   */
  static initialize(
    dimensions: Dimensions, 
    debug: boolean = false, 
    fonts?: FontOptions
  ): void {
    initialize(dimensions, debug, fonts);
  }
  
  /**
   * Inicia uma nova operação de layout
   */
  static beginLayout(): void {
    beginLayout();
  }
  
  /**
   * Finaliza o layout e retorna os comandos de renderização
   */
  static endLayout(): RenderCommand[] {
    const currentContext = getCurrentContext();
    
    // Fechar quaisquer elementos abertos restantes
    while (currentContext.openLayoutElementStack.length > 0) {
      currentContext.openLayoutElementStack.pop();
    }
    
    // Executar o algoritmo multi-pass para calcular o layout
    calculateFinalLayout();
    
    return currentContext.renderCommands;
  }
} 