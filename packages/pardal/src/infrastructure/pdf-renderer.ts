import type Pardal from "~/index";
import { Buffer } from "~/polyfills/buffer";
import { getFontForWord } from "~/domain/layout/engine";
import type { MeasuredWord } from "~/domain/model/element";
import type { PDFDocument } from "~/domain/model/pdfkit";
import { DEFAULT_FONTS } from "~/domain/model/types";
import type { CornerRadius, PardalContext } from "~/domain/model/types";
import { RenderCommandType } from "~/domain/rendering/commands";
import type { RenderCommand } from "~/domain/rendering/commands";
import { colorToHex } from "~/domain/utils/color";
import { isEmoji, isKeyCap, renderEmoji } from "~/domain/utils/emoji";

/**
 * Renderiza a árvore de comandos para um documento PDF
 * @returns ArrayBuffer contendo os bytes do PDF
 */
export async function renderToPDF(pardal: Pardal): Promise<ArrayBuffer> {
  const currentContext = pardal.getContext();

  // Usar factory do contexto em vez de criar instância diretamente
  const doc = currentContext.pdfKitFactory.createDocument({
    margins: { top: 0, left: 0, bottom: 0, right: 0 },
    size: [currentContext.layoutDimensions.width, currentContext.layoutDimensions.height],
    autoFirstPage: false, // Não crie a primeira página automaticamente
  });

  // Verificar se já temos comandos de renderização
  if (currentContext.renderCommands.length === 0) {
    if (currentContext.debugMode) {
      currentContext.logger.debug(
        "Nenhum comando de renderização encontrado, executando endLayout"
      );
    }
    throw new Error("Nenhum comando de renderização encontrado. Execute endLayout primeiro.");
  }

  if (currentContext.debugMode) {
    currentContext.logger.debug("Comandos de renderização:", currentContext.renderCommands.length);
  }
  if (currentContext.debugMode) {
    currentContext.logger.debug("Elementos:", currentContext.layoutElements.length);
  }

  // Agrupar comandos por pageId
  const commandsByPage = new Map<number, RenderCommand[]>();

  for (const command of currentContext.renderCommands) {
    if (!commandsByPage.has(command.pageId)) {
      commandsByPage.set(command.pageId, []);
    }
    commandsByPage.get(command.pageId)?.push(command);
  }

  if (currentContext.debugMode) {
    currentContext.logger.debug(`Número de páginas: ${commandsByPage.size}`);
  }

  // Ordenar pageIds para renderização em ordem
  const pageIds = Array.from(commandsByPage.keys()).sort((a, b) => a - b);

  // Renderizar cada página
  for (const pageId of pageIds) {
    // Adicionar nova página ao documento
    doc.addPage({
      size: [currentContext.layoutDimensions.width, currentContext.layoutDimensions.height],
      margins: { top: 0, left: 0, bottom: 0, right: 0 },
    });

    if (currentContext.debugMode) {
      currentContext.logger.debug(`Renderizando página ${pageId}`);
    }

    // Comandos para esta página, ordenados por Z-index
    const pageCommands = commandsByPage.get(pageId) || [];
    const sortedCommands = [...pageCommands].sort((a, b) => a.zIndex - b.zIndex);

    if (currentContext.debugMode) {
      currentContext.logger.debug(`Comandos para página ${pageId}: ${sortedCommands.length}`);
    }

    // Adicionar um retângulo de fundo para depuração apenas se estiver no modo debug
    if (currentContext.debugMode) {
      doc
        .rect(0, 0, currentContext.layoutDimensions.width, currentContext.layoutDimensions.height)
        .fillColor("#EEEEEE")
        .fill();
    }

    // Aplicar cada comando ao documento PDF
    for (const command of sortedCommands) {
      const { x, y, width, height } = command.boundingBox;

      switch (command.commandType) {
        case RenderCommandType.RECTANGLE:
          if (command.renderData.rectangle) {
            const { backgroundColor, cornerRadius } = command.renderData.rectangle;
            drawRectangle(currentContext, doc, x, y, width, height, backgroundColor, cornerRadius);
          }
          break;

        case RenderCommandType.CIRCLE:
          if (command.renderData.circle) {
            const { backgroundColor } = command.renderData.circle;
            drawCircle(currentContext, doc, x, y, width, backgroundColor);
          }
          break;

        case RenderCommandType.TEXT:
          if (command.renderData.text) {
            await drawText(currentContext, doc, command);
          }
          break;

        case RenderCommandType.IMAGE:
          if (command.renderData.image) {
            const { source, fit, opacity, cornerRadius, rounded } = command.renderData.image;
            drawImage(
              currentContext,
              doc,
              x,
              y,
              width,
              height,
              source,
              fit,
              opacity,
              cornerRadius,
              rounded
            );
          }
          break;
      }
    }

    // Desenhar bordas nos elementos para depuração
    if (currentContext.debugMode) {
      if (currentContext.debugMode) {
        currentContext.logger.debug(
          "Desenhando bordas de depuração como último passo do multipass (modo debug ativado)"
        );
      }

      // Aplicar bordas de depuração após todas as renderizações normais
      doc.strokeColor("#FF0000").lineWidth(1);

      // Iterar pelos comandos ordenados do mais externo para o mais interno
      // para garantir que os aninhados fiquem por cima visualmente
      for (const command of [...sortedCommands].reverse()) {
        const { x, y, width, height } = command.boundingBox;

        // Verificação adicional para garantir integridade das dimensões
        if (width <= 0 || height <= 0) {
          currentContext.logger.warn(
            `Ignorando retângulo de debug com dimensões inválidas: ${width}x${height}`
          );
          continue;
        }

        // Para elementos muito pequenos, garantir uma borda mínima visível
        if (width < 2 || height < 2) {
          currentContext.logger.warn(
            `Elemento muito pequeno para debug: ${width}x${height}, ajustando visualização`
          );

          // Desenhar com uma cor diferente para elementos muito pequenos
          doc.strokeColor("#0000FF");
        } else {
          doc.strokeColor("#FF0000");
        }

        // Para retângulos com corner radius, desenhe bordas arredondadas também
        if (
          command.commandType === RenderCommandType.RECTANGLE &&
          command.renderData.rectangle?.cornerRadius
        ) {
          doc.roundedRect(x, y, width, height, command.renderData.rectangle.cornerRadius).stroke();
        } else {
          doc.rect(x, y, width, height).stroke();
        }
      }
    }
  }

  doc.end();

  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];

    doc.on("data", (chunk: Uint8Array) => {
      chunks.push(chunk);
    });

    doc.on("end", () => {
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

      const pdfBytes = result.buffer;

      resolve(Buffer.from(pdfBytes));
    });

    doc.on("error", reject);
  });
}

/**
 * Desenha uma imagem no documento PDF
 */
function drawImage(
  context: PardalContext,
  doc: PDFDocument,
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
  if (context.debugMode) {
    context.logger.debug("Desenhando imagem");
  }
  if (context.debugMode) {
    context.logger.debug("Dimensões:", { x, y, width, height });
  }
  if (context.debugMode) {
    context.logger.debug("Fit:", fit);
  }
  if (context.debugMode) {
    context.logger.debug("Opacity:", opacity);
  }
  if (context.debugMode) {
    context.logger.debug("Corner Radius:", cornerRadius);
  }
  if (context.debugMode) {
    context.logger.debug("Rounded:", rounded);
  }

  try {
    // Salvar o estado do documento
    doc.save();

    // Aplicar clipping se necessário
    if (rounded) {
      // Para formato circular
      if (context.debugMode) {
        context.logger.debug("Aplicando clipping circular");
      }
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      const radius = Math.min(width, height) / 2;

      doc.circle(centerX, centerY, radius);
      doc.clip();
    } else if (cornerRadius) {
      // Para cantos arredondados
      if (context.debugMode) {
        context.logger.debug("Aplicando clipping com cantos arredondados");
      }

      // Normalizar cornerRadius se for um número simples
      const cr =
        typeof cornerRadius === "number"
          ? {
              topLeft: cornerRadius,
              topRight: cornerRadius,
              bottomLeft: cornerRadius,
              bottomRight: cornerRadius,
            }
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

      if (typeof radius === "number" && radius > 0) {
        doc.roundedRect(x, y, width, height, radius).clip();
      } else {
        // Fallback para retângulo normal se não tivermos raios válidos
        doc.rect(x, y, width, height).clip();
      }
    } else {
      // Clipping retangular padrão
      if (context.debugMode) {
        context.logger.debug("Aplicando clipping retangular padrão");
      }
      doc.rect(x, y, width, height).clip();
    }

    // Definir as opções com base no modo de ajuste
    const options: Record<string, string | number | number[]> = {};

    // Configurar o alinhamento padrão para centro
    options.align = "center";
    options.valign = "center";

    switch (fit) {
      case "FILL":
        // No modo FILL, definimos width e height diretamente
        options.width = width;
        options.height = height;
        break;

      case "CONTAIN":
        // No modo CONTAIN, usamos a opção fit do PDFKit
        options.fit = [width, height];
        break;

      case "COVER":
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
        Type: "ExtGState",
        CA: opacity,
        ca: opacity,
      });

      doc.page.ext_gstates[`Gs${opacity}`] = gs;
      doc.addContent(`/Gs${opacity} gs`);
    }
    // Desenhar a imagem
    if (context.debugMode) {
      context.logger.debug("Chamando doc.image com:", { x, y });
    }
    doc.image(source, x, y, options);
    if (context.debugMode) {
      context.logger.debug("Imagem desenhada com sucesso");
    }

    // Restaurar o estado do documento
    doc.restore();
  } catch (error) {
    context.logger.error("Erro ao renderizar imagem:", error);
  }
}

function drawRectangle(
  context: PardalContext,
  doc: PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  backgroundColor: { r: number; g: number; b: number; a: number },
  cornerRadius?: number
): void {
  if (context.debugMode) {
    context.logger.debug(`Desenhando retângulo em (${x}, ${y}) com tamanho ${width}x${height}`);
  }
  if (context.debugMode) {
    context.logger.debug(
      `Cor: rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})`
    );
  }

  // Usar formato hexadecimal para compatibilidade
  const hexColor = colorToHex(backgroundColor);

  if (context.debugMode) {
    context.logger.debug(`Cor em hex: ${hexColor}`);
  }

  doc.fillColor(hexColor).fillOpacity(backgroundColor.a / 255);

  if (cornerRadius) {
    // Se tiver cornerRadius, desenha com cantos arredondados
    doc.roundedRect(x, y, width, height, cornerRadius).fill();
  } else {
    // Sem cornerRadius, desenha um retângulo normal
    doc.rect(x, y, width, height).fill();
  }
}

function drawCircle(
  context: PardalContext,
  doc: PDFDocument,
  x: number,
  y: number,
  width: number,
  backgroundColor: { r: number; g: number; b: number; a: number }
): void {
  const radius = width / 2;

  if (context.debugMode) {
    context.logger.debug(`Desenhando círculo em (${x}, ${y}) com raio ${radius}`);
  }

  // Usar formato hexadecimal para compatibilidade
  const hexColor = colorToHex(backgroundColor);

  doc
    .fillColor(hexColor)
    .fillOpacity(backgroundColor.a / 255)
    .circle(x + radius, y + radius, radius)
    .fill();
}

// Helper function to handle emoji rendering
async function handleEmojiRendering(
  context: PardalContext,
  doc: PDFDocument,
  text: string,
  x: number,
  y: number,
  fontSize: number | undefined,
  font: string
): Promise<{ widthOfEmoji: number; rendered: boolean; isKeyCap: boolean }> {
  // Verificar se é um emoji
  if (!isEmoji(text)) {
    return { widthOfEmoji: 0, rendered: false, isKeyCap: false };
  }

  // Verificar se é um keycap
  const isKeyCapEmoji = isKeyCap(text);

  if (context.debugMode && isKeyCapEmoji) {
    context.logger.debug(`Emoji keycap detectado: "${text}"`);
  }

  const widthOfEmoji = doc
    .font(font)
    .fontSize(fontSize || 16)
    .widthOfString(text);

  // Verificar se devemos usar imagens para emojis
  if (context.debugMode) {
    context.logger.debug(
      `handleEmojiRendering: useImageForEmojis = ${context.useImageForEmojis}, emoji = ${text}`
    );
  }

  if (context.useImageForEmojis === false) {
    if (context.debugMode) {
      context.logger.debug(
        "Pulando renderização de emoji como imagem devido a useImageForEmojis = false"
      );
    }
    return { widthOfEmoji, rendered: false, isKeyCap: isKeyCapEmoji };
  }

  // Aplicar offsets para posicionamento
  let offsetX = widthOfEmoji / 8;
  let offsetY = widthOfEmoji / 8;

  // Verificar se é um keycap e aplicar offsets adicionais
  if (isKeyCapEmoji) {
    // Aplicar offsets adicionais específicos para keycaps
    offsetX += widthOfEmoji / 16;
    offsetY += widthOfEmoji / 16;
  }

  // Renderizar emoji usando função específica
  const renderSuccess = await renderEmoji(
    doc,
    {
      emoji: text,
      x: x + offsetX,
      y: y + offsetY,
    },
    widthOfEmoji
  );

  // Se não renderizou com sucesso, não consideramos como "rendered"
  // para que o texto original seja mostrado
  return { widthOfEmoji, rendered: renderSuccess, isKeyCap: isKeyCapEmoji };
}

// Helper function to configure font and text appearance
function configureTextAppearance(
  doc: PDFDocument,
  fontFamily: string,
  fontSize: number | undefined,
  hexColor: string,
  opacity: number
): void {
  doc
    .font(fontFamily)
    .fontSize(fontSize || 16)
    .fillColor(hexColor)
    .fillOpacity(opacity);
}

async function drawText(
  context: PardalContext,
  doc: PDFDocument,
  command: RenderCommand
): Promise<void> {
  if (!command.renderData.text) return;

  const { content, color, fontSize } = command.renderData.text;
  const correction = -((fontSize || 16) / 6);
  const { x, y, width, height } = command.boundingBox;

  if (context.debugMode) {
    context.logger.debug(
      `Desenhando texto em (${x}, ${y}): "${content.map((segment) => segment.text).join("")}"`
    );
    context.logger.debug(`Fonte: ${fontSize}px, Cor: rgb(${color.r}, ${color.g}, ${color.b})`);
  }

  // Usar formato hexadecimal para compatibilidade
  const hexColor = colorToHex(color);

  if (content.length === 0) return;

  // Se não houver segmentos com formatação, renderize normalmente
  if (content.length === 1) {
    const text = content[0].text;
    const fontFamily = getFontForWord(content[0], context.fonts || DEFAULT_FONTS) || "Helvetica";

    // Verificar se é um emoji
    const { rendered } = await handleEmojiRendering(
      context,
      doc,
      text,
      x,
      y,
      fontSize,
      context.fonts?.emoji || fontFamily
    );

    // Configurar aparência do texto
    configureTextAppearance(doc, fontFamily, fontSize, hexColor, rendered ? 0 : color.a / 255);

    // Renderizar o texto
    doc.text(text, x, y + correction, {
      width: width,
      height: height,
      align: "left",
    });

    if (rendered) {
      doc.fillOpacity(1);
    }
  } else {
    // Posição inicial para renderização
    let currentY = y;

    // Primeiro vamos medir e agrupar segmentos em linhas
    const lines: { segments: (MeasuredWord & { font: string })[]; y: number }[] = [
      { segments: [], y: currentY + correction },
    ];
    let lineIndex = 0;
    let lineWidth = 0;

    // Medir e organizar segmentos em linhas
    for (const segment of content) {
      // Determinar a fonte baseada no estilo
      const fontFamily = getFontForWord(segment, context.fonts || DEFAULT_FONTS) || "Helvetica";

      // Medir o texto com a fonte correta
      doc.font(fontFamily).fontSize(fontSize || 16);
      const segmentWidth = segment.width;

      // Verificar se o segmento cabe na linha atual
      if (lineWidth + segmentWidth > width && lineWidth > 0) {
        // Criar nova linha
        currentY += doc.currentLineHeight();
        lines.push({ segments: [], y: currentY + correction });
        lineIndex++;
        lineWidth = 0;
      }

      // Adicionar segmento à linha atual
      lines[lineIndex].segments.push({
        ...segment,
        font: fontFamily,
      });

      // Atualizar largura da linha
      lineWidth += segmentWidth;
    }

    // Agora renderizar linha por linha, segmento por segmento
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      let xPos = x;

      for (let segIndex = 0; segIndex < line.segments.length; segIndex++) {
        const segment = line.segments[segIndex];
        const isLastSegmentInLastLine =
          lineIndex === lines.length - 1 && segIndex === line.segments.length - 1;
        const isFirstSegmentInFirstLine = lineIndex === 0 && segIndex === 0;

        const segmentFont = isEmoji(segment.text) ? context.fonts?.emoji : segment.font;

        if (!segmentFont) {
          throw new Error(`Fonte não encontrada para o segmento: ${segment.text}`);
        }

        // Verificar se é um emoji
        const { rendered } = await handleEmojiRendering(
          context,
          doc,
          segment.text,
          xPos,
          line.y,
          fontSize,
          segmentFont
        );

        // Configurar aparência do texto
        configureTextAppearance(doc, segmentFont, fontSize, hexColor, rendered ? 0 : color.a / 255);

        if (isFirstSegmentInFirstLine) {
          doc.text(segment.text, xPos, line.y, {
            continued: true,
          });
        } else {
          doc.text(segment.text, doc.x, line.y, {
            continued: !isLastSegmentInLastLine,
          });
        }

        if (rendered) {
          doc.fillOpacity(1);
        }

        // Avançar a posição manual e explicitamente apenas se não for o último segmento
        if (!isLastSegmentInLastLine) {
          xPos += segment.width;
        }
      }
    }
  }
}
