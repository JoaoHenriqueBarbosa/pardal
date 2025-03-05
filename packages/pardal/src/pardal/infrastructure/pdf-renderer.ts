import { RenderCommandType } from '../domain/rendering/commands';
import { colorToHex } from '../domain/utils/color';
import { getCurrentContext } from '../domain/layout/context';
import { FontOptions, DEFAULT_FONTS } from "../domain/model/types";
import { getFontForWord } from '../domain/layout/engine';
import { CornerRadius } from '../domain/model/types';
import { RenderCommand } from '../domain/rendering/commands';

// Declaração para o PDFKit
declare const PDFDocument: typeof import('pdfkit');

/**
 * Renderiza a árvore de comandos para um documento PDF
 * @returns ArrayBuffer contendo os bytes do PDF
 */
export async function renderToPDF(doc: typeof PDFDocument): Promise<ArrayBuffer> {
  const { renderCommands } = getCurrentContext();
  
  // Verificar se já temos comandos de renderização
  if (renderCommands.length === 0) {
    if (getCurrentContext().debugMode) {
      console.log("Nenhum comando de renderização encontrado, executando endLayout");
    }
    throw new Error('Nenhum comando de renderização encontrado. Execute endLayout primeiro.');
  }
  
  if (getCurrentContext().debugMode) {
      console.log("Comandos de renderização:", renderCommands.length);
    }
  if (getCurrentContext().debugMode) {
      console.log("Elementos:", getCurrentContext().layoutElements.length);
    }
  
  // Adicionar um retângulo de fundo para depuração apenas se estiver no modo debug
  if (getCurrentContext().debugMode) {
    doc.rect(0, 0, getCurrentContext().layoutDimensions.width, getCurrentContext().layoutDimensions.height)
       .fillColor('#EEEEEE')
       .fill();
  }
  
  // Ordenar comandos por Z-index
  const sortedCommands = [...renderCommands].sort((a, b) => a.zIndex - b.zIndex);
  
  if (getCurrentContext().debugMode) {
      console.log("Comandos ordenados:", sortedCommands.length);
    }
  
  // Aplicar cada comando ao documento PDF
  for (const command of sortedCommands) {
    const { x, y, width, height } = command.boundingBox;
    
    switch (command.commandType) {
      case RenderCommandType.RECTANGLE:
        if (command.renderData.rectangle) {
          const { backgroundColor, cornerRadius } = command.renderData.rectangle;
          drawRectangle(doc, x, y, width, height, backgroundColor, cornerRadius);
        }
        break;
      
      case RenderCommandType.CIRCLE:
        if (command.renderData.circle) {
          const { backgroundColor } = command.renderData.circle;
          drawCircle(doc, x, y, width, backgroundColor);
        }
        break;
        
      case RenderCommandType.TEXT:
        if (command.renderData.text) {
          drawText(doc, command);
        }
        break;
        
      case RenderCommandType.IMAGE:
        if (command.renderData.image) {
          const { source, fit, opacity, cornerRadius, rounded } = command.renderData.image;
          drawImage(doc, x, y, width, height, source, fit, opacity, cornerRadius, rounded);
        }
        break;
    }
  }
  
  // Desenhar bordas nos elementos para depuração como último passo multipass
  if (getCurrentContext().debugMode) {
    if (getCurrentContext().debugMode) {
      console.log("Desenhando bordas de depuração como último passo do multipass (modo debug ativado)");
    }

    // Aplicar bordas de depuração após todas as renderizações normais
    doc.strokeColor('#FF0000')
       .lineWidth(1);

    // Iterar pelos comandos ordenados do mais externo para o mais interno
    // para garantir que os aninhados fiquem por cima visualmente
    for (const command of [...sortedCommands].reverse()) {
      const { x, y, width, height } = command.boundingBox;
      
      // Verificação adicional para garantir integridade das dimensões
      if (width <= 0 || height <= 0) {
        console.warn(`Ignorando retângulo de debug com dimensões inválidas: ${width}x${height}`);
        continue;
      }
      
      // Para elementos muito pequenos, garantir uma borda mínima visível
      if (width < 2 || height < 2) {
        console.warn(`Elemento muito pequeno para debug: ${width}x${height}, ajustando visualização`);
        
        // Desenhar com uma cor diferente para elementos muito pequenos
        doc.strokeColor('#0000FF');
      } else {
        doc.strokeColor('#FF0000');
      }
      
      // Para retângulos com corner radius, desenhe bordas arredondadas também
      if (command.commandType === RenderCommandType.RECTANGLE && 
          command.renderData.rectangle?.cornerRadius) {
        doc.roundedRect(x, y, width, height, command.renderData.rectangle.cornerRadius).stroke();
      } else {
        doc.rect(x, y, width, height).stroke();
      }
    }
  }
  
  // Finalizar o documento
  doc.end();
  
  // Coletar chunks em um array de buffers
  return new Promise<ArrayBuffer>((resolve) => {
    const chunks: Uint8Array[] = [];
    
    doc.on('data', (chunk: Uint8Array) => {
      chunks.push(chunk);
    });
    
    doc.on('end', () => {
      // Calcular o tamanho total
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      
      // Criar um buffer único
      const result = new Uint8Array(totalLength);
      
      // Copiar cada chunk para o buffer final
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      resolve(result.buffer);
    });
  });
}

/**
 * Cria um novo documento PDF
 */
export function createPDFDocument(options?: {
  margin?: { top: number, left: number, bottom: number, right: number };
  size?: [number, number];
  debug?: boolean;
  font?: FontOptions;
}): typeof PDFDocument {
  return new PDFDocument({
    margins: options?.margin !== undefined ? options.margin : { top: 0, left: 0, bottom: 0, right: 0 },
    size: options?.size || [595.28, 841.89],
    autoFirstPage: true
  });
}

/**
 * Desenha uma imagem no documento PDF
 */
function drawImage(
  doc: typeof PDFDocument, 
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  source: string,
  fit: string,
  opacity: number,
  cornerRadius?: CornerRadius,
  rounded?: boolean
): void {
  if (getCurrentContext().debugMode) {
      console.log("Desenhando imagem:", source);
    }
  if (getCurrentContext().debugMode) {
      console.log("Dimensões:", { x, y, width, height });
    }
  if (getCurrentContext().debugMode) {
      console.log("Fit:", fit);
    }
  if (getCurrentContext().debugMode) {
      console.log("Opacity:", opacity);
    }
  if (getCurrentContext().debugMode) {
      console.log("Corner Radius:", cornerRadius);
    }
  if (getCurrentContext().debugMode) {
      console.log("Rounded:", rounded);
    }
  
  try {
    // Salvar o estado do documento
    doc.save();
    
    // Aplicar clipping se necessário
    if (rounded) {
      // Para formato circular
      if (getCurrentContext().debugMode) {
      console.log("Aplicando clipping circular");
    }
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      const radius = Math.min(width, height) / 2;
      
      doc.circle(centerX, centerY, radius);
      doc.clip();
    } else if (cornerRadius) {
      // Para cantos arredondados
      if (getCurrentContext().debugMode) {
      console.log("Aplicando clipping com cantos arredondados");
    }
      
      // Normalizar cornerRadius se for um número simples
      const cr = typeof cornerRadius === 'number' 
        ? { topLeft: cornerRadius, topRight: cornerRadius, bottomLeft: cornerRadius, bottomRight: cornerRadius }
        : cornerRadius;
      
      // Desenhar retângulo com cantos arredondados para clipping
      // No PDFKit, a API é roundedRect(x, y, width, height, radius)
      // Se radius for um número, todos os cantos terão o mesmo raio
      // Se radius for um objeto, ele define o raio de cada canto
      const radius = Math.min(
        cr.topLeft || 0, 
        cr.topRight || 0, 
        cr.bottomLeft || 0, 
        cr.bottomRight || 0
      );
      
      if (typeof radius === 'number' && radius > 0) {
        doc.roundedRect(x, y, width, height, radius).clip();
      } else {
        // Fallback para retângulo normal se não tivermos raios válidos
        doc.rect(x, y, width, height).clip();
      }
    } else {
      // Clipping retangular padrão
      if (getCurrentContext().debugMode) {
      console.log("Aplicando clipping retangular padrão");
    }
      doc.rect(x, y, width, height).clip();
    }
    
    // Definir as opções com base no modo de ajuste
    const options: any = {};
    
    // Configurar o alinhamento padrão para centro
    options.align = 'center';
    options.valign = 'center';
    
    switch (fit) {
      case 'FILL':
        // No modo FILL, definimos width e height diretamente
        options.width = width;
        options.height = height;
        break;
        
      case 'CONTAIN':
        // No modo CONTAIN, usamos a opção fit do PDFKit
        options.fit = [width, height];
        break;
        
      case 'COVER':
        // No modo COVER, usamos a opção cover do PDFKit
        options.cover = [width, height];
        break;
        
      default:
        // Padrão é CONTAIN
        options.fit = [width, height];
        break;
    }
    
    // Aplicar opacidade se necessário (usando a transformação de transparência do PDF)
    if (opacity < 1.0) {
      const gs = doc.ref({
        Type: 'ExtGState',
        CA: opacity,
        ca: opacity
      });
      
      doc.page.ext_gstates[`Gs${opacity}`] = gs;
      doc.addContent(`/Gs${opacity} gs`);
    }
    // Desenhar a imagem
    if (getCurrentContext().debugMode) {
      console.log("Chamando doc.image com:", { source, x, y, options });
    }
    doc.image(source, x, y, options);
    if (getCurrentContext().debugMode) {
      console.log("Imagem desenhada com sucesso");
    }
    
    // Restaurar o estado do documento
    doc.restore();
  } catch (error) {
    console.error(`Erro ao renderizar imagem (${source}):`, error);
  }
}

function drawRectangle(
  doc: typeof PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  backgroundColor: { r: number, g: number, b: number, a: number },
  cornerRadius?: number
): void {
  if (getCurrentContext().debugMode) {
      console.log(`Desenhando retângulo em (${x}, ${y}) com tamanho ${width}x${height}`);
    }
  if (getCurrentContext().debugMode) {
      console.log(`Cor: rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})`);
    }
  
  // Usar formato hexadecimal para compatibilidade
  const hexColor = colorToHex(backgroundColor);
  
  if (getCurrentContext().debugMode) {
      console.log(`Cor em hex: ${hexColor}`);
    }
  
  doc.fillColor(hexColor)
     .fillOpacity(backgroundColor.a / 255);
  
  if (cornerRadius) {
    // Se tiver cornerRadius, desenha com cantos arredondados
    doc.roundedRect(x, y, width, height, cornerRadius).fill();
  } else {
    // Sem cornerRadius, desenha um retângulo normal
    doc.rect(x, y, width, height).fill();
  }
}

function drawCircle(
  doc: typeof PDFDocument,
  x: number,
  y: number,
  width: number,
  backgroundColor: { r: number, g: number, b: number, a: number }
): void {
  const radius = width / 2;
  
  if (getCurrentContext().debugMode) {
      console.log(`Desenhando círculo em (${x}, ${y}) com raio ${radius}`);
    }
  
  // Usar formato hexadecimal para compatibilidade
  const hexColor = colorToHex(backgroundColor);
  
  doc.fillColor(hexColor)
     .fillOpacity(backgroundColor.a / 255)
     .circle(x + radius, y + radius, radius)
     .fill();
}

function drawText(
  doc: typeof PDFDocument,
  command: RenderCommand
): void {
  if (!command.renderData.text) return;
  
  const { content, color, fontSize } = command.renderData.text;
  const { x, y, width, height } = command.boundingBox;
  
  if (getCurrentContext().debugMode) {
      console.log(`Desenhando texto em (${x}, ${y}): "${content.map(segment => segment.text).join('')}"`);
    }
  if (getCurrentContext().debugMode) {
      console.log(`Fonte: ${fontSize}px, Cor: rgb(${color.r}, ${color.g}, ${color.b})`);
    }
  
  // Usar formato hexadecimal para compatibilidade
  const hexColor = colorToHex(color);
  const context = getCurrentContext();
  
  // Se não houver segmentos com formatação, renderize normalmente
  if (content.length <= 1) {
    // Determinação da fonte padrão
    let fontFamily = DEFAULT_FONTS.regular || 'Helvetica';
    if (context.fonts) {
      fontFamily = context.fonts.regular || DEFAULT_FONTS.regular || 'Helvetica';
    }

    // Configurar fonte para renderização
    doc.font(fontFamily)
       .fontSize(fontSize || 16)
       .fillColor(hexColor)
       .fillOpacity(color.a / 255);

    // Calcular o ajuste de baseline para centralização vertical
    const baselineAdjustment = (height - doc.currentLineHeight()) / 2;

    doc.text(content.map(segment => segment.text).join(' '), x, y + baselineAdjustment, {
      width: width,
      height: height,
      align: 'left'
    });
  } else {
    // Posição inicial para renderização
    let currentY = y;
    
    // Em vez de tentar renderizar segmento por segmento com 'continued',
    // vamos renderizar linha por linha em um processo mais controlado
    
    // Primeiro vamos medir e agrupar segmentos em linhas
    let lines: { segments: { text: string, font: string }[], y: number }[] = [{ segments: [], y: currentY }];
    let lineIndex = 0;
    let lineWidth = 0;
    
    // Medir e organizar segmentos em linhas
    for (const segment of content) {
      // Determinar a fonte baseada no estilo
      const fontFamily = getFontForWord(segment, context.fonts || DEFAULT_FONTS) || 'Helvetica';
      
      // Medir o texto com a fonte correta
      doc.font(fontFamily).fontSize(fontSize || 16);
      const segmentWidth = doc.widthOfString(segment.text);
      
      // Verificar se o segmento cabe na linha atual
      if (lineWidth + segmentWidth > width && lineWidth > 0) {
        // Criar nova linha
        currentY += doc.currentLineHeight();
        lines.push({ segments: [], y: currentY });
        lineIndex++;
        lineWidth = 0;
      }
      
      // Adicionar segmento à linha atual
      lines[lineIndex].segments.push({
        text: segment.text,
        font: fontFamily
      });
      
      // Atualizar largura da linha
      lineWidth += segmentWidth;
    }
    
    // Calcular o ajuste de baseline para centralização vertical
    const lineHeight = doc.currentLineHeight();
    const totalContentHeight = lines.length * lineHeight;
    const baselineAdjustment = (height - totalContentHeight) / 2;
    
    // Agora renderizar linha por linha, segmento por segmento
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      let xPos = x;
      
      for (let segIndex = 0; segIndex < line.segments.length; segIndex++) {
        const segment = line.segments[segIndex];
        const isLastSegmentInLastLine = lineIndex === lines.length - 1 && segIndex === line.segments.length - 1;
        const isFirstSegmentInFirstLine = lineIndex === 0 && segIndex === 0;
        
        // Configurar fonte e cor
        doc.font(segment.font)
           .fontSize(fontSize || 16)
           .fillColor(hexColor)
           .fillOpacity(color.a / 255);

        if (isFirstSegmentInFirstLine) {
            doc.text(segment.text, xPos, line.y + baselineAdjustment, {
                continued: true,
                lineGap: 0
            });
        } else {
            doc.text(segment.text, {
                continued: !isLastSegmentInLastLine,
                lineGap: 0,
            });
            // Renderizar o segmento na posição correta com ajuste de baseline
        }
        
        // Avançar a posição manual e explicitamente apenas se não for o último segmento
        if (!isLastSegmentInLastLine) {
          xPos += doc.widthOfString(segment.text);
        }
      }
    }
  }
} 