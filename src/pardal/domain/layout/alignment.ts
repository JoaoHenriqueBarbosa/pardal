import { ChildAlignment, LayoutAlignmentX, LayoutAlignmentY } from '../model/types';

// Utilitários de alinhamento
export const Alignment = {
  /**
   * Cria um alinhamento centralizado (CENTER, CENTER)
   */
  center(): ChildAlignment {
    return {
      x: LayoutAlignmentX.CENTER,
      y: LayoutAlignmentY.CENTER
    };
  },
  
  /**
   * Cria um alinhamento no topo centralizado (CENTER, TOP)
   */
  top(): ChildAlignment {
    return {
      x: LayoutAlignmentX.CENTER,
      y: LayoutAlignmentY.TOP
    };
  },
  
  /**
   * Cria um alinhamento no rodapé centralizado (CENTER, BOTTOM)
   */
  bottom(): ChildAlignment {
    return {
      x: LayoutAlignmentX.CENTER,
      y: LayoutAlignmentY.BOTTOM
    };
  },
  
  /**
   * Cria um alinhamento à esquerda centralizado (LEFT, CENTER)
   */
  left(): ChildAlignment {
    return {
      x: LayoutAlignmentX.LEFT,
      y: LayoutAlignmentY.CENTER
    };
  },
  
  /**
   * Cria um alinhamento à direita centralizado (RIGHT, CENTER)
   */
  right(): ChildAlignment {
    return {
      x: LayoutAlignmentX.RIGHT,
      y: LayoutAlignmentY.CENTER
    };
  },
  
  /**
   * Cria um alinhamento no canto superior esquerdo (LEFT, TOP)
   */
  topLeft(): ChildAlignment {
    return {
      x: LayoutAlignmentX.LEFT,
      y: LayoutAlignmentY.TOP
    };
  },
  
  /**
   * Cria um alinhamento no canto superior direito (RIGHT, TOP)
   */
  topRight(): ChildAlignment {
    return {
      x: LayoutAlignmentX.RIGHT,
      y: LayoutAlignmentY.TOP
    };
  },
  
  /**
   * Cria um alinhamento no canto inferior esquerdo (LEFT, BOTTOM)
   */
  bottomLeft(): ChildAlignment {
    return {
      x: LayoutAlignmentX.LEFT,
      y: LayoutAlignmentY.BOTTOM
    };
  },
  
  /**
   * Cria um alinhamento no canto inferior direito (RIGHT, BOTTOM)
   */
  bottomRight(): ChildAlignment {
    return {
      x: LayoutAlignmentX.RIGHT,
      y: LayoutAlignmentY.BOTTOM
    };
  },
  
  /**
   * Cria um alinhamento personalizado com os valores especificados
   */
  custom(x: LayoutAlignmentX, y: LayoutAlignmentY): ChildAlignment {
    return { x, y };
  }
}; 