// Importações
import {
  Direction,
  SizingType,
  Vector2,
  DEFAULT_MAX_SIZE,
  DEFAULT_MIN_SIZE,
  LayoutAlignmentX,
  LayoutAlignmentY,
  TextAlignment,
  FontOptions,
  BoundingBox,
} from "../model/types";
import { LayoutElement, MeasuredWord, WrappedTextLine } from "../model/element";
import {
  createCircleCommand,
  createRectangleCommand,
  createTextCommandFromConfig,
  createImageCommandFromConfig,
} from "../rendering/commands";
import { parseColor } from "../utils/color";
import { parseText } from "../utils/text";
import Pardal, { PardalContext } from "../..";
import { isEmoji } from "../utils/emoji";

/**
 * Medir dimensões de texto usando PDFKit
 * Simplificada no estilo do Clay
 */
function measureTextDimensions(
  context: PardalContext,
  textContent: string,
  fontSize: number = 16
): { width: number; height: number } {
  if (!textContent || textContent.length === 0) {
    return { width: 0, height: 0 };
  }

  try {
    // Usar factory do contexto em vez de criar instância diretamente
    const tempDoc = context.pdfKitFactory.createDocument({
      autoFirstPage: false,
    });

    const fontFamily = context.fonts?.regular || "Helvetica";

    tempDoc.font(fontFamily).fontSize(fontSize);

    const width = tempDoc.widthOfString(textContent);

    // Liberar recursos
    tempDoc.end();

    return { width, height: fontSize };
  } catch (error) {
    context.logger.error("Erro ao medir texto:", error);
    return {
      width: textContent.length * (fontSize / 2),
      height: fontSize,
    };
  }
}

/**
 * Determina a fonte a ser usada com base nas propriedades de estilo
 */
export function getFontForWord(
  word: Partial<MeasuredWord>,
  fonts: FontOptions | undefined
): string {
  if (!word.text) {
    return fonts?.regular || "Helvetica";
  }
  if (isEmoji(word.text) && fonts?.emoji) {
    return fonts?.emoji || "NotoEmoji-Regular";
  }
  if (word.bold && word.italic) {
    return (
      fonts?.boldItalic || fonts?.bold || fonts?.regular || "Helvetica-Bold"
    );
  } else if (word.bold) {
    return fonts?.bold || fonts?.regular || "Helvetica-Bold";
  } else if (word.italic) {
    return fonts?.regularItalic || fonts?.regular || "Helvetica-Oblique";
  } else {
    return fonts?.regular || "Helvetica";
  }
}

/**
 * Medir palavras individuais em um texto
 * Reimplementado para seguir mais de perto a abordagem do Clay
 */
export function measureWords(
  context: PardalContext,
  text: string,
  fontSize: number = 16
): MeasuredWord[] {
  if (!text || text.length === 0) {
    return [];
  }

  try {
    // Usar factory do contexto em vez de criar instância diretamente
    const pdfDoc = context.pdfKitFactory.createDocument();

    pdfDoc.fontSize(fontSize);

    const words: MeasuredWord[] = [];

    const wordsToProcess = parseText(text);

    for (let i = 0; i < wordsToProcess.length; i++) {
      const word = wordsToProcess[i];
      const fontName = getFontForWord(word, context.fonts);
      pdfDoc.font(fontName);

      // Safe width calculation with fallback
      let width = 0;
      try {
        width = pdfDoc.widthOfString(word.text || "");
      } catch (error) {
        context.logger.warn(`Error measuring width for "${word.text}":`, error);
        width = (word.text?.length || 0) * (fontSize / 2); // Fallback estimation
      }

      words.push({
        startOffset: i,
        length: word.text?.length || 0,
        width: width,
        height: fontSize,
        next: i + 1,
        bold: word.bold || false,
        italic: word.italic || false,
        text: word.text || "",
      });
    }

    pdfDoc.end();

    return words;
  } catch (error) {
    context.logger.error("Erro ao medir palavras:", error);
    return [];
  }
}

/**
 * Quebrar texto em linhas com base nas palavras medidas
 * Seguindo a implementação do Clay
 */
export function wrapTextIntoLines(
  context: PardalContext,
  text: string,
  words: MeasuredWord[],
  containerWidth: number,
  fontSize: number = 16
): WrappedTextLine[] {
  if (!text || text.length === 0 || !words || words.length === 0) {
    return [];
  }

  try {
    // Usar factory do contexto em vez de criar instância diretamente
    const pdfDoc = context.pdfKitFactory.createDocument({
      autoFirstPage: false,
    });
    const fontFamily = context.fonts?.regular || "Helvetica";
    pdfDoc.font(fontFamily).fontSize(fontSize);

    const lines: WrappedTextLine[] = [];
    let currentLine: WrappedTextLine | null = null;
    let currentLineWidth = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      // Verificar se a palavra contém um caractere de quebra de linha
      if (word.text.includes("\n")) {
        if (context.debugMode) {
          context.logger.debug("Palavra com quebra de linha:", word.text);
        }
        // Dividir a palavra em duas partes: antes e depois do '\n'
        const parts = word.text.split("\n");

        // Primeiro, lidar com a parte antes do '\n'
        if (parts[0] && parts[0].trim() !== "") {
          // Aplicar trim na primeira parte
          const trimmedFirstPart = parts[0].trim();

          // Initialize currentLine if it's null
          if (currentLine === null) {
            currentLine = {
              content: [],
              dimensions: { width: 0, height: 0 },
              startOffset: word.startOffset,
              length: 0,
            };
          }

          // Criar uma nova palavra para a primeira parte
          const firstPart: MeasuredWord = {
            ...word,
            text: trimmedFirstPart,
            length: trimmedFirstPart.length,
            width: pdfDoc.widthOfString(trimmedFirstPart),
          };

          // Adicionar a primeira parte à linha atual
          currentLine.content.push(firstPart);
          currentLineWidth += firstPart.width;
          currentLine.length += firstPart.length;
          currentLine.dimensions.width += firstPart.width;
          currentLine.dimensions.height = Math.max(
            currentLine.dimensions.height,
            firstPart.height
          );
        }

        // Adicionar a linha atual ao array de linhas
        if (currentLine !== null && currentLine.content.length > 0) {
          lines.push(currentLine);
        }

        // Iniciar uma nova linha para a parte após o '\n'
        if (parts[1] && parts[1].trim() !== "") {
          // Aplicar trim na segunda parte
          const trimmedSecondPart = parts[1].trim();

          // Criar uma nova palavra para a segunda parte
          const secondPart: MeasuredWord = {
            ...word,
            text: trimmedSecondPart,
            length: trimmedSecondPart.length,
            width: pdfDoc.widthOfString(trimmedSecondPart),
            startOffset: word.startOffset + parts[0].length + 1, // +1 for the '\n'
          };

          // Iniciar uma nova linha com a segunda parte
          currentLine = {
            content: [secondPart],
            dimensions: { width: secondPart.width, height: secondPart.height },
            startOffset: secondPart.startOffset,
            length: secondPart.length,
          };
          currentLineWidth = secondPart.width;
        } else {
          // Se não houver texto após o '\n', iniciar uma linha vazia
          currentLine = null;
          currentLineWidth = 0;
        }
      } else {
        // Comportamento original para palavras sem '\n'

        // Initialize currentLine if it's null
        if (currentLine === null) {
          currentLine = {
            content: [],
            dimensions: { width: 0, height: 0 },
            startOffset: word.startOffset,
            length: 0,
          };
        }

        // Se a palavra cabe na linha atual, adiciona a palavra à linha
        if (currentLineWidth + word.width <= containerWidth) {
          currentLine.content.push(word);
          currentLineWidth += word.width;
          // Update the length of the line
          currentLine.length += word.length;
          currentLine.dimensions.width += word.width;
          currentLine.dimensions.height = Math.max(
            currentLine.dimensions.height,
            word.height
          );
        } else {
          // Adiciona a linha atual ao array de linhas
          lines.push(currentLine);

          // Inicia uma nova linha com a palavra atual
          currentLine = {
            content: [word],
            dimensions: { width: word.width, height: word.height },
            startOffset: word.startOffset,
            length: word.length,
          };
          currentLineWidth = word.width;
        }
      }
    }

    // Não esquecer de adicionar a última linha, se existir
    if (currentLine !== null && currentLine.content.length > 0) {
      lines.push(currentLine);
    }

    pdfDoc.end();
    return lines;
  } catch (error) {
    context.logger.error("Erro ao quebrar texto:", error);
    return [];
  }
}

/**
 * Calcular o layout final
 * Implementação baseada na estrutura do Clay
 */
export function calculateFinalLayout(pardal: Pardal): void {
  const currentContext = pardal.getContext();

  if (currentContext.debugMode) {
    currentContext.logger.debug("Iniciando cálculo de layout final");
  }

  pardal.clearRenderCommands();

  // Limpar o conjunto de elementos processados
  pardal.clearProcessedElements();

  // Inicializar dimensões do elemento raiz
  initializeRootElements(currentContext);

  // Fase 1: Calcular dimensões mínimas (bottom-up)
  calculateMinimumDimensions(currentContext);

  // Fase 2: Primeiro distribuir o espaço ao longo do eixo X
  sizeContainersAlongAxis(currentContext, true);

  // Fase intermediária: Processar quebra de texto exatamente como o Clay faz
  processTextWrapping(currentContext);

  // Fase 2.5: Recalcular dimensões mínimas após processar texto
  calculateMinimumDimensions(currentContext);

  // Fase 3: Depois distribuir o espaço ao longo do eixo Y
  sizeContainersAlongAxis(currentContext, false);

  // Fase 4: Calcular as posições finais e gerar comandos de renderização
  generateRenderCommands(pardal);
}

/**
 * Processar quebra de texto após calcular dimensões X
 * Esta fase é crucial e imita exatamente o que o Clay faz: quebrar o texto em linhas
 * depois que as larguras dos containers estão definidas, mas antes de calcular as alturas.
 */
function processTextWrapping(context: PardalContext): void {
  // Processar todos os elementos de texto
  for (const element of context.layoutElements) {
    if (element.elementType === "text" && element.textConfig) {
      const fontSize = element.textConfig.fontSize || 16;
      
      // Calcular o fator de espaçamento entre linhas
      const lineSpacingFactor = element.textConfig.lineSpacingFactor !== undefined 
        ? element.textConfig.lineSpacingFactor 
        : context.lineSpacingFactor;
      
      // Calcular a altura da linha com o espaçamento
      const lineHeight = element.textConfig.lineHeight || (fontSize * lineSpacingFactor);

      // Medir as palavras se ainda não foram medidas
      if (!element.measuredWords) {
        element.measuredWords = measureWords(
          context,
          element.textConfig.content,
          fontSize
        );
      }

      // Obter a largura disponível para o texto, considerando o padding do elemento
      const availableWidth =
        element.dimensions.width -
        (element.layoutConfig.padding.left +
          element.layoutConfig.padding.right);

      // Quebrar o texto em linhas com base na largura disponível (container)
      const wrappedLines = wrapTextIntoLines(
        context,
        element.textConfig.content,
        element.measuredWords,
        availableWidth,
        fontSize
      );

      // Armazenar as linhas quebradas no elemento
      element.wrappedTextLines = wrappedLines;

      // Recalcular a altura com base nas linhas quebradas, incluindo o espaçamento
      let totalHeight = 0;
      
      if (element.wrappedTextLines.length > 0) {
        // Para cada linha, adicionar sua altura
        for (let i = 0; i < element.wrappedTextLines.length; i++) {
          const line = element.wrappedTextLines[i];
          
          // Adicionar a altura da linha
          totalHeight += line.dimensions.height;
          
          // Se não for a última linha, adicionar o espaçamento adicional
          if (i < element.wrappedTextLines.length - 1) {
            // Adicionar o espaço extra entre as linhas
            totalHeight += lineHeight - line.dimensions.height;
          }
        }
      }

      // Adicionar padding vertical ao total da altura
      totalHeight +=
        element.layoutConfig.padding.top + element.layoutConfig.padding.bottom;

      // Ajustar a altura do elemento com base no texto quebrado
      element.dimensions.height = totalHeight;

      // Importante: Atualizar também a altura mínima para assegurar que o layout considere a altura correta
      if (!element.minDimensions) {
        element.minDimensions = { width: 0, height: 0 };
      }
      element.minDimensions.height = Math.max(
        element.minDimensions.height,
        totalHeight
      );

      // Propagar a altura para o elemento pai se ele tiver sizing FIT
      const parentElement = findParentElement(context, element);
      if (
        parentElement &&
        parentElement.layoutConfig.sizing.height.type === SizingType.FIT
      ) {
        // Recalcular altura do pai considerando todos os filhos
        let parentTotalHeight = 0;
        for (const child of parentElement.children) {
          parentTotalHeight += child.dimensions.height;
          if (
            child !== parentElement.children[parentElement.children.length - 1]
          ) {
            parentTotalHeight += parentElement.layoutConfig.childGap;
          }
        }

        // Adicionar padding do pai
        parentTotalHeight +=
          parentElement.layoutConfig.padding.top +
          parentElement.layoutConfig.padding.bottom;

        // Atualizar dimensões do pai
        parentElement.dimensions.height = parentTotalHeight;
        if (!parentElement.minDimensions) {
          parentElement.minDimensions = { width: 0, height: 0 };
        }
        parentElement.minDimensions.height = Math.max(
          parentElement.minDimensions.height,
          parentTotalHeight
        );
      }

      if (context.debugMode) {
        context.logger.debug(
          `Ajustando altura do elemento de texto ${element.id} para ${totalHeight}px com base em ${wrappedLines.length} linhas de texto`
        );
      }
    }
  }
}

/**
 * Encontrar o elemento pai de um elemento
 */
function findParentElement(
  context: PardalContext,
  element: LayoutElement
): LayoutElement | null {
  for (const potentialParent of context.layoutElements) {
    if (potentialParent.children.includes(element)) {
      return potentialParent;
    }
  }

  return null;
}

/**
 * Inicializar dimensões dos elementos raiz
 */
function initializeRootElements(context: PardalContext): void {
  // Definir dimensões iniciais dos elementos raiz para ocupar todo o espaço
  for (const element of context.layoutElements) {
    if (!context.openLayoutElementStack.includes(element)) {
      if (context.debugMode) {
        context.logger.debug(
          "Definindo dimensões do elemento raiz:",
          element.id
        );
      }

      // Elemento raiz - inicializar com dimensões padrão
      if (element.dimensions.width === 0) {
        element.dimensions.width =
          element.layoutConfig.sizing.width.type === SizingType.GROW
            ? context.layoutDimensions.width
            : 100;
      }

      if (element.dimensions.height === 0) {
        element.dimensions.height =
          element.layoutConfig.sizing.height.type === SizingType.GROW
            ? context.layoutDimensions.height
            : 100;
      }

      if (context.debugMode) {
        context.logger.debug(
          `Dimensões após inicialização: ${element.dimensions.width}x${element.dimensions.height}`
        );
      }
    }
  }
}

/**
 * Calcular dimensões mínimas de forma recursiva (DFS)
 * Esta função calcula os tamanhos mínimos de todos os elementos na árvore de layout
 * de forma bottom-up (primeiro os filhos, depois os pais)
 */
function calculateMinimumDimensions(context: PardalContext): void {
  // Encontrar os elementos raiz
  const rootElements: LayoutElement[] = [];
  for (const element of context.layoutElements) {
    if (!context.openLayoutElementStack.includes(element)) {
      rootElements.push(element);
    }
  }

  // Processar cada árvore de layout a partir da raiz
  for (const rootElement of rootElements) {
    calculateElementMinimumDimensions(context, rootElement);
  }
}

/**
 * Função recursiva para calcular dimensões mínimas de um elemento e seus filhos
 * Implementa um algoritmo DFS para garantir que os filhos sejam processados antes dos pais
 */
function calculateElementMinimumDimensions(
  context: PardalContext,
  element: LayoutElement
): void {
  // Primeiro processar todos os filhos
  for (const child of element.children) {
    calculateElementMinimumDimensions(context, child);
  }

  // Em seguida, calcular as dimensões mínimas deste elemento com base em seus filhos
  calculateElementFitSize(context, element);
}

/**
 * Calcular o tamanho "fit" de um elemento com base em seus filhos
 * Isto é usado para elementos que precisam se ajustar ao seu conteúdo
 */
function calculateElementFitSize(
  context: PardalContext,
  element: LayoutElement
): void {
  const layoutConfig = element.layoutConfig;
  const isRowLayout = layoutConfig.layoutDirection === Direction.ROW;

  // Caso especial: elemento de texto
  if (element.elementType === "text" && element.textConfig) {
    // Obter texto e configurações
    const textContent = element.textConfig.content || "";
    const fontSize = element.textConfig.fontSize || 16;
    
    // Calcular o fator de espaçamento entre linhas
    const lineSpacingFactor = element.textConfig.lineSpacingFactor !== undefined 
      ? element.textConfig.lineSpacingFactor 
      : context.lineSpacingFactor;
    
    // Calcular lineHeight
    const lineHeight = element.textConfig.lineHeight || (fontSize * lineSpacingFactor);

    // Medir palavras
    const words = measureWords(context, textContent, fontSize);

    // Armazenar palavras medidas no elemento (para uso na renderização)
    element.measuredWords = words;

    // Se temos uma largura definida, fazemos wrap do texto
    if (element.dimensions.width > 0) {
      const wrappedLines = wrapTextIntoLines(
        context,
        textContent,
        words,
        element.dimensions.width -
          (layoutConfig.padding.left + layoutConfig.padding.right),
        fontSize
      );

      // Armazenar linhas quebradas no elemento (para uso na renderização)
      element.wrappedTextLines = wrappedLines;

      // Calcular altura total do texto quebrado, incluindo o espaçamento entre linhas
      let totalHeight = 0;
      
      // Para cada linha, adicionar sua altura
      for (let i = 0; i < wrappedLines.length; i++) {
        const line = wrappedLines[i];
        
        // Adicionar a altura da linha
        totalHeight += line.dimensions.height;
        
        // Se não for a última linha, adicionar o espaçamento adicional
        if (i < wrappedLines.length - 1) {
          // Adicionar o espaço extra entre as linhas
          totalHeight += lineHeight - line.dimensions.height;
        }
      }

      // Definir dimensões com base nas linhas quebradas
      element.minDimensions = {
        width: element.dimensions.width,
        height:
          totalHeight +
          (layoutConfig.padding.top + layoutConfig.padding.bottom),
      };

      // Atualizar as dimensões do elemento
      element.dimensions.height = element.minDimensions.height;
    } else {
      // Sem largura definida, usamos a largura natural do texto
      // Medir o texto completo para obter a largura máxima
      const { width, height } = measureTextDimensions(
        context,
        textContent,
        fontSize
      );

      // Criar linha única como fallback
      if (!element.wrappedTextLines) {
        element.wrappedTextLines = [
          {
            dimensions: { width, height },
            content: words,
            startOffset: 0,
            length: textContent.length,
          },
        ];
      }

      element.minDimensions = {
        width: width + (layoutConfig.padding.left + layoutConfig.padding.right),
        height:
          height + (layoutConfig.padding.top + layoutConfig.padding.bottom),
      };

      // Atualizar dimensões do elemento
      element.dimensions = {
        width: element.minDimensions.width,
        height: element.minDimensions.height,
      };
    }

    if (context.debugMode) {
      context.logger.debug(
        `Elemento de texto ${element.id}: dimensões calculadas: ${element.dimensions.width}x${element.dimensions.height}`
      );
    }

    // Aplicar restrições de min/max para FIT
    applyFitSizingConstraints(element);
    return;
  }

  // Caso base: elemento sem filhos (que não é texto)
  if (element.children.length === 0) {
    element.minDimensions = {
      width:
        layoutConfig.sizing.width.type === SizingType.FIT
          ? layoutConfig.sizing.width.size.minMax?.min || DEFAULT_MIN_SIZE
          : 0,
      height:
        layoutConfig.sizing.height.type === SizingType.FIT
          ? layoutConfig.sizing.height.size.minMax?.min || DEFAULT_MIN_SIZE
          : 0,
    };
    return;
  }

  // Calcular tamanho mínimo com base nos filhos
  let totalWidth = 0;
  let totalHeight = 0;
  let maxWidth = 0;
  let maxHeight = 0;

  // Considerar padding do elemento atual
  const padding = layoutConfig.padding;
  const totalHorizontalPadding = padding.left + padding.right;
  const totalVerticalPadding = padding.top + padding.bottom;

  // Verificar se é necessário recalcular as dimensões dos filhos
  const needsChildDimensionsRecalculation = element.children.some(
    (child) =>
      !child.minDimensions ||
      (child.minDimensions.width === 0 && child.minDimensions.height === 0)
  );

  if (needsChildDimensionsRecalculation) {
    if (context.debugMode) {
      context.logger.debug(
        `Recalculando dimensões dos filhos para o elemento ${element.id}`
      );
    }
    for (const child of element.children) {
      if (!child.minDimensions) {
        calculateElementFitSize(context, child);
      }
    }
  }

  // Calcular tamanho com base na direção do layout
  if (isRowLayout) {
    // Layout em linha: somar larguras e pegar altura máxima
    for (let i = 0; i < element.children.length; i++) {
      const child = element.children[i];

      // Certifique-se de que as dimensões mínimas já foram calculadas
      if (!child.minDimensions) {
        calculateElementFitSize(context, child);
      }

      // Usar dimensões reais para filhos com tamanho fixo/definido
      const childWidth =
        child.layoutConfig.sizing.width.type === SizingType.FIXED
          ? child.layoutConfig.sizing.width.size.fixed ||
            child.minDimensions.width
          : child.minDimensions.width;

      const childHeight =
        child.layoutConfig.sizing.height.type === SizingType.FIXED
          ? child.layoutConfig.sizing.height.size.fixed ||
            child.minDimensions.height
          : child.minDimensions.height;

      totalWidth += childWidth;
      maxHeight = Math.max(maxHeight, childHeight);

      // Adicionar gap entre elementos
      if (i < element.children.length - 1) {
        totalWidth += layoutConfig.childGap;
      }
    }
  } else {
    // Layout em coluna: somar alturas e pegar largura máxima
    for (let i = 0; i < element.children.length; i++) {
      const child = element.children[i];

      // Certifique-se de que as dimensões mínimas já foram calculadas
      if (!child.minDimensions) {
        calculateElementFitSize(context, child);
      }

      // Usar dimensões reais para filhos com tamanho fixo/definido
      const childWidth =
        child.layoutConfig.sizing.width.type === SizingType.FIXED
          ? child.layoutConfig.sizing.width.size.fixed ||
            child.minDimensions.width
          : child.minDimensions.width;

      const childHeight =
        child.layoutConfig.sizing.height.type === SizingType.FIXED
          ? child.layoutConfig.sizing.height.size.fixed ||
            child.minDimensions.height
          : child.minDimensions.height;

      totalHeight += childHeight;
      maxWidth = Math.max(maxWidth, childWidth);

      // Adicionar gap entre elementos
      if (i < element.children.length - 1) {
        totalHeight += layoutConfig.childGap;
      }
    }
  }

  // Definir dimensões mínimas incluindo padding
  element.minDimensions = {
    width: isRowLayout
      ? totalWidth + totalHorizontalPadding
      : maxWidth + totalHorizontalPadding,
    height: isRowLayout
      ? maxHeight + totalVerticalPadding
      : totalHeight + totalVerticalPadding,
  };

  if (context.debugMode) {
    context.logger.debug(
      `Elemento ${element.id}: minDimensions calculado: ${
        element.minDimensions.width
      }x${element.minDimensions.height} (direção: ${
        isRowLayout ? "ROW" : "COLUMN"
      })`
    );
  }

  // Aplicar restrições de min/max para FIT
  applyFitSizingConstraints(element);
}

/**
 * Aplicar restrições de tamanho mínimo e máximo para elementos FIT
 */
function applyFitSizingConstraints(element: LayoutElement): void {
  const widthSizing = element.layoutConfig.sizing.width;
  const heightSizing = element.layoutConfig.sizing.height;

  // Aplicar restrições ao tamanho mínimo para o eixo X (largura)
  if (widthSizing.type === SizingType.FIT) {
    element.minDimensions.width = Math.max(
      element.minDimensions.width,
      widthSizing.size.minMax?.min || DEFAULT_MIN_SIZE
    );
    element.minDimensions.width = Math.min(
      element.minDimensions.width,
      widthSizing.size.minMax?.max || DEFAULT_MAX_SIZE
    );
  } else {
    // Para outros tipos, o minDimensions não é importante
    element.minDimensions.width = 0;
  }

  // Aplicar restrições ao tamanho mínimo para o eixo Y (altura)
  if (heightSizing.type === SizingType.FIT) {
    element.minDimensions.height = Math.max(
      element.minDimensions.height,
      heightSizing.size.minMax?.min || DEFAULT_MIN_SIZE
    );
    element.minDimensions.height = Math.min(
      element.minDimensions.height,
      heightSizing.size.minMax?.max || DEFAULT_MAX_SIZE
    );
  } else {
    // Para outros tipos, o minDimensions não é importante
    element.minDimensions.height = 0;
  }
}

/**
 * Distribuir espaço ao longo de um eixo (implementação baseada no Clay)
 * Esta função faz uma travessia top-down para distribuir espaço
 */
function sizeContainersAlongAxis(
  context: PardalContext,
  isXAxis: boolean
): void {
  // Encontrar os elementos raiz
  const rootElements: LayoutElement[] = [];
  for (const element of context.layoutElements) {
    if (!context.openLayoutElementStack.includes(element)) {
      rootElements.push(element);
    }
  }

  // Processar cada árvore de layout a partir da raiz de forma top-down
  for (const rootElement of rootElements) {
    distributeSpaceToChildren(context, rootElement, isXAxis);
  }
}

/**
 * Distribui o espaço de um elemento pai para seus filhos em um determinado eixo
 * Esta função implementa a lógica principal de distribuição de espaço
 */
function distributeSpaceToChildren(
  context: PardalContext,
  parent: LayoutElement,
  isXAxis: boolean
): void {
  const layoutConfig = parent.layoutConfig;
  const sizingAxis = isXAxis
    ? layoutConfig.sizing.width
    : layoutConfig.sizing.height;
  const parentSize = isXAxis
    ? parent.dimensions.width
    : parent.dimensions.height;
  const parentPadding = isXAxis
    ? layoutConfig.padding.left + layoutConfig.padding.right
    : layoutConfig.padding.top + layoutConfig.padding.bottom;

  // Layout é ao longo do eixo que estamos processando?
  const isLayoutAlongAxis =
    (isXAxis && layoutConfig.layoutDirection === Direction.ROW) ||
    (!isXAxis && layoutConfig.layoutDirection === Direction.COLUMN);

  // Se for um elemento fit, ajustar as dimensões precisamente com base nos filhos
  if (sizingAxis.type === SizingType.FIT && parent.minDimensions) {
    // Atualizar a dimensão com base no cálculo preciso de tamanho mínimo
    const minSize = isXAxis
      ? parent.minDimensions.width
      : parent.minDimensions.height;

    if (minSize > 0) {
      if (isXAxis) {
        if (parent.dimensions.width < minSize) {
          parent.dimensions.width = minSize;
          if (context.debugMode) {
            context.logger.debug(
              `Ajustando dimensão width do elemento ${parent.id} para ${minSize} (FIT)`
            );
          }
        }
      } else {
        if (parent.dimensions.height < minSize) {
          parent.dimensions.height = minSize;
          if (context.debugMode) {
            context.logger.debug(
              `Ajustando dimensão height do elemento ${parent.id} para ${minSize} (FIT)`
            );
          }
        }
      }
    }
  }

  // Se não houver filhos, não há nada a distribuir
  if (parent.children.length === 0) {
    return;
  }

  // Espaço disponível para os filhos após remover o padding
  let availableSpace = Math.max(0, parentSize - parentPadding);

  // Lógica para distribuir espaço aos filhos de acordo com o eixo e tipo de layout
  let totalFixedAndPercentSpace = 0;
  let growContainerCount = 0;

  // Calcular total de gaps entre elementos
  const totalGapSpace = (parent.children.length - 1) * layoutConfig.childGap;
  availableSpace -= totalGapSpace;

  // Processar elementos com tamanho fixo e percentual
  for (const child of parent.children) {
    const childSizing = isXAxis
      ? child.layoutConfig.sizing.width
      : child.layoutConfig.sizing.height;

    if (childSizing.type === SizingType.FIXED) {
      const fixedSize = childSizing.size.fixed || 0;

      // Aplicar tamanho fixo ao elemento
      if (isXAxis) {
        child.dimensions.width = fixedSize;
      } else {
        child.dimensions.height = fixedSize;
      }

      if (isLayoutAlongAxis) {
        totalFixedAndPercentSpace += fixedSize;
      }
    } else if (childSizing.type === SizingType.PERCENT) {
      const percentValue = childSizing.size.percent || 0;
      // Clay considera percentual como valor entre 0 e 1
      // Clay também calcula percentual com base no espaço disponível após subtrair padding e gaps
      const calculatedSize = availableSpace * percentValue;

      // Aplicar tamanho percentual, respeitando min/max
      const minSize = childSizing.size.minMax?.min || DEFAULT_MIN_SIZE;
      const maxSize = childSizing.size.minMax?.max || DEFAULT_MAX_SIZE;
      const clampedSize = Math.max(Math.min(calculatedSize, maxSize), minSize);

      if (isXAxis) {
        child.dimensions.width = clampedSize;
      } else {
        child.dimensions.height = clampedSize;
      }

      if (isLayoutAlongAxis) {
        totalFixedAndPercentSpace += clampedSize;
      }
    } else if (childSizing.type === SizingType.FIT) {
      // Para elementos FIT, usar o tamanho mínimo calculado anteriormente
      const fitSize = isXAxis
        ? child.minDimensions.width
        : child.minDimensions.height;

      if (isXAxis) {
        child.dimensions.width = fitSize;
      } else {
        child.dimensions.height = fitSize;
      }

      if (isLayoutAlongAxis) {
        totalFixedAndPercentSpace += fitSize;
      }
    } else if (childSizing.type === SizingType.GROW) {
      growContainerCount++;
    }
  }

  // 3. Distribuir espaço restante para elementos GROW
  const remainingSpace = Math.max(
    0,
    availableSpace - totalFixedAndPercentSpace
  );

  if (growContainerCount > 0 && remainingSpace > 0) {
    const spacePerGrowElement = remainingSpace / growContainerCount;

    for (const child of parent.children) {
      const childSizing = isXAxis
        ? child.layoutConfig.sizing.width
        : child.layoutConfig.sizing.height;

      if (childSizing.type === SizingType.GROW) {
        // Aplicar tamanho GROW, respeitando min/max
        const minSize = childSizing.size.minMax?.min || DEFAULT_MIN_SIZE;
        const maxSize = childSizing.size.minMax?.max || DEFAULT_MAX_SIZE;
        const growSize = Math.max(
          Math.min(spacePerGrowElement, maxSize),
          minSize
        );

        if (isXAxis) {
          child.dimensions.width = growSize;
        } else {
          child.dimensions.height = growSize;
        }
      }
    }
  }

  // 4. No eixo perpendicular ao layout, ajustar elementos para ocupar todo o espaço disponível
  if (!isLayoutAlongAxis) {
    const perpendicularSize = parentSize - parentPadding;

    for (const child of parent.children) {
      const childSizing = isXAxis
        ? child.layoutConfig.sizing.width
        : child.layoutConfig.sizing.height;

      if (childSizing.type === SizingType.GROW) {
        // Elementos GROW ocupam todo o espaço disponível no eixo perpendicular
        if (isXAxis) {
          child.dimensions.width = Math.min(
            perpendicularSize,
            childSizing.size.minMax?.max || DEFAULT_MAX_SIZE
          );
        } else {
          child.dimensions.height = Math.min(
            perpendicularSize,
            childSizing.size.minMax?.max || DEFAULT_MAX_SIZE
          );
        }
      }
    }
  }

  // Processar todos os filhos recursivamente
  for (const child of parent.children) {
    distributeSpaceToChildren(context, child, isXAxis);
  }
}

/**
 * Calcular posições finais e gerar comandos de renderização
 */
function generateRenderCommands(pardal: Pardal): void {
  const currentContext = pardal.getContext();
  if (currentContext.debugMode) {
    currentContext.logger.debug("Gerando comandos de renderização");
  }

  // Encontrar os elementos raiz
  const rootElements: LayoutElement[] = [];
  for (const element of currentContext.layoutElements) {
    if (!currentContext.openLayoutElementStack.includes(element)) {
      rootElements.push(element);
    }
  }

  // Posicionar cada árvore de layout começando pela raiz
  for (const rootElement of rootElements) {
    positionElement(pardal, rootElement, { x: 0, y: 0 });
  }

  // Gerar comandos para cada elemento
  for (const element of currentContext.layoutElements) {
    // Verificar se o elemento tem posição e dimensões válidas
    if (
      !element.dimensions ||
      element.dimensions.width <= 0 ||
      element.dimensions.height <= 0 ||
      !element.position
    ) {
      continue;
    }

    // Extrair as posições e dimensões do elemento
    const boundingBox: BoundingBox = {
      x: element.position.x,
      y: element.position.y,
      width: element.dimensions.width,
      height: element.dimensions.height,
    };

    // Verificar tipo de elemento e gerar comando específico
    switch (element.elementType) {
      case "rectangle":
        const rectCmd = createRectangleCommand(
          element.pageId,
          boundingBox,
          element.backgroundColor,
          element.cornerRadius
        );
        pardal.addRenderCommand(rectCmd);
        break;

      case "circle":
        const circleCmd = createCircleCommand(
          element.pageId,
          boundingBox,
          element.backgroundColor
        );
        pardal.addRenderCommand(circleCmd);
        break;

      case "text":
        if (element.textConfig && element.wrappedTextLines) {
          const textConfig = element.textConfig;
          const color = textConfig.color || { r: 0, g: 0, b: 0, a: 1 };

          // Extrair todas as palavras de todas as linhas em um array plano
          let allWords: MeasuredWord[] = [];
          for (const line of element.wrappedTextLines) {
            allWords = allWords.concat(line.content);
          }

          if (allWords.length > 0) {
            const textCmd = createTextCommandFromConfig(
              element.pageId,
              boundingBox,
              {
                content: allWords,
                color: typeof color === "string" ? parseColor(color) : color,
                fontId: textConfig.fontId,
                fontSize: textConfig.fontSize,
                letterSpacing: textConfig.letterSpacing,
                lineHeight: textConfig.lineHeight,
              }
            );
            pardal.addRenderCommand(textCmd);
          }
        }
        break;

      // Caso para imagem
      default:
        if (element.elementType === "image" && element.imageConfig) {
          if (currentContext.debugMode) {
            currentContext.logger.debug(
              "Processando elemento de imagem:",
              element.id
            );
          }
          const imageCmd = createImageCommandFromConfig(
            element.pageId,
            boundingBox,
            {
              source: element.imageConfig.source,
              fit: element.imageConfig.fit,
              opacity:
                element.imageConfig.opacity !== undefined
                  ? element.imageConfig.opacity
                  : 1.0,
              cornerRadius: element.imageConfig.cornerRadius,
              rounded: element.imageConfig.rounded,
            },
            0
          );
          if (currentContext.debugMode) {
            currentContext.logger.debug(
              "Comando de renderização de imagem criado:",
              element.id
            );
          }
          pardal.addRenderCommand(imageCmd);
        } else if (element.elementType === "image") {
          if (currentContext.debugMode) {
            currentContext.logger.debug(
              "ERRO: Elemento de imagem sem imageConfig:",
              element.id
            );
          }
        }
        break;
    }
  }

  if (currentContext.debugMode) {
    currentContext.logger.debug(
      `Total de ${currentContext.renderCommands.length} comandos de renderização gerados`
    );
  }
}

/**
 * Posicionar elemento e seus filhos recursivamente
 * @param element Elemento a ser posicionado
 * @param position Posição inicial do elemento
 */
function positionElement(
  pardal: Pardal,
  element: LayoutElement,
  position: Vector2
): void {
  const currentContext = pardal.getContext();

  // Verificar se este elemento já foi processado
  if (currentContext.processedElements.has(element.id)) {
    return;
  }

  // Marcar este elemento como processado
  currentContext.processedElements.add(element.id);

  // Para elementos com Sizing.fit(), assegurar que as dimensões corretas sejam usadas
  if (
    element.layoutConfig.sizing.height.type === SizingType.FIT &&
    element.minDimensions
  ) {
    if (element.dimensions.height < element.minDimensions.height) {
      element.dimensions.height = element.minDimensions.height;
      if (currentContext.debugMode) {
        currentContext.logger.debug(
          `Corrigindo altura do elemento ${element.id} para ${element.dimensions.height} (calculado como minDimensions)`
        );
      }
    }
  }

  if (
    element.layoutConfig.sizing.width.type === SizingType.FIT &&
    element.minDimensions
  ) {
    if (element.dimensions.width < element.minDimensions.width) {
      element.dimensions.width = element.minDimensions.width;
      if (currentContext.debugMode) {
        currentContext.logger.debug(
          `Corrigindo largura do elemento ${element.id} para ${element.dimensions.width} (calculado como minDimensions)`
        );
      }
    }
  }

  // Obter largura e altura finais
  const width = element.dimensions.width;
  const height = element.dimensions.height;

  // Criar bounding box para este elemento
  const boundingBox = {
    x: position.x,
    y: position.y,
    width: width,
    height: height,
  };

  if (currentContext.debugMode) {
    currentContext.logger.debug(
      `Posicionando elemento ${element.id} em (${position.x}, ${position.y}) com tamanho ${width}x${height}`
    );
  }

  // Gerar comando de renderização para este elemento
  if (element.elementType === "rectangle") {
    pardal.addRenderCommand(
      createRectangleCommand(
        element.pageId,
        boundingBox,
        element.backgroundColor,
        element.cornerRadius,
        0
      )
    );
    if (currentContext.debugMode) {
      currentContext.logger.debug(
        `  Adicionando comando RECTANGLE para elemento ${element.id}`
      );
    }
  } else if (element.elementType === "circle") {
    pardal.addRenderCommand(
      createCircleCommand(
        element.pageId,
        boundingBox,
        element.backgroundColor,
        0
      )
    );
    if (currentContext.debugMode) {
      currentContext.logger.debug(
        `  Adicionando comando CIRCLE para elemento ${element.id}`
      );
    }
  } else if (element.elementType === "image" && element.imageConfig) {
    // Processar elemento de imagem
    pardal.addRenderCommand(
      createImageCommandFromConfig(
        element.pageId,
        boundingBox,
        {
          source: element.imageConfig.source,
          fit: element.imageConfig.fit,
          opacity:
            element.imageConfig.opacity !== undefined
              ? element.imageConfig.opacity
              : 1.0,
          cornerRadius: element.imageConfig.cornerRadius,
          rounded: element.imageConfig.rounded,
        },
        0
      )
    );
    if (currentContext.debugMode) {
      currentContext.logger.debug(
        `  Adicionando comando IMAGE para elemento ${element.id}`
      );
    }
  } else if (element.elementType === "text" && element.textConfig) {
    // Processar elemento de texto
    const color =
      typeof element.textConfig.color === "string"
        ? parseColor(element.textConfig.color)
        : element.textConfig.color || parseColor("#000000");

    const fontSize = element.textConfig.fontSize || 16;
    // Usar o lineSpacingFactor específico do elemento ou o global do contexto
    const lineSpacingFactor = element.textConfig.lineSpacingFactor !== undefined 
      ? element.textConfig.lineSpacingFactor 
      : currentContext.lineSpacingFactor;
    
    // Calcular a altura da linha com o espaçamento
    const lineHeight = element.textConfig.lineHeight || (fontSize * lineSpacingFactor);
    
    const textAlignment =
      element.textConfig.textAlignment || TextAlignment.LEFT;

    // Se não temos linhas de texto quebradas, precisamos calculá-las agora
    if (!element.wrappedTextLines || element.wrappedTextLines.length === 0) {
      if (currentContext.debugMode) {
        currentContext.logger.debug(
          `Linhas quebradas não foram pré-calculadas para ${element.id}, calculando agora...`
        );
      }

      // Se não temos palavras medidas, medimos agora
      if (!element.measuredWords) {
        element.measuredWords = measureWords(
          currentContext,
          element.textConfig.content,
          fontSize
        );
      }

      // Quebrar texto em linhas
      element.wrappedTextLines = wrapTextIntoLines(
        currentContext,
        element.textConfig.content,
        element.measuredWords,
        boundingBox.width -
          (element.layoutConfig.padding.left +
            element.layoutConfig.padding.right),
        fontSize
      );

      // Recalcular a altura com base nas linhas quebradas, incluindo o espaçamento
      let totalHeight = 0;
      
      if (element.wrappedTextLines.length > 0) {
        // Para cada linha, adicionar sua altura
        for (let i = 0; i < element.wrappedTextLines.length; i++) {
          const line = element.wrappedTextLines[i];
          
          // Adicionar a altura da linha
          totalHeight += line.dimensions.height;
          
          // Se não for a última linha, adicionar o espaçamento adicional
          if (i < element.wrappedTextLines.length - 1) {
            // Adicionar o espaço extra entre as linhas
            totalHeight += lineHeight - line.dimensions.height;
          }
        }
      }

      // Adicionar padding vertical ao total da altura
      totalHeight +=
        element.layoutConfig.padding.top + element.layoutConfig.padding.bottom;

      // Ajustar a altura do elemento com base no texto quebrado
      element.dimensions.height = totalHeight;

      // Importante: Certificar que o bounding box use a altura correta
      boundingBox.height = element.dimensions.height;

      if (currentContext.debugMode) {
        currentContext.logger.debug(
          `Ajustando altura do elemento de texto ${element.id} para ${totalHeight}px com base em ${element.wrappedTextLines.length} linhas de texto`
        );
      }
    } else {
      // Mesmo se as linhas já foram calculadas, ainda atualizamos o boundingBox
      // para garantir consistência
      boundingBox.height = element.dimensions.height;
    }

    // Renderizar cada linha individualmente
    if (element.wrappedTextLines && element.wrappedTextLines.length > 0) {
      const linePadding = element.layoutConfig.padding;
      let yOffset = boundingBox.y + linePadding.top;

      // Recalculando boundingBox com base nas dimensões atualizadas
      boundingBox.height = element.dimensions.height;

      // Aplicar alinhamento vertical se necessário (top, center, bottom)
      let contentHeight = 0;
      
      // Calcular a altura total do conteúdo incluindo o espaçamento entre linhas
      if (element.wrappedTextLines.length > 0) {
        for (let i = 0; i < element.wrappedTextLines.length; i++) {
          const line = element.wrappedTextLines[i];
          contentHeight += line.dimensions.height;
          
          // Adicionar o espaçamento entre linhas (exceto para a última linha)
          if (i < element.wrappedTextLines.length - 1) {
            contentHeight += lineHeight - line.dimensions.height;
          }
        }
      }
      
      const availableHeight =
        boundingBox.height - (linePadding.top + linePadding.bottom);
      const extraHeight = Math.max(0, availableHeight - contentHeight);

      if (element.layoutConfig.childAlignment.y === LayoutAlignmentY.CENTER) {
        yOffset += extraHeight / 2;
      } else if (
        element.layoutConfig.childAlignment.y === LayoutAlignmentY.BOTTOM
      ) {
        yOffset += extraHeight;
      }

      for (const line of element.wrappedTextLines) {
        if (line.content.length === 0) {
          // Linha vazia, apenas avançar a posição y
          yOffset += line.dimensions.height;
          continue;
        }

        // Calcular o alinhamento horizontal
        let xOffset = linePadding.left;
        const availableWidth =
          boundingBox.width - (linePadding.left + linePadding.right);

        if (textAlignment === TextAlignment.CENTER) {
          xOffset =
            linePadding.left + (availableWidth - line.dimensions.width) / 2;
        } else if (textAlignment === TextAlignment.RIGHT) {
          xOffset =
            boundingBox.width - linePadding.right - line.dimensions.width;
        }

        // Criar bounding box para esta linha
        const lineBoundingBox = {
          x: boundingBox.x + xOffset,
          y: yOffset,
          width: line.dimensions.width,
          height: line.dimensions.height,
        };

        // Adicionar comando de renderização para esta linha
        pardal.addRenderCommand(
          createTextCommandFromConfig(
            element.pageId,
            lineBoundingBox,
            {
              content: line.content,
              color: color,
              fontId: element.textConfig.fontId,
              fontSize: fontSize,
              letterSpacing: element.textConfig.letterSpacing,
              lineHeight: lineHeight,
            },
            0
          )
        );

        // Avançar para a próxima linha
        yOffset += line.dimensions.height + (lineHeight - line.dimensions.height);
      }

      if (currentContext.debugMode) {
        currentContext.logger.debug(
          `  Adicionados ${element.wrappedTextLines.length} comandos TEXT para linhas do elemento ${element.id}`
        );
      }
    } else {
      // Fallback para texto sem linhas quebradas (não deve acontecer normalmente)
      currentContext.logger.warn(
        `  Elemento de texto ${element.id} não possui linhas quebradas!`
      );

      // Garantir que as dimensões do texto estejam corretas
      if (boundingBox.width <= 0 || boundingBox.height <= 0) {
        if (currentContext.debugMode) {
          currentContext.logger.debug(
            `Detectadas dimensões inválidas para texto, recalculando...`
          );
        }
        const { width, height } = measureTextDimensions(
          currentContext,
          element.textConfig.content,
          fontSize
        );

        // Atualizar dimensões com os valores medidos
        if (boundingBox.width <= 0) boundingBox.width = width;
        if (boundingBox.height <= 0) boundingBox.height = height;

        // Atualizar também as dimensões do elemento para usos futuros
        element.dimensions.width = Math.max(element.dimensions.width, width);
        element.dimensions.height = Math.max(element.dimensions.height, height);

        if (currentContext.debugMode) {
          currentContext.logger.debug(
            `Dimensões de texto recalculadas: ${boundingBox.width}x${boundingBox.height}`
          );
        }
      }

      pardal.addRenderCommand(
        createTextCommandFromConfig(
          element.pageId,
          boundingBox,
          {
            content: element.measuredWords || [],
            color: color,
            fontId: element.textConfig.fontId,
            fontSize: fontSize,
            letterSpacing: element.textConfig.letterSpacing,
            lineHeight: lineHeight,
          },
          0
        )
      );
      if (currentContext.debugMode) {
        currentContext.logger.debug(
          `  Adicionando comando TEXT para elemento ${element.id}`
        );
      }
    }
  }

  // Se não houver filhos, não há nada mais a fazer
  if (element.children.length === 0) {
    return;
  }

  if (currentContext.debugMode) {
    currentContext.logger.debug(
      `  Processando ${element.children.length} filhos do elemento ${element.id}`
    );
  }

  // Determinar posição inicial para os filhos
  let childStartX = position.x + element.layoutConfig.padding.left;
  let childStartY = position.y + element.layoutConfig.padding.top;

  // Calcular tamanho total e máximo dos filhos para alinhamento
  let childrenTotalWidth = 0;
  let childrenTotalHeight = 0;
  let childrenMaxWidth = 0;
  let childrenMaxHeight = 0;

  if (element.layoutConfig.layoutDirection === Direction.ROW) {
    // Para layout em linha, somar larguras e pegar altura máxima
    for (let i = 0; i < element.children.length; i++) {
      const child = element.children[i];
      childrenTotalWidth += child.dimensions.width;
      childrenMaxHeight = Math.max(childrenMaxHeight, child.dimensions.height);

      // Adicionar gap entre elementos
      if (i < element.children.length - 1) {
        childrenTotalWidth += element.layoutConfig.childGap;
      }
    }
  } else {
    // Layout em coluna: somar alturas e pegar largura máxima
    for (let i = 0; i < element.children.length; i++) {
      const child = element.children[i];
      childrenTotalHeight += child.dimensions.height;
      childrenMaxWidth = Math.max(childrenMaxWidth, child.dimensions.width);

      // Adicionar gap entre elementos
      if (i < element.children.length - 1) {
        childrenTotalHeight += element.layoutConfig.childGap;
      }
    }
  }

  // Calcular espaço adicional disponível para alinhamento
  const availableWidth =
    width -
    element.layoutConfig.padding.left -
    element.layoutConfig.padding.right -
    childrenTotalWidth;
  const availableHeight =
    height -
    element.layoutConfig.padding.top -
    element.layoutConfig.padding.bottom -
    childrenTotalHeight;

  // Aplicar alinhamento horizontal para o grupo de filhos
  if (element.layoutConfig.layoutDirection === Direction.ROW) {
    // No layout em linha, alinhamento horizontal afeta posição inicial X
    if (
      element.layoutConfig.childAlignment.x === LayoutAlignmentX.CENTER &&
      availableWidth > 0
    ) {
      childStartX += availableWidth / 2;
    } else if (
      element.layoutConfig.childAlignment.x === LayoutAlignmentX.RIGHT &&
      availableWidth > 0
    ) {
      childStartX += availableWidth;
    }
  } else {
    // No layout em coluna, alinhamento vertical afeta posição inicial Y
    if (
      element.layoutConfig.childAlignment.y === LayoutAlignmentY.CENTER &&
      availableHeight > 0
    ) {
      childStartY += availableHeight / 2;
    } else if (
      element.layoutConfig.childAlignment.y === LayoutAlignmentY.BOTTOM &&
      availableHeight > 0
    ) {
      childStartY += availableHeight;
    }
  }

  // Posicionar cada filho
  let currentX = childStartX;
  let currentY = childStartY;

  for (let i = 0; i < element.children.length; i++) {
    const child = element.children[i];

    // Determinar posição individual do filho
    let childX = currentX;
    let childY = currentY;

    // Aplicar alinhamento individual no eixo perpendicular
    if (element.layoutConfig.layoutDirection === Direction.ROW) {
      // No layout em linha, o alinhamento vertical afeta cada filho individualmente
      if (element.layoutConfig.childAlignment.y === LayoutAlignmentY.CENTER) {
        const childExtraHeight =
          height -
          element.layoutConfig.padding.top -
          element.layoutConfig.padding.bottom -
          child.dimensions.height;
        if (childExtraHeight > 0) {
          childY += childExtraHeight / 2;
        }
      } else if (
        element.layoutConfig.childAlignment.y === LayoutAlignmentY.BOTTOM
      ) {
        const childExtraHeight =
          height -
          element.layoutConfig.padding.top -
          element.layoutConfig.padding.bottom -
          child.dimensions.height;
        if (childExtraHeight > 0) {
          childY += childExtraHeight;
        }
      }

      // Atualizar posição X para o próximo filho
      if (i < element.children.length - 1) {
        currentX += child.dimensions.width + element.layoutConfig.childGap;
      } else {
        currentX += child.dimensions.width;
      }
    } else {
      // No layout em coluna, o alinhamento horizontal afeta cada filho individualmente
      if (element.layoutConfig.childAlignment.x === LayoutAlignmentX.CENTER) {
        const childExtraWidth =
          width -
          element.layoutConfig.padding.left -
          element.layoutConfig.padding.right -
          child.dimensions.width;
        if (childExtraWidth > 0) {
          childX += childExtraWidth / 2;
        }
      } else if (
        element.layoutConfig.childAlignment.x === LayoutAlignmentX.RIGHT
      ) {
        const childExtraWidth =
          width -
          element.layoutConfig.padding.left -
          element.layoutConfig.padding.right -
          child.dimensions.width;
        if (childExtraWidth > 0) {
          childX += childExtraWidth;
        }
      }

      // Atualizar posição Y para o próximo filho
      if (i < element.children.length - 1) {
        currentY += child.dimensions.height + element.layoutConfig.childGap;
      } else {
        currentY += child.dimensions.height;
      }
    }

    // Posicionar este filho e seus filhos recursivamente
    positionElement(pardal, child, { x: childX, y: childY });
  }
}
