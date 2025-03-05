import { RenderCommandType } from '../domain/rendering/commands';
import { colorToHex } from '../domain/utils/color';
import { getCurrentContext } from '../domain/layout/context';
import { FontOptions, DEFAULT_FONTS } from "../domain/model/types";
import { getFontForWord } from '../domain/layout/engine';

// Declaração para o PDFKit
declare const PDFDocument: typeof import('pdfkit');

/**
 * Renderiza a árvore de comandos para um documento PDF
 */
export function renderToPDF(doc: typeof PDFDocument): void {
  const currentContext = getCurrentContext();
  
  // Verificar se já temos comandos de renderização
  if (currentContext.renderCommands.length === 0) {
    console.log("Nenhum comando de renderização encontrado, executando endLayout");
    throw new Error('Nenhum comando de renderização encontrado. Execute endLayout primeiro.');
  }
  
  console.log("Comandos de renderização:", currentContext.renderCommands.length);
  console.log("Elementos:", currentContext.layoutElements.length);
  
  // Adicionar um retângulo de fundo para depuração apenas se estiver no modo debug
  if (currentContext.debugMode) {
    doc.rect(0, 0, currentContext.layoutDimensions.width, currentContext.layoutDimensions.height)
       .fillColor('#EEEEEE')
       .fill();
  }
  
  // Ordenar comandos por zIndex
  const sortedCommands = [...currentContext.renderCommands]
    .sort((a, b) => a.zIndex - b.zIndex);
  
  console.log("Comandos ordenados:", sortedCommands.length);
  
  // Aplicar cada comando ao documento PDF
  for (const command of sortedCommands) {
    console.log("Renderizando comando:", command.commandType, command.boundingBox);
    
    // Verificar se as dimensões são válidas
    const { x, y, width, height } = command.boundingBox;
    if (width <= 0 || height <= 0) {
      console.warn(`Ignorando elemento com dimensões inválidas: ${width}x${height}`);
      continue;
    }
    
    switch (command.commandType) {
      case RenderCommandType.RECTANGLE:
        if (command.renderData.rectangle) {
          const { backgroundColor, cornerRadius } = command.renderData.rectangle;
          
          console.log(`Desenhando retângulo em (${x}, ${y}) com tamanho ${width}x${height}`);
          console.log(`Cor: rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})`);
          
          // Usar formato hexadecimal para compatibilidade
          const hexColor = colorToHex(backgroundColor);
          
          console.log(`Cor em hex: ${hexColor}`);
          
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
        break;
      
      case RenderCommandType.CIRCLE:
        if (command.renderData.circle) {
          const { backgroundColor } = command.renderData.circle;
          const radius = width / 2;
          
          console.log(`Desenhando círculo em (${x}, ${y}) com raio ${radius}`);
          
          // Usar formato hexadecimal para compatibilidade
          const hexColor = colorToHex(backgroundColor);
          
          doc.fillColor(hexColor)
             .fillOpacity(backgroundColor.a / 255)
             .circle(x + radius, y + radius, radius)
             .fill();
        }
        break;
        
      case RenderCommandType.TEXT:
        if (command.renderData.text) {
          const { content, color, fontSize } = command.renderData.text;
          
          console.log(`Desenhando texto em (${x}, ${y}): "${content.map(segment => segment.text).join('')}"`);
          console.log(`Fonte: ${fontSize}px, Cor: rgb(${color.r}, ${color.g}, ${color.b})`);
          
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
        break;
    }
  }
  
  // Desenhar bordas nos elementos para depuração como último passo multipass
  if (currentContext.debugMode) {
    console.log("Desenhando bordas de depuração como último passo do multipass (modo debug ativado)");

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