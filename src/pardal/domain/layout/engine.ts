// Importações
import { Direction, SizingType, Vector2, DEFAULT_MAX_SIZE, DEFAULT_MIN_SIZE, LayoutAlignmentX, LayoutAlignmentY, TextAlignment } from '../model/types';
import { LayoutElement, MeasuredWord, WrappedTextLine } from '../model/element';
import { getCurrentContext } from './context';
import { RenderCommand, RenderCommandType, createCircleCommand, createRectangleCommand, createTextCommand, createTextCommandFromConfig } from '../rendering/commands';
import { parseColor } from '../utils/color';

declare const PDFDocument: typeof import('pdfkit');

// Set para rastrear elementos que já foram processados
const processedElements = new Set<string>();

/**
 * Medir dimensões de texto usando PDFKit
 * Simplificada no estilo do Clay
 */
function measureTextDimensions(textContent: string, fontSize: number = 16): { width: number, height: number } {
  if (!textContent || textContent.length === 0) {
    return { width: 0, height: 0 };
  }
  
  try {
    const tempDoc = new PDFDocument({ autoFirstPage: false });
    
    const currentContext = getCurrentContext();
    const fontFamily = currentContext.fonts?.regular || 'Helvetica';
    tempDoc.font(fontFamily).fontSize(fontSize);
    
    const width = tempDoc.widthOfString(textContent);
    const height = tempDoc.heightOfString(textContent);
    
    // Liberar recursos
    tempDoc.end();
    
    return { width, height };
  } catch (error) {
    console.error('Erro ao medir texto:', error);
    return { 
      width: textContent.length * (fontSize / 2), 
      height: fontSize * 1.2 
    };
  }
}

/**
 * Medir palavras individuais em um texto
 * Reimplementado para seguir mais de perto a abordagem do Clay
 */
function measureWords(text: string, fontSize: number = 16): MeasuredWord[] {
  if (!text || text.length === 0) {
    return [];
  }
  
  try {
    const pdfDoc = new PDFDocument({ autoFirstPage: false });
    
    const currentContext = getCurrentContext();
    const fontFamily = currentContext.fonts?.regular || 'Helvetica';
    pdfDoc.font(fontFamily).fontSize(fontSize);
    
    const words: MeasuredWord[] = [];
    const spaceWidth = pdfDoc.widthOfString(' ');
    
    // Seguindo a abordagem do Clay para identificar palavras
    let start = 0;
    let end = 0;
    
    // Para garantir que a última palavra seja processada
    const processedText = text + ' ';
    
    while (end < processedText.length) {
      const current = processedText[end];
      
      if (current === ' ' || current === '\n') {
        // Medir a palavra atual (se houver)
        if (end > start) {
          const wordText = processedText.substring(start, end);
          const dimensions = pdfDoc.widthOfString(wordText);
          
          // No Clay, eles guardam a largura do espaço junto à palavra
          if (current === ' ') {
            words.push({
              startOffset: start,
              length: end - start + 1, // Incluir o espaço
              width: dimensions + spaceWidth,
              next: words.length + 1 // Próximo índice
            });
          } else {
            words.push({
              startOffset: start,
              length: end - start,
              width: dimensions,
              next: words.length + 1
            });
          }
        }
        
        // Adicionar marcador especial para quebra de linha (como faz o Clay)
        if (current === '\n') {
          words.push({
            startOffset: end + 1,
            length: 0,
            width: 0,
            next: words.length + 1
          });
        }
        
        start = end + 1;
      }
      
      end++;
    }
    
    // Corrigir o último next para -1 (final da lista)
    if (words.length > 0) {
      words[words.length - 1].next = -1;
    }
    
    pdfDoc.end();
    
    return words;
  } catch (error) {
    console.error('Erro ao medir palavras:', error);
    return [];
  }
}

/**
 * Quebrar texto em linhas com base nas palavras medidas
 * Seguindo a implementação do Clay
 */
function wrapTextIntoLines(
  text: string, 
  words: MeasuredWord[], 
  containerWidth: number, 
  lineHeight: number = 0,
  fontSize: number = 16
): WrappedTextLine[] {
  if (!text || text.length === 0 || words.length === 0) {
    return [];
  }
  
  try {
    const pdfDoc = new PDFDocument({ autoFirstPage: false });
    const currentContext = getCurrentContext();
    const fontFamily = currentContext.fonts?.regular || 'Helvetica';
    pdfDoc.font(fontFamily).fontSize(fontSize);
    
    const lines: WrappedTextLine[] = [];
    const actualLineHeight = lineHeight || (fontSize * 1.2);
    const spaceWidth = pdfDoc.widthOfString(' ');
    
    let lineWidth = 0;
    let lineLengthChars = 0;
    let lineStartOffset = 0;
    let wordIndex = 0;
    
    // Verificar se o texto completo cabe no container sem quebras de linha
    // Isso é uma otimização que o Clay também faz
    const noNewlines = !words.some(w => w.length === 0);
    const totalWidth = words.reduce((sum, w) => sum + w.width, 0);
    
    if (noNewlines && totalWidth <= containerWidth) {
      // O texto inteiro cabe como uma única linha
      lines.push({
        dimensions: { width: totalWidth, height: actualLineHeight },
        content: text,
        startOffset: 0,
        length: text.length
      });
      
      pdfDoc.end();
      return lines;
    }
    
    // Processar palavra por palavra, seguindo o algoritmo do Clay
    while (wordIndex < words.length) {
      const word = words[wordIndex];
      const wordText = text.substring(word.startOffset, word.startOffset + word.length);
      
      // Caso 1: Palavra de quebra de linha
      if (word.length === 0) {
        // Finalizar a linha atual
        if (lineLengthChars > 0) {
          const finalCharIsSpace = text[lineStartOffset + lineLengthChars - 1] === ' ';
          const adjustedWidth = finalCharIsSpace ? lineWidth - spaceWidth : lineWidth;
          const adjustedLength = finalCharIsSpace ? lineLengthChars - 1 : lineLengthChars;
          
          lines.push({
            dimensions: { width: adjustedWidth, height: actualLineHeight },
            content: text.substring(lineStartOffset, lineStartOffset + adjustedLength),
            startOffset: lineStartOffset,
            length: adjustedLength
          });
        }
        
        // Iniciar nova linha
        lineWidth = 0;
        lineLengthChars = 0;
        lineStartOffset = word.startOffset;
        wordIndex++;
        continue;
      }
      
      // Caso 2: Única palavra na linha é grande demais
      if (lineLengthChars === 0 && word.width > containerWidth) {
        lines.push({
          dimensions: { width: word.width, height: actualLineHeight },
          content: wordText,
          startOffset: word.startOffset,
          length: word.length
        });
        
        lineStartOffset = word.startOffset + word.length;
        wordIndex++;
        continue;
      }
      
      // Caso 3: A palavra não cabe na linha atual
      if (lineLengthChars > 0 && lineWidth + word.width > containerWidth) {
        // Finalizar a linha atual
        const finalCharIsSpace = text[lineStartOffset + lineLengthChars - 1] === ' ';
        const adjustedWidth = finalCharIsSpace ? lineWidth - spaceWidth : lineWidth;
        const adjustedLength = finalCharIsSpace ? lineLengthChars - 1 : lineLengthChars;
        
        lines.push({
          dimensions: { width: adjustedWidth, height: actualLineHeight },
          content: text.substring(lineStartOffset, lineStartOffset + adjustedLength),
          startOffset: lineStartOffset,
          length: adjustedLength
        });
        
        // Começar nova linha com a palavra atual
        lineWidth = 0;
        lineLengthChars = 0;
        lineStartOffset = word.startOffset;
        // Não incrementamos wordIndex para reprocessar a palavra na nova linha
        continue;
      }
      
      // Caso 4: A palavra cabe na linha atual
      lineWidth += word.width;
      lineLengthChars += word.length;
      wordIndex++;
    }
    
    // Processar a última linha (se houver conteúdo)
    if (lineLengthChars > 0) {
      const finalCharIsSpace = text[lineStartOffset + lineLengthChars - 1] === ' ';
      const adjustedWidth = finalCharIsSpace ? lineWidth - spaceWidth : lineWidth;
      const adjustedLength = finalCharIsSpace ? lineLengthChars - 1 : lineLengthChars;
      
      lines.push({
        dimensions: { width: adjustedWidth, height: actualLineHeight },
        content: text.substring(lineStartOffset, lineStartOffset + adjustedLength),
        startOffset: lineStartOffset,
        length: adjustedLength
      });
    }
    
    pdfDoc.end();
    return lines;
  } catch (error) {
    console.error('Erro ao quebrar texto em linhas:', error);
    return [];
  }
}

/**
 * Calcular o layout final
 * Implementação baseada na estrutura do Clay
 */
export function calculateFinalLayout(): void {
  const currentContext = getCurrentContext();
  
  console.log("Iniciando cálculo de layout final");
  
  // Limpar o array de comandos de renderização para evitar duplicações
  currentContext.renderCommands = [];
  
  // Limpar o conjunto de elementos processados
  processedElements.clear();
  
  // Inicializar dimensões do elemento raiz
  initializeRootElements();
  
  // Fase 1: Calcular dimensões mínimas (bottom-up)
  calculateMinimumDimensions();
  
  // Fase 2: Primeiro distribuir o espaço ao longo do eixo X
  sizeContainersAlongAxis(true);
  
  // Fase intermediária: Processar quebra de texto exatamente como o Clay faz
  processTextWrapping();
  
  // Fase 2.5: Recalcular dimensões mínimas após processar texto
  calculateMinimumDimensions();
  
  // Fase 3: Depois distribuir o espaço ao longo do eixo Y
  sizeContainersAlongAxis(false);
  
  // Fase 4: Calcular as posições finais e gerar comandos de renderização
  generateRenderCommands();
}

/**
 * Processar quebra de texto após calcular dimensões X
 * Esta fase é crucial e imita exatamente o que o Clay faz: quebrar o texto em linhas
 * depois que as larguras dos containers estão definidas, mas antes de calcular as alturas.
 */
function processTextWrapping(): void {
  const currentContext = getCurrentContext();
  
  // Processar todos os elementos de texto
  for (const element of currentContext.layoutElements) {
    if (element.elementType === 'text' && element.textConfig) {
      const fontSize = element.textConfig.fontSize || 16;
      const lineHeight = element.textConfig.lineHeight || (fontSize * 1.2);
      
      // Medir as palavras se ainda não foram medidas
      if (!element.measuredWords) {
        element.measuredWords = measureWords(element.textConfig.content, fontSize);
      }
      
      // Obter a largura disponível para o texto, considerando o padding do elemento
      const availableWidth = element.dimensions.width - (element.layoutConfig.padding.left + element.layoutConfig.padding.right);
      
      // Quebrar o texto em linhas com base na largura disponível (container)
      const wrappedLines = wrapTextIntoLines(
        element.textConfig.content,
        element.measuredWords,
        availableWidth,
        lineHeight,
        fontSize
      );
      
      // Armazenar as linhas quebradas no elemento
      element.wrappedTextLines = wrappedLines;
      
      // Recalcular a altura com base nas linhas quebradas
      let totalHeight = 0;
      for (const line of wrappedLines) {
        totalHeight += line.dimensions.height;
      }
      
      // Adicionar padding vertical ao total da altura
      totalHeight += (element.layoutConfig.padding.top + element.layoutConfig.padding.bottom);
      
      // Ajustar a altura do elemento com base no texto quebrado
      element.dimensions.height = totalHeight;
      
      // Importante: Atualizar também a altura mínima para assegurar que o layout considere a altura correta
      if (!element.minDimensions) {
        element.minDimensions = { width: 0, height: 0 };
      }
      element.minDimensions.height = Math.max(element.minDimensions.height, totalHeight);
      
      // Propagar a altura para o elemento pai se ele tiver sizing FIT
      const parentElement = findParentElement(element);
      if (parentElement && parentElement.layoutConfig.sizing.height.type === SizingType.FIT) {
        // Recalcular altura do pai considerando todos os filhos
        let parentTotalHeight = 0;
        for (const child of parentElement.children) {
          parentTotalHeight += child.dimensions.height;
          if (child !== parentElement.children[parentElement.children.length - 1]) {
            parentTotalHeight += parentElement.layoutConfig.childGap;
          }
        }
        
        // Adicionar padding do pai
        parentTotalHeight += parentElement.layoutConfig.padding.top + parentElement.layoutConfig.padding.bottom;
        
        // Atualizar dimensões do pai
        parentElement.dimensions.height = parentTotalHeight;
        if (!parentElement.minDimensions) {
          parentElement.minDimensions = { width: 0, height: 0 };
        }
        parentElement.minDimensions.height = Math.max(parentElement.minDimensions.height, parentTotalHeight);
      }
      
      console.log(`Ajustando altura do elemento de texto ${element.id} para ${totalHeight}px com base em ${wrappedLines.length} linhas de texto`);
    }
  }
}

/**
 * Encontrar o elemento pai de um elemento
 */
function findParentElement(element: LayoutElement): LayoutElement | null {
  const currentContext = getCurrentContext();
  
  for (const potentialParent of currentContext.layoutElements) {
    if (potentialParent.children.includes(element)) {
      return potentialParent;
    }
  }
  
  return null;
}

/**
 * Inicializar dimensões dos elementos raiz
 */
function initializeRootElements(): void {
  const currentContext = getCurrentContext();
  
  // Definir dimensões iniciais dos elementos raiz para ocupar todo o espaço
  for (const element of currentContext.layoutElements) {
    if (!currentContext.openLayoutElementStack.includes(element)) {
      console.log("Definindo dimensões do elemento raiz:", element.id);
      
      // Elemento raiz - inicializar com dimensões padrão
      if (element.dimensions.width === 0) {
        element.dimensions.width = element.layoutConfig.sizing.width.type === SizingType.GROW 
          ? currentContext.layoutDimensions.width 
          : 100;
      }
      
      if (element.dimensions.height === 0) {
        element.dimensions.height = element.layoutConfig.sizing.height.type === SizingType.GROW 
          ? currentContext.layoutDimensions.height 
          : 100;
      }
      
      console.log(`Dimensões após inicialização: ${element.dimensions.width}x${element.dimensions.height}`);
    }
  }
}

/**
 * Calcular dimensões mínimas de forma recursiva (DFS)
 * Esta função calcula os tamanhos mínimos de todos os elementos na árvore de layout
 * de forma bottom-up (primeiro os filhos, depois os pais)
 */
function calculateMinimumDimensions(): void {
  const currentContext = getCurrentContext();
  
  // Encontrar os elementos raiz
  const rootElements: LayoutElement[] = [];
  for (const element of currentContext.layoutElements) {
    if (!currentContext.openLayoutElementStack.includes(element)) {
      rootElements.push(element);
    }
  }
  
  // Processar cada árvore de layout a partir da raiz
  for (const rootElement of rootElements) {
    calculateElementMinimumDimensions(rootElement);
  }
}

/**
 * Função recursiva para calcular dimensões mínimas de um elemento e seus filhos
 * Implementa um algoritmo DFS para garantir que os filhos sejam processados antes dos pais
 */
function calculateElementMinimumDimensions(element: LayoutElement): void {
  // Primeiro processar todos os filhos
  for (const child of element.children) {
    calculateElementMinimumDimensions(child);
  }
  
  // Em seguida, calcular as dimensões mínimas deste elemento com base em seus filhos
  calculateElementFitSize(element);
}

/**
 * Calcular o tamanho "fit" de um elemento com base em seus filhos
 * Isto é usado para elementos que precisam se ajustar ao seu conteúdo
 */
function calculateElementFitSize(element: LayoutElement): void {
  const layoutConfig = element.layoutConfig;
  const isRowLayout = layoutConfig.layoutDirection === Direction.ROW;
  
  // Caso especial: elemento de texto
  if (element.elementType === 'text' && element.textConfig) {
    // Obter texto e configurações
    const textContent = element.textConfig.content || '';
    const fontSize = element.textConfig.fontSize || 16;
    const lineHeight = element.textConfig.lineHeight || fontSize * 1.2;
    
    // Medir palavras
    const words = measureWords(textContent, fontSize);
    
    // Armazenar palavras medidas no elemento (para uso na renderização)
    element.measuredWords = words;
    
    // Se temos uma largura definida, fazemos wrap do texto
    if (element.dimensions.width > 0) {
      const wrappedLines = wrapTextIntoLines(
        textContent,
        words,
        element.dimensions.width - (layoutConfig.padding.left + layoutConfig.padding.right),
        lineHeight,
        fontSize
      );
      
      // Armazenar linhas quebradas no elemento (para uso na renderização)
      element.wrappedTextLines = wrappedLines;
      
      // Calcular altura total do texto quebrado
      let totalHeight = 0;
      for (const line of wrappedLines) {
        totalHeight += line.dimensions.height;
      }
      
      // Definir dimensões com base nas linhas quebradas
      element.minDimensions = {
        width: element.dimensions.width,
        height: totalHeight + (layoutConfig.padding.top + layoutConfig.padding.bottom)
      };
      
      // Atualizar as dimensões do elemento
      element.dimensions.height = element.minDimensions.height;
    } else {
      // Sem largura definida, usamos a largura natural do texto
      // Medir o texto completo para obter a largura máxima
      const { width, height } = measureTextDimensions(textContent, fontSize);
      
      // Criar linha única como fallback
      if (!element.wrappedTextLines) {
        element.wrappedTextLines = [{
          dimensions: { width, height },
          content: textContent,
          startOffset: 0,
          length: textContent.length
        }];
      }
      
      element.minDimensions = {
        width: width + (layoutConfig.padding.left + layoutConfig.padding.right),
        height: height + (layoutConfig.padding.top + layoutConfig.padding.bottom)
      };
      
      // Atualizar dimensões do elemento
      element.dimensions = {
        width: element.minDimensions.width,
        height: element.minDimensions.height
      };
    }
    
    console.log(`Elemento de texto ${element.id}: dimensões calculadas: ${element.dimensions.width}x${element.dimensions.height}`);
    
    // Aplicar restrições de min/max para FIT
    applyFitSizingConstraints(element);
    return;
  }
  
  // Caso base: elemento sem filhos (que não é texto)
  if (element.children.length === 0) {
    element.minDimensions = {
      width: layoutConfig.sizing.width.type === SizingType.FIT ? 
        (layoutConfig.sizing.width.size.minMax?.min || DEFAULT_MIN_SIZE) : 0,
      height: layoutConfig.sizing.height.type === SizingType.FIT ? 
        (layoutConfig.sizing.height.size.minMax?.min || DEFAULT_MIN_SIZE) : 0
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
    child => !child.minDimensions || 
             (child.minDimensions.width === 0 && child.minDimensions.height === 0)
  );
  
  if (needsChildDimensionsRecalculation) {
    console.log(`Recalculando dimensões dos filhos para o elemento ${element.id}`);
    for (const child of element.children) {
      if (!child.minDimensions) {
        calculateElementFitSize(child);
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
        calculateElementFitSize(child);
      }
      
      // Usar dimensões reais para filhos com tamanho fixo/definido
      const childWidth = child.layoutConfig.sizing.width.type === SizingType.FIXED ? 
                        child.layoutConfig.sizing.width.size.fixed || child.minDimensions.width :
                        child.minDimensions.width;
      
      const childHeight = child.layoutConfig.sizing.height.type === SizingType.FIXED ? 
                         child.layoutConfig.sizing.height.size.fixed || child.minDimensions.height :
                         child.minDimensions.height;
      
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
        calculateElementFitSize(child);
      }
      
      // Usar dimensões reais para filhos com tamanho fixo/definido
      const childWidth = child.layoutConfig.sizing.width.type === SizingType.FIXED ? 
                        child.layoutConfig.sizing.width.size.fixed || child.minDimensions.width :
                        child.minDimensions.width;
      
      const childHeight = child.layoutConfig.sizing.height.type === SizingType.FIXED ? 
                         child.layoutConfig.sizing.height.size.fixed || child.minDimensions.height :
                         child.minDimensions.height;
      
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
    width: isRowLayout ? 
      totalWidth + totalHorizontalPadding : 
      maxWidth + totalHorizontalPadding,
    height: isRowLayout ? 
      maxHeight + totalVerticalPadding : 
      totalHeight + totalVerticalPadding
  };
  
  console.log(`Elemento ${element.id}: minDimensions calculado: ${element.minDimensions.width}x${element.minDimensions.height} (direção: ${isRowLayout ? 'ROW' : 'COLUMN'})`);
  
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
function sizeContainersAlongAxis(isXAxis: boolean): void {
  const currentContext = getCurrentContext();
  
  // Encontrar os elementos raiz
  const rootElements: LayoutElement[] = [];
  for (const element of currentContext.layoutElements) {
    if (!currentContext.openLayoutElementStack.includes(element)) {
      rootElements.push(element);
    }
  }
  
  // Processar cada árvore de layout a partir da raiz de forma top-down
  for (const rootElement of rootElements) {
    distributeSpaceToChildren(rootElement, isXAxis);
  }
}

/**
 * Distribui o espaço de um elemento pai para seus filhos em um determinado eixo
 * Esta função implementa a lógica principal de distribuição de espaço
 */
function distributeSpaceToChildren(parent: LayoutElement, isXAxis: boolean): void {
  const layoutConfig = parent.layoutConfig;
  const sizingAxis = isXAxis ? layoutConfig.sizing.width : layoutConfig.sizing.height;
  const parentSize = isXAxis ? parent.dimensions.width : parent.dimensions.height;
  const parentPadding = isXAxis 
    ? (layoutConfig.padding.left + layoutConfig.padding.right)
    : (layoutConfig.padding.top + layoutConfig.padding.bottom);
  
  // Layout é ao longo do eixo que estamos processando?
  const isLayoutAlongAxis = (isXAxis && layoutConfig.layoutDirection === Direction.ROW) || 
                            (!isXAxis && layoutConfig.layoutDirection === Direction.COLUMN);
  
  // Se for um elemento fit, ajustar as dimensões precisamente com base nos filhos
  if (sizingAxis.type === SizingType.FIT && parent.minDimensions) {
    // Atualizar a dimensão com base no cálculo preciso de tamanho mínimo
    const minSize = isXAxis ? parent.minDimensions.width : parent.minDimensions.height;
    
    if (minSize > 0) {
      if (isXAxis) {
        if (parent.dimensions.width < minSize) {
          parent.dimensions.width = minSize;
          console.log(`Ajustando dimensão width do elemento ${parent.id} para ${minSize} (FIT)`);
        }
      } else {
        if (parent.dimensions.height < minSize) {
          parent.dimensions.height = minSize;
          console.log(`Ajustando dimensão height do elemento ${parent.id} para ${minSize} (FIT)`);
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
    const childSizing = isXAxis ? child.layoutConfig.sizing.width : child.layoutConfig.sizing.height;
    
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
    } 
    else if (childSizing.type === SizingType.PERCENT) {
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
    }
    else if (childSizing.type === SizingType.FIT) {
      // Para elementos FIT, usar o tamanho mínimo calculado anteriormente
      const fitSize = isXAxis ? child.minDimensions.width : child.minDimensions.height;
      
      if (isXAxis) {
        child.dimensions.width = fitSize;
      } else {
        child.dimensions.height = fitSize;
      }
      
      if (isLayoutAlongAxis) {
        totalFixedAndPercentSpace += fitSize;
      }
    }
    else if (childSizing.type === SizingType.GROW) {
      growContainerCount++;
    }
  }
  
  // 3. Distribuir espaço restante para elementos GROW
  const remainingSpace = Math.max(0, availableSpace - totalFixedAndPercentSpace);
  
  if (growContainerCount > 0 && remainingSpace > 0) {
    const spacePerGrowElement = remainingSpace / growContainerCount;
    
    for (const child of parent.children) {
      const childSizing = isXAxis ? child.layoutConfig.sizing.width : child.layoutConfig.sizing.height;
      
      if (childSizing.type === SizingType.GROW) {
        // Aplicar tamanho GROW, respeitando min/max
        const minSize = childSizing.size.minMax?.min || DEFAULT_MIN_SIZE;
        const maxSize = childSizing.size.minMax?.max || DEFAULT_MAX_SIZE;
        const growSize = Math.max(Math.min(spacePerGrowElement, maxSize), minSize);
        
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
      const childSizing = isXAxis ? child.layoutConfig.sizing.width : child.layoutConfig.sizing.height;
      
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
    distributeSpaceToChildren(child, isXAxis);
  }
}

/**
 * Calcular posições finais e gerar comandos de renderização
 */
function generateRenderCommands(): void {
  const currentContext = getCurrentContext();
  
  console.log("Gerando comandos de renderização");
  
  // Encontrar os elementos raiz
  const rootElements: LayoutElement[] = [];
  for (const element of currentContext.layoutElements) {
    if (!currentContext.openLayoutElementStack.includes(element)) {
      rootElements.push(element);
    }
  }
  
  // Posicionar cada árvore de layout começando pela raiz
  for (const rootElement of rootElements) {
    positionElement(rootElement, { x: 0, y: 0 });
  }
  
  console.log(`Total de ${currentContext.renderCommands.length} comandos de renderização gerados`);
}

/**
 * Posicionar elemento e seus filhos recursivamente
 * @param element Elemento a ser posicionado
 * @param position Posição inicial do elemento
 */
function positionElement(element: LayoutElement, position: Vector2): void {
  const currentContext = getCurrentContext();
  const layoutConfig = element.layoutConfig;
  
  // Verificar se este elemento já foi processado
  if (processedElements.has(element.id)) {
    return;
  }
  
  // Marcar este elemento como processado
  processedElements.add(element.id);
  
  // Para elementos com Sizing.fit(), assegurar que as dimensões corretas sejam usadas
  if (layoutConfig.sizing.height.type === SizingType.FIT && element.minDimensions) {
    if (element.dimensions.height < element.minDimensions.height) {
      element.dimensions.height = element.minDimensions.height;
      console.log(`Corrigindo altura do elemento ${element.id} para ${element.dimensions.height} (calculado como minDimensions)`);
    }
  }
  
  if (layoutConfig.sizing.width.type === SizingType.FIT && element.minDimensions) {
    if (element.dimensions.width < element.minDimensions.width) {
      element.dimensions.width = element.minDimensions.width;
      console.log(`Corrigindo largura do elemento ${element.id} para ${element.dimensions.width} (calculado como minDimensions)`);
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
    height: height
  };
  
  console.log(`Posicionando elemento ${element.id} em (${position.x}, ${position.y}) com tamanho ${width}x${height}`);
  
  // Gerar comando de renderização para este elemento
  if (element.elementType === 'rectangle') {
    currentContext.renderCommands.push(
      createRectangleCommand(boundingBox, element.backgroundColor, element.cornerRadius, 0)
    );
    console.log(`  Adicionando comando RECTANGLE para elemento ${element.id}`);
  } else if (element.elementType === 'circle') {
    currentContext.renderCommands.push(
      createCircleCommand(boundingBox, element.backgroundColor, 0)
    );
    console.log(`  Adicionando comando CIRCLE para elemento ${element.id}`);
  } else if (element.elementType === 'text' && element.textConfig) {
    // Processar elemento de texto
    const color = typeof element.textConfig.color === 'string' 
      ? parseColor(element.textConfig.color) 
      : element.textConfig.color || parseColor('#000000');
    
    const fontSize = element.textConfig.fontSize || 16;
    const lineHeight = element.textConfig.lineHeight || (fontSize * 1.2);
    const textAlignment = element.textConfig.textAlignment || TextAlignment.LEFT;
    
    // Se não temos linhas de texto quebradas, precisamos calculá-las agora
    if (!element.wrappedTextLines || element.wrappedTextLines.length === 0) {
      console.log(`Linhas quebradas não foram pré-calculadas para ${element.id}, calculando agora...`);
      
      // Se não temos palavras medidas, medimos agora
      if (!element.measuredWords) {
        element.measuredWords = measureWords(element.textConfig.content, fontSize);
      }
      
      // Quebrar texto em linhas
      element.wrappedTextLines = wrapTextIntoLines(
        element.textConfig.content,
        element.measuredWords,
        boundingBox.width - (element.layoutConfig.padding.left + element.layoutConfig.padding.right),
        lineHeight,
        fontSize
      );
      
      // Recalcular a altura com base nas linhas quebradas
      let totalHeight = 0;
      for (const line of element.wrappedTextLines) {
        totalHeight += line.dimensions.height;
      }
      
      // Adicionar padding vertical ao total da altura
      totalHeight += (element.layoutConfig.padding.top + element.layoutConfig.padding.bottom);
      
      // Ajustar a altura do elemento com base no texto quebrado
      element.dimensions.height = totalHeight;
      
      // Importante: Certificar que o bounding box use a altura correta
      boundingBox.height = element.dimensions.height;
      
      console.log(`Ajustando altura do elemento de texto ${element.id} para ${totalHeight}px com base em ${element.wrappedTextLines.length} linhas de texto`);
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
      const contentHeight = element.wrappedTextLines.reduce((sum, line) => sum + line.dimensions.height, 0);
      const availableHeight = boundingBox.height - (linePadding.top + linePadding.bottom);
      const extraHeight = Math.max(0, availableHeight - contentHeight);
      
      if (layoutConfig.childAlignment.y === LayoutAlignmentY.CENTER) {
        yOffset += extraHeight / 2;
      } else if (layoutConfig.childAlignment.y === LayoutAlignmentY.BOTTOM) {
        yOffset += extraHeight;
      }
      
      for (const line of element.wrappedTextLines) {
        if (line.content.trim().length === 0) {
          // Linha vazia, apenas avançar a posição y
          yOffset += line.dimensions.height;
          continue;
        }
        
        // Calcular o alinhamento horizontal
        let xOffset = linePadding.left;
        const availableWidth = boundingBox.width - (linePadding.left + linePadding.right);
        
        if (textAlignment === TextAlignment.CENTER) {
          xOffset = linePadding.left + (availableWidth - line.dimensions.width) / 2;
        } else if (textAlignment === TextAlignment.RIGHT) {
          xOffset = boundingBox.width - linePadding.right - line.dimensions.width;
        }
        
        // Criar bounding box para esta linha
        const lineBoundingBox = {
          x: boundingBox.x + xOffset,
          y: yOffset,
          width: line.dimensions.width,
          height: line.dimensions.height
        };
        
        // Adicionar comando de renderização para esta linha
        currentContext.renderCommands.push(
          createTextCommandFromConfig(
            lineBoundingBox,
            {
              content: line.content,
              color: color,
              fontId: element.textConfig.fontId,
              fontSize: fontSize,
              letterSpacing: element.textConfig.letterSpacing,
              lineHeight: lineHeight
            },
            0
          )
        );
        
        // Avançar para a próxima linha
        yOffset += line.dimensions.height;
      }
      
      console.log(`  Adicionados ${element.wrappedTextLines.length} comandos TEXT para linhas do elemento ${element.id}`);
    } else {
      // Fallback para texto sem linhas quebradas (não deve acontecer normalmente)
      console.warn(`  Elemento de texto ${element.id} não possui linhas quebradas!`);
      
      // Garantir que as dimensões do texto estejam corretas
      if (boundingBox.width <= 0 || boundingBox.height <= 0) {
        console.log(`Detectadas dimensões inválidas para texto, recalculando...`);
        const { width, height } = measureTextDimensions(
          element.textConfig.content,
          fontSize
        );
        
        // Atualizar dimensões com os valores medidos
        if (boundingBox.width <= 0) boundingBox.width = width;
        if (boundingBox.height <= 0) boundingBox.height = height;
        
        // Atualizar também as dimensões do elemento para usos futuros
        element.dimensions.width = Math.max(element.dimensions.width, width);
        element.dimensions.height = Math.max(element.dimensions.height, height);
        
        console.log(`Dimensões de texto recalculadas: ${boundingBox.width}x${boundingBox.height}`);
      }
      
      currentContext.renderCommands.push(
        createTextCommandFromConfig(
          boundingBox,
          {
            content: element.textConfig.content,
            color: color,
            fontId: element.textConfig.fontId,
            fontSize: fontSize,
            letterSpacing: element.textConfig.letterSpacing,
            lineHeight: lineHeight
          },
          0
        )
      );
      console.log(`  Adicionando comando TEXT para elemento ${element.id}`);
    }
  }
  
  // Se não houver filhos, não há nada mais a fazer
  if (element.children.length === 0) {
    return;
  }
  
  console.log(`  Processando ${element.children.length} filhos do elemento ${element.id}`);
  
  // Determinar posição inicial para os filhos
  let childStartX = position.x + layoutConfig.padding.left;
  let childStartY = position.y + layoutConfig.padding.top;
  
  // Calcular tamanho total e máximo dos filhos para alinhamento
  let childrenTotalWidth = 0;
  let childrenTotalHeight = 0;
  let childrenMaxWidth = 0;
  let childrenMaxHeight = 0;
  
  if (layoutConfig.layoutDirection === Direction.ROW) {
    // Para layout em linha, somar larguras e pegar altura máxima
    for (let i = 0; i < element.children.length; i++) {
      const child = element.children[i];
      childrenTotalWidth += child.dimensions.width;
      childrenMaxHeight = Math.max(childrenMaxHeight, child.dimensions.height);
      
      // Adicionar gap entre elementos
      if (i < element.children.length - 1) {
        childrenTotalWidth += layoutConfig.childGap;
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
        childrenTotalHeight += layoutConfig.childGap;
      }
    }
  }
  
  // Calcular espaço adicional disponível para alinhamento
  const availableWidth = width - layoutConfig.padding.left - layoutConfig.padding.right - childrenTotalWidth;
  const availableHeight = height - layoutConfig.padding.top - layoutConfig.padding.bottom - childrenTotalHeight;
  
  // Aplicar alinhamento horizontal para o grupo de filhos
  if (layoutConfig.layoutDirection === Direction.ROW) {
    // No layout em linha, alinhamento horizontal afeta posição inicial X
    if (layoutConfig.childAlignment.x === LayoutAlignmentX.CENTER && availableWidth > 0) {
      childStartX += availableWidth / 2;
    } else if (layoutConfig.childAlignment.x === LayoutAlignmentX.RIGHT && availableWidth > 0) {
      childStartX += availableWidth;
    }
  } else {
    // No layout em coluna, alinhamento vertical afeta posição inicial Y
    if (layoutConfig.childAlignment.y === LayoutAlignmentY.CENTER && availableHeight > 0) {
      childStartY += availableHeight / 2;
    } else if (layoutConfig.childAlignment.y === LayoutAlignmentY.BOTTOM && availableHeight > 0) {
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
    if (layoutConfig.layoutDirection === Direction.ROW) {
      // No layout em linha, o alinhamento vertical afeta cada filho individualmente
      if (layoutConfig.childAlignment.y === LayoutAlignmentY.CENTER) {
        const childExtraHeight = (height - layoutConfig.padding.top - layoutConfig.padding.bottom - child.dimensions.height);
        if (childExtraHeight > 0) {
          childY += childExtraHeight / 2;
        }
      } else if (layoutConfig.childAlignment.y === LayoutAlignmentY.BOTTOM) {
        const childExtraHeight = (height - layoutConfig.padding.top - layoutConfig.padding.bottom - child.dimensions.height);
        if (childExtraHeight > 0) {
          childY += childExtraHeight;
        }
      }
      
      // Atualizar posição X para o próximo filho
      if (i < element.children.length - 1) {
        currentX += child.dimensions.width + layoutConfig.childGap;
      } else {
        currentX += child.dimensions.width;
      }
    } else {
      // No layout em coluna, o alinhamento horizontal afeta cada filho individualmente
      if (layoutConfig.childAlignment.x === LayoutAlignmentX.CENTER) {
        const childExtraWidth = (width - layoutConfig.padding.left - layoutConfig.padding.right - child.dimensions.width);
        if (childExtraWidth > 0) {
          childX += childExtraWidth / 2;
        }
      } else if (layoutConfig.childAlignment.x === LayoutAlignmentX.RIGHT) {
        const childExtraWidth = (width - layoutConfig.padding.left - layoutConfig.padding.right - child.dimensions.width);
        if (childExtraWidth > 0) {
          childX += childExtraWidth;
        }
      }
      
      // Atualizar posição Y para o próximo filho
      if (i < element.children.length - 1) {
        currentY += child.dimensions.height + layoutConfig.childGap;
      } else {
        currentY += child.dimensions.height;
      }
    }
    
    // Posicionar este filho e seus filhos recursivamente
    positionElement(child, { x: childX, y: childY });
  }
} 