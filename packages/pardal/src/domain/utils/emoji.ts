import { Buffer } from "~/polyfills";
import { ptToPx } from "./size";

export interface EmojiPosition {
  emoji: string;
  x: number;
  y: number;
}

/**
 * Recupera uma imagem PNG para um dado emoji do projeto Noto Emoji font.
 * Esta função existe para fornecer renderização de emoji de alta qualidade em PDFs,
 * onde o suporte nativo a emoji é limitado. Ela busca imagens de emoji pré-renderizadas
 * para garantir aparência consistente em todas as plataformas.
 * @param emoji - O caractere emoji para obter o PNG
 * @returns Um Buffer contendo a imagem PNG, ou null se não encontrado
 */
export const getEmojiPng = async (emoji: string) => {
  try {
    const codePoints = [...emoji]
      .map((c) => c.codePointAt(0)?.toString(16).padStart(4, "0"))
      .filter((cp) => cp && cp.toLowerCase() !== "fe0f"); // Remove variation selector-16

    const fileName = `emoji_u${codePoints.join("_")}.png`;
    const url = `https://raw.githubusercontent.com/googlefonts/noto-emoji/refs/heads/main/png/72/${fileName}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Emoji não encontrado: ${emoji} (${fileName})`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.warn(`Erro ao carregar emoji: ${emoji}`, error);
    return null;
  }
};

/**
 * Divide texto em um array de segmentos de emoji e não-emoji.
 * Esta função existe para permitir o tratamento adequado de conteúdo misto de texto e emoji,
 * possibilitando diferentes estratégias de renderização para cada tipo de conteúdo.
 * @param text - O texto para dividir
 * @returns Array de segmentos de texto, onde cada segmento é um emoji ou texto regular
 */
export const splitByEmoji = (text: string) => {
  const segmenter = new Intl.Segmenter("pt-BR", { granularity: "grapheme" });
  const segments = Array.from(segmenter.segment(text), ({ segment }) => segment);

  const parts: string[] = [];
  let currentText = "";

  for (const segment of segments) {
    if (isEmoji(segment)) {
      if (currentText) {
        parts.push(currentText);
        currentText = "";
      }
      parts.push(segment);
    } else {
      currentText += segment;
    }
  }

  if (currentText) {
    parts.push(currentText);
  }

  return parts;
};

/**
 * Determina se um dado segmento de texto é um emoji.
 * Esta função existe para fornecer detecção precisa de emoji, incluindo casos especiais
 * que não são detectados pela detecção padrão de emoji Unicode.
 * @param text - O segmento de texto para verificar
 * @returns True se o texto é um emoji, false caso contrário
 */
export const isEmoji = (text: string) => {
  const hasToForceEmoji = forceEmojis.indexOf(text) > -1;
  if (hasToForceEmoji) return true;

  const emojiRegex = /\p{Emoji_Presentation}/u;
  return emojiRegex.test(text);
};

/**
 * Renderiza um emoji em uma posição específica em um documento PDF.
 * Esta função existe para lidar com a tarefa complexa de incorporar imagens de emoji
 * de alta qualidade em PDFs mantendo alinhamento e dimensionamento adequados com o texto ao redor.
 * @param doc - O documento PDF para renderizar
 * @param emojiPosition - A posição e informações do emoji
 * @param emojiSize - Override opcional para o tamanho do emoji
 * @returns Promise<boolean> - true se renderizado com sucesso, false caso contrário
 */
export const renderEmoji = async (
  doc: PDFKit.PDFDocument,
  emojiPosition: EmojiPosition,
  emojiSize?: number
): Promise<boolean> => {
  try {
    const emojiPng = await getEmojiPng(emojiPosition.emoji);
    if (emojiPng) {
      doc.image(emojiPng as unknown as ArrayBuffer, emojiPosition.x, emojiPosition.y, {
        width: ptToPx(emojiSize || 16),
        height: ptToPx(emojiSize || 16),
      });
      return true;
    }
    console.warn(`Emoji não encontrado: ${emojiPosition.emoji}`);
    return false;
  } catch (error) {
    console.warn(`Erro ao renderizar emoji: ${emojiPosition.emoji}`, error);
    return false;
  }
};

/**
 * Remove todos os emojis de uma string de texto.
 * Esta função existe para criar versões limpas de conteúdo apenas com texto,
 * útil para operações que não suportam ou não precisam de caracteres emoji.
 * @param text - O texto para remover emojis
 * @returns O texto com todos os emojis removidos
 */
export const removeEmojis = (text: string) => {
  const parts = splitByEmoji(text);
  return parts.filter((part) => !isEmoji(part)).join("");
};

/**
 * Remove o número de um emoji de keycap.
 * Esta função existe para lidar com casos especiais onde emojis de keycap precisam
 * ser processados diferentemente de seus componentes numéricos.
 * @param text - O texto para processar
 * @returns O texto com números de keycap removidos se aplicável
 */
export const removeCapFromKeyCap = (text: string): string => {
  if (isKeyCap(text)) {
    return text.replace(/^[0-9]/, "");
  }
  return text;
};

/**
 * Verifica se um segmento de texto é um emoji de keycap.
 * Esta função existe para identificar caracteres emoji especiais baseados em números
 * que requerem tratamento específico no processamento de texto.
 * @param text - O texto para verificar
 * @returns True se o texto é um emoji de keycap, false caso contrário
 */
export const isKeyCap = (text: string) => {
  const keyCaps = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

  return keyCaps.indexOf(text) > -1;
};

/**
 * Lista de caracteres emoji que precisam ser forçados para renderização como emoji.
 * Esta constante existe porque alguns caracteres emoji podem ser renderizados como texto ou emoji,
 * e precisamos garantir renderização consistente como emoji para estes casos específicos.
 */
export const forceEmojis = [
  "1️⃣",
  "2️⃣",
  "3️⃣",
  "4️⃣",
  "5️⃣",
  "6️⃣",
  "7️⃣",
  "8️⃣",
  "9️⃣",
  "🔟",
  "⚙️",
  "©️",
  "®️",
  "‼️",
  "⁉️",
  "™️",
  "ℹ️",
  "↔️",
  "↕️",
  "↖️",
  "↗️",
  "↘️",
  "↙️",
  "↩️",
  "↪️",
  "⌨️",
  "⏏️",
  "⏭️",
  "⏮️",
  "⏯️",
  "⏱️",
  "⏲️",
  "⏸️",
  "⏹️",
  "⏺️",
  "Ⓜ️",
  "▪️",
  "▫️",
  "▶️",
  "◀️",
  "◻️",
  "◼️",
  "☀️",
  "☁️",
  "☂️",
  "☃️",
  "☄️",
  "☎️",
  "☑️",
  "☘️",
  "☝️",
  "☠️",
  "☢️",
  "☣️",
  "☦️",
  "☪️",
  "☮️",
  "☯️",
  "☸️",
  "☹️",
  "☺️",
  "♀️",
  "♂️",
  "♟️",
  "♠️",
  "♣️",
  "♥️",
  "♦️",
  "♨️",
  "♻️",
  "♾️",
  "⚒️",
  "⚔️",
  "⚕️",
  "⚖️",
  "⚗️",
  "⚛️",
  "⚜️",
  "⚠️",
  "⚧️",
  "⚰️",
  "⚱️",
  "⛈️",
  "⛏️",
  "⛑️",
  "⛓️",
  "⛩️",
  "⛰️",
  "⛱️",
  "⛴️",
  "⛷️",
  "⛸️",
  "⛹️",
  "✂️",
  "✈️",
  "✉️",
  "✌️",
  "✍️",
  "✏️",
  "✒️",
  "✔️",
  "✖️",
  "✝️",
  "✡️",
  "✳️",
  "✴️",
  "❄️",
  "❇️",
  "❣️",
  "❤️",
  "➡️",
  "⤴️",
  "⤵️",
  "⬅️",
  "⬆️",
  "⬇️",
  "〰️",
  "〽️",
  "㊗️",
  "㊙️",
  "🅰️",
  "🅱️",
  "🅾️",
  "🅿️",
  "🈂️",
  "🈷️",
  "🌡️",
  "🌤️",
  "🌥️",
  "🌦️",
  "🌧️",
  "🌨️",
  "🌩️",
  "🌪️",
  "🌫️",
  "🌬️",
  "🌶️",
  "🍽️",
  "🎖️",
  "🎗️",
  "🎙️",
  "🎚️",
  "🎛️",
  "🎞️",
  "🎟️",
  "🏋️",
  "🏌️",
  "🏍️",
  "🏎️",
  "🏔️",
  "🏕️",
  "🏖️",
  "🏗️",
  "🏘️",
  "🏙️",
  "🏚️",
  "🏛️",
  "🏜️",
  "🏝️",
  "🏞️",
  "🏟️",
  "🏳️",
  "🏵️",
  "🏷️",
  "🐿️",
  "👁️",
  "📽️",
  "🕉️",
  "🕊️",
  "🕯️",
  "🕰️",
  "🕳️",
  "🕴️",
  "🕵️",
  "🕶️",
  "🕷️",
  "🕸️",
  "🕹️",
  "🖇️",
  "🖊️",
  "🖋️",
  "🖌️",
  "🖍️",
  "🖐️",
  "🖥️",
  "🖨️",
  "🖱️",
  "🖲️",
  "🖼️",
  "🗂️",
  "🗃️",
  "🗄️",
  "🗑️",
  "🗒️",
  "🗓️",
  "🗜️",
  "🗝️",
  "🗞️",
  "🗡️",
  "🗣️",
  "🗨️",
  "🗯️",
  "🗳️",
  "🗺️",
  "🛋️",
  "🛍️",
  "🛎️",
  "🛏️",
  "🛠️",
  "🛡️",
  "🛢️",
  "🛣️",
  "🛤️",
  "🛳️",
];
