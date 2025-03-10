import type Pardal from "~/index";
import { Buffer } from "~/polyfills/buffer";
import { getFontForWord } from "~/domain/layout/engine";
import type { MeasuredWord } from "~/domain/model/element";
import type { PDFDocument } from "~/domain/model/pdfkit";
import { DEFAULT_FONTS } from "~/domain/model/types";
import type { CornerRadius, PardalContext } from "~/domain/model/types";
import { RenderCommandType } from "~/domain/rendering/commands";
import type { RenderCommand } from "~/domain/rendering/commands";
import { isEmoji, isKeyCap, renderEmoji } from "~/domain/utils/emoji";
import { ptToPx } from "~/domain/utils/size";

function getChildrenElementsRenderCommands(pardal: Pardal, parentId: string): RenderCommand[] {
  const currentContext = pardal.getContext();
  const parentElement = currentContext.layoutElements.find((element) => element.id === parentId);
  if (!parentElement) {
    return [];
  }

  // Array para armazenar todos os IDs dos elementos filhos (incluindo descendentes)
  const childElementIds: string[] = [];

  // Função recursiva para coletar IDs de todos os elementos filhos na árvore
  function collectChildIds(element: typeof parentElement) {
    if (!element) return;

    // Para cada filho direto do elemento atual
    for (const child of element.children) {
      // Adiciona o ID do filho à lista
      childElementIds.push(child.id);
      // Chama recursivamente para os filhos deste filho
      collectChildIds(child);
    }
  }

  // Inicia a coleta a partir do elemento pai
  collectChildIds(parentElement);

  // Filtra os comandos de renderização que correspondem aos IDs dos filhos
  return currentContext.renderCommands.filter((command) =>
    childElementIds.some(
      (childId) => command.id === childId || command.id.startsWith(`${childId}.`)
    )
  );
}

/**
 * Changes the text color of all text elements that are children of the specified parent element.
 * @param pardal The Pardal instance
 * @param parentIdOrCommands The ID of the parent element or array of render commands to modify
 * @param newColor The new color to apply to all text child elements, in hexadecimal format (e.g., "#FF0000")
 * @returns The number of text elements that were modified
 */
export function changeChildTextColor(
  pardal: Pardal, 
  childCommands: RenderCommand[], 
  newColor: string
): number {
  pardal.setRenderCommands(pardal.getContext().renderCommands.map((command) => {
    if (childCommands.some((child) => child.id === command.id) && command.commandType === RenderCommandType.TEXT && command.renderData.text) {
      command.renderData.text.color = newColor;
    }
    return command;
  }));
  
  return 0;
}

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
            if (command.id.startsWith("boxBlur")) {
              const childrenRenderCommands = getChildrenElementsRenderCommands(pardal, command.id);
              const spreadness = command.renderData.rectangle?.spreadness || 0;
              let textColor = backgroundColor;
              if (backgroundColor === "auto" && command.renderData.rectangle.source) {
                // Find the minimum and maximum coordinates to create a bounding box
                // that encompasses all children
                const minChildrenX = Math.min(
                  ...childrenRenderCommands.map((command) => command.boundingBox.x)
                );
                const minChildrenY = Math.min(
                  ...childrenRenderCommands.map((command) => command.boundingBox.y)
                );
                const maxChildrenRight = Math.max(
                  ...childrenRenderCommands.map((command) => command.boundingBox.x + command.boundingBox.width)
                );
                const maxChildrenBottom = Math.max(
                  ...childrenRenderCommands.map((command) => command.boundingBox.y + command.boundingBox.height)
                );

                // Calculate width and height of the full bounding box
                const totalWidth = maxChildrenRight - minChildrenX;
                const totalHeight = maxChildrenBottom - minChildrenY;

                const luminance = await currentContext.imageFactory
                  .createProcessor()
                  .getAvgRGBValuesToArea(command.renderData.rectangle.source, {
                    x: ptToPx(minChildrenX),
                    y: ptToPx(minChildrenY),
                    width: ptToPx(totalWidth),
                    height: ptToPx(totalHeight),
                  });
                
                // Use the W3C algorithm to determine the best contrast color
                // assuming luminance is in {r, g, b} format
                textColor = getContrastColor(luminance.r, luminance.g, luminance.b);
              }

              changeChildTextColor(pardal, childrenRenderCommands, textColor);

              const image = await createTextHighlightSvg(
                currentContext,
                childrenRenderCommands.map((command) => command.boundingBox),
                textColor === "#000000" ? "#FFFFFF" : "#000000",
                spreadness,
                width,
                height
              );

              doc
                .fillOpacity(command.renderData.rectangle?.opacity || 0.5)
                .image(image, x, y, {
                  width,
                  height,
                })
                .fillOpacity(1);
            } else {
              drawRectangle(
                currentContext,
                doc,
                x,
                y,
                width,
                height,
                backgroundColor,
                cornerRadius
              );
            }
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
 * Cria o svg para os destaques de texto
 * @param textAreas - As áreas de texto para criar destaques
 * @param contrastColor - A cor de contraste para os destaques
 * @returns Um buffer de imagem com os destaques
 */
export async function createTextHighlightSvg(
  context: PardalContext,
  textAreas: Array<{ x: number; y: number; width: number; height: number }>,
  contrastColor: string,
  spreadness: number,
  width: number,
  height: number
): Promise<Buffer> {
  // Criar um SVG para os destaques de texto na posição 0,0
  // Ordenar as áreas de texto por posição Y
  const textRects = textAreas
    .map((area) => ({
      x: ptToPx(area.x),
      y: ptToPx(area.y),
      width: ptToPx(area.width),
      height: ptToPx(area.height),
    }))
    .sort((a, b) => a.y - b.y);

  // Processar áreas adjacentes para ajustar sobreposições e lacunas
  for (let i = 0; i < textRects.length - 1; i++) {
    const currentArea = textRects[i];
    const nextArea = textRects[i + 1];

    // Calcular a base (y + height) da área atual e o topo da próxima
    const currentBottom = currentArea.y + currentArea.height;
    const nextTop = nextArea.y;

    // Verificar sobreposição ou lacuna
    if (currentBottom > nextTop) {
      // Caso de sobreposição: ajustar o meio-termo entre as áreas
      const midPoint = (currentArea.y + nextArea.y + currentArea.height) / 2;

      // Ajustar a altura da área atual para terminar no ponto médio
      currentArea.height = midPoint - currentArea.y;

      // Ajustar o início da próxima área para começar no ponto médio
      const heightDiff = nextTop - midPoint;
      nextArea.y = midPoint;
      nextArea.height -= heightDiff;
    } else if (currentBottom < nextTop) {
      // Caso de lacuna: estender a área atual para encontrar a próxima
      currentArea.height = nextTop - currentArea.y;
    }
    // Se currentBottom === nextTop, já estão perfeitamente alinhados, não precisa de ajuste
  }

  // Método alternativo: criar diretamente os caminhos SVG para cada retângulo e combiná-los
  let pathData = "";

  // Determinar as dimensões do SVG com base nos retângulos
  let svgMinX = Number.POSITIVE_INFINITY;
  let svgMinY = Number.POSITIVE_INFINITY;
  let svgMaxX = 0;
  let svgMaxY = 0;

  // Encontrar os limites do conteúdo
  for (const rect of textRects) {
    svgMinX = Math.min(svgMinX, rect.x);
    svgMinY = Math.min(svgMinY, rect.y);
    svgMaxX = Math.max(svgMaxX, rect.x + rect.width);
    svgMaxY = Math.max(svgMaxY, rect.y + rect.height);
  }

  // Calcular as dimensões do conteúdo e o offset necessário para centralização
  const contentWidth = svgMaxX - svgMinX;
  const contentHeight = svgMaxY - svgMinY;
  const offsetX = (ptToPx(width) - contentWidth) / 2;
  const offsetY = (ptToPx(height) - contentHeight) / 2;

  // Criar caminho para cada retângulo com coordenadas relativas à origem (0,0)
  for (const rect of textRects) {
    // Ajustar coordenadas para que comecem em (0,0)
    const x = rect.x - svgMinX;
    const y = rect.y - svgMinY;
    const width = rect.width;
    const height = rect.height;
    const rx = 12; // Raio para cantos arredondados
    const ry = 12;

    // Construir o caminho SVG otimizado para garantir o arredondamento correto
    // Usar a notação de arcos SVG: A rx ry x-axis-rotation large-arc-flag sweep-flag x y
    const rectPath = `
        M ${x + rx},${y}
        H ${x + width - rx}
        A ${rx} ${ry} 0 0 1 ${x + width} ${y + ry}
        V ${y + height - ry}
        A ${rx} ${ry} 0 0 1 ${x + width - rx} ${y + height}
        H ${x + rx}
        A ${rx} ${ry} 0 0 1 ${x} ${y + height - ry}
        V ${y + ry}
        A ${rx} ${ry} 0 0 1 ${x + rx} ${y}
        Z
      `
      .replace(/\n\s+/g, " ")
      .trim();

    pathData += rectPath;
  }

  // Criando o SVG com as dimensões aumentadas para incluir a sangria
  const textHighlightSvg = `<svg width="${ptToPx(width)}" height="${ptToPx(height)}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="gaussianBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="${spreadness}" />
        </filter>
      </defs>
      <g filter="url(#gaussianBlur)" transform="translate(${offsetX}, ${offsetY})">
        <path d="${pathData}" fill="${contrastColor}" />
      </g>
    </svg>`;

  // Converter o SVG para buffer
  const svgBuffer = Buffer.from(textHighlightSvg) as unknown as Buffer;
  const textHighlightOverlay = await context.imageFactory.createProcessor().toPng(svgBuffer);

  return textHighlightOverlay;
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
  source: Buffer,
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
  backgroundColor: string,
  cornerRadius?: number
): void {
  if (context.debugMode) {
    context.logger.debug(`Desenhando retângulo em (${x}, ${y}) com tamanho ${width}x${height}`);
  }
  if (context.debugMode) {
    context.logger.debug(`Cor: ${backgroundColor}`);
  }

  // Usar a cor diretamente
  const hexColor = backgroundColor;

  if (context.debugMode) {
    context.logger.debug(`Cor em hex: ${hexColor}`);
  }

  doc.fillColor(hexColor);

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
  backgroundColor: string
): void {
  const radius = width / 2;

  if (context.debugMode) {
    context.logger.debug(`Desenhando círculo em (${x}, ${y}) com raio ${radius}`);
  }

  // Usar a cor diretamente
  doc
    .fillColor(backgroundColor)
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
    context.logger.debug(`Fonte: ${fontSize}px, Cor: ${color}`);
  }

  // Atualizar para usar string diretamente
  const hexColor = color;

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
    configureTextAppearance(doc, fontFamily, fontSize, hexColor, rendered ? 0 : 1);

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
        configureTextAppearance(doc, segmentFont, fontSize, hexColor, rendered ? 0 : 1);

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

/**
 * Calculates color brightness according to W3C formula
 * @param r Red value (0-255)
 * @param g Green value (0-255)
 * @param b Blue value (0-255)
 * @returns Brightness value
 */
function calculateBrightness(r: number, g: number, b: number): number {
  return ((r * 299) + (g * 587) + (b * 114)) / 1000;
}

/**
 * Calculates color difference between two colors according to W3C formula
 * @param r1 Red value of first color (0-255)
 * @param g1 Green value of first color (0-255)
 * @param b1 Blue value of first color (0-255)
 * @param r2 Red value of second color (0-255)
 * @param g2 Green value of second color (0-255)
 * @param b2 Blue value of second color (0-255)
 * @returns Color difference value
 */
function calculateColorDifference(
  r1: number, g1: number, b1: number, 
  r2: number, g2: number, b2: number
): number {
  return (
    Math.max(r1, r2) - Math.min(r1, r2) +
    Math.max(g1, g2) - Math.min(g1, g2) +
    Math.max(b1, b2) - Math.min(b1, b2)
  );
}

/**
 * Determines the best contrast color (black or white) for a given background color
 * based on W3C accessibility guidelines
 * @param backgroundColor Background color in RGB format
 * @returns '#000000' for black or '#FFFFFF' for white
 */
function getContrastColor(r: number, g: number, b: number): string {
  // Calculate brightness of background color
  const bgBrightness = calculateBrightness(r, g, b);
  
  // Calculate brightness of black and white
  const blackBrightness = calculateBrightness(0, 0, 0); // 0
  const whiteBrightness = calculateBrightness(255, 255, 255); // 255
  
  // Calculate brightness difference with black and white
  const blackBrightnessDiff = Math.abs(bgBrightness - blackBrightness);
  const whiteBrightnessDiff = Math.abs(bgBrightness - whiteBrightness);
  
  // Calculate color difference with black and white
  const blackColorDiff = calculateColorDifference(r, g, b, 0, 0, 0);
  const whiteColorDiff = calculateColorDifference(r, g, b, 255, 255, 255);
  
  // According to W3C guidelines, good visibility requires:
  // 1. Brightness difference > 125
  // 2. Color difference > 500
  
  // Check if both black and white meet the criteria
  const blackMeetsCriteria = blackBrightnessDiff > 125 && blackColorDiff > 500;
  const whiteMeetsCriteria = whiteBrightnessDiff > 125 && whiteColorDiff > 500;
  
  // If both meet criteria, choose the one with greater brightness difference
  if (blackMeetsCriteria && whiteMeetsCriteria) {
    return blackBrightnessDiff > whiteBrightnessDiff ? '#000000' : '#FFFFFF';
  }
  
  // If only one meets criteria, use that one
  if (blackMeetsCriteria) return '#000000';
  if (whiteMeetsCriteria) return '#FFFFFF';
  
  // If neither meets both criteria, use the one with better brightness difference
  return bgBrightness > 127.5 ? '#000000' : '#FFFFFF';
}
