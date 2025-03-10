import { DEFAULT_MAX_SIZE, DEFAULT_MIN_SIZE, type SizingAxis, SizingType } from "../model/types";

// Ajudantes para criar configurações de dimensionamento
export const Sizing = {
  /**
   * Cria um dimensionamento fixo
   * @param size Tamanho em pixels
   */
  fixed(size: number): SizingAxis {
    return {
      type: SizingType.FIXED,
      size: {
        fixed: size,
        minMax: { min: size, max: size },
      },
    };
  },

  /**
   * Cria um dimensionamento que se ajusta ao conteúdo
   * @param min Tamanho mínimo em pixels
   * @param max Tamanho máximo em pixels
   */
  fit(min: number = DEFAULT_MIN_SIZE, max: number = DEFAULT_MAX_SIZE): SizingAxis {
    return {
      type: SizingType.FIT,
      size: {
        minMax: { min, max },
      },
    };
  },

  /**
   * Cria um dimensionamento que expande para preencher o espaço disponível
   * @param min Tamanho mínimo em pixels
   * @param max Tamanho máximo em pixels
   */
  grow(min: number = DEFAULT_MIN_SIZE, max: number = DEFAULT_MAX_SIZE): SizingAxis {
    return {
      type: SizingType.GROW,
      size: {
        minMax: { min, max },
      },
    };
  },

  /**
   * Cria um dimensionamento percentual do tamanho do pai
   * @param percent Percentual (0 a 1)
   * @param min Tamanho mínimo em pixels
   * @param max Tamanho máximo em pixels
   */
  percent(
    percent: number,
    min: number = DEFAULT_MIN_SIZE,
    max: number = DEFAULT_MAX_SIZE
  ): SizingAxis {
    return {
      type: SizingType.PERCENT,
      size: {
        percent,
        minMax: { min, max },
      },
    };
  },
};
