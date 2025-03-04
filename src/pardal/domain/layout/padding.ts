import type { Padding as PaddingType } from '../model/types';

// Utilitários de padding
export const Padding = {
  /**
   * Cria um padding uniforme em todos os lados
   */
  all(value: number): PaddingType {
    return {
      left: value,
      right: value,
      top: value,
      bottom: value
    };
  },

  /**
   * Cria um padding apenas no topo
   */
  top(value: number): PaddingType {
    return {
      left: 0,
      right: 0,
      top: value,
      bottom: 0
    };
  },

  /**
   * Cria um padding apenas na base
   */
  bottom(value: number): PaddingType {
    return {
      left: 0,
      right: 0,
      top: 0,
      bottom: value
    };
  },

  /**
   * Cria um padding apenas à esquerda
   */
  left(value: number): PaddingType {
    return {
      left: value,
      right: 0,
      top: 0,
      bottom: 0
    };
  },

  /**
   * Cria um padding apenas à direita
   */
  right(value: number): PaddingType {
    return {
      left: 0,
      right: value,
      top: 0,
      bottom: 0
    };
  },

  /**
   * Cria um padding vertical (topo e base)
   */
  vertical(value: number): PaddingType {
    return {
      left: 0,
      right: 0,
      top: value,
      bottom: value
    };
  },

  /**
   * Cria um padding horizontal (esquerda e direita)
   */
  horizontal(value: number): PaddingType {
    return {
      left: value,
      right: value,
      top: 0,
      bottom: 0
    };
  },

  /**
   * Cria um padding nos lados esquerdo e topo
   */
  leftTop(left: number, top: number): PaddingType {
    return {
      left,
      right: 0,
      top,
      bottom: 0
    };
  },

  /**
   * Cria um padding nos lados esquerdo e base
   */
  leftBottom(left: number, bottom: number): PaddingType {
    return {
      left,
      right: 0,
      top: 0,
      bottom
    };
  },

  /**
   * Cria um padding nos lados direito e topo
   */
  rightTop(right: number, top: number): PaddingType {
    return {
      left: 0,
      right,
      top,
      bottom: 0
    };
  },

  /**
   * Cria um padding nos lados direito e base
   */
  rightBottom(right: number, bottom: number): PaddingType {
    return {
      left: 0,
      right,
      top: 0,
      bottom
    };
  },

  /**
   * Cria um padding com valores verticais e horizontais diferentes
   */
  symmetric(horizontal: number, vertical: number): PaddingType {
    return {
      left: horizontal,
      right: horizontal,
      top: vertical,
      bottom: vertical
    };
  },
}; 