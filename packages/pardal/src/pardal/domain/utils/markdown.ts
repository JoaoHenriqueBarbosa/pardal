import { MeasuredWord } from '../model/element';
/**
 * Processa um texto com formatação Markdown básica (negrito e itálico)
 * e retorna um array de segmentos de texto com suas propriedades.
 * 
 * Suporta:
 * - **texto** para negrito
 * - *texto* para itálico
 * - ***texto*** para negrito e itálico
 * 
 * @param text Texto com formatação Markdown
 * @returns Array de segmentos de texto com suas propriedades de estilo, onde cada palavra é um segmento separado
 */
export function parseMarkdownText(text: string): Partial<MeasuredWord>[] {
  if (!text) return [];
  
  // Se não há marcadores, retornar texto dividido em palavras
  // Note: este caso simples também preservará espaços nos resultados
  if (!text.includes('*')) {
    return text
      .match(/(\S+|\s+)/g)
      ?.map(word => ({ text: word, bold: false, italic: false })) || [];
  }
  
  // Implementação de máquina de estados para processamento de Markdown
  const segments: Partial<MeasuredWord>[] = [];
  
  // Estados da máquina
  let inBold = false;
  let inItalic = false;
  let currentText = '';
  
  // Função auxiliar para adicionar segmento atual
  const addCurrentSegment = () => {
    if (currentText) {
      segments.push({
        text: currentText,
        bold: inBold,
        italic: inItalic
      });
      currentText = '';
    }
  };
  
  // Processar caractere por caractere
  for (let i = 0; i < text.length; i++) {
    // Detectar marcadores Markdown
    if (text[i] === '*') {
      // Verificar se é negrito (dois asteriscos)
      if (i + 1 < text.length && text[i + 1] === '*') {
        // Finalizamos o segmento atual
        addCurrentSegment();
        
        // Alternar estado de negrito
        inBold = !inBold;
        
        // Pular o segundo asterisco
        i++;
        continue;
      }
      
      // É itálico (um asterisco)
      addCurrentSegment();
      
      // Alternar estado de itálico
      inItalic = !inItalic;
      continue;
    }
    
    // Texto normal
    currentText += text[i];
  }
  
  // Adicionar último segmento
  addCurrentSegment();
  
  // Remover marcadores não fechados e dividir em palavras
  return cleanSegments(segments);
}

/**
 * Limpa e corrige segmentos, removendo marcadores Markdown não fechados corretamente
 * e preserva os espaços como "palavras" individuais
 */
function cleanSegments(segments: Partial<MeasuredWord>[]): Partial<MeasuredWord>[] {
  // Primeiro limpamos os segmentos para remover marcadores que sobraram
  const cleanedSegments = segments.map(segment => {
    return {
      ...segment,
      // Remover possíveis marcadores Markdown que sobraram no texto
      text: (segment.text || '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
    };
  }).filter(segment => segment.text.length > 0);

  // Agora dividimos cada segmento preservando os espaços como palavras individuais
  const wordSegments: Partial<MeasuredWord>[] = [];
  
  for (const segment of cleanedSegments) {
    // Usamos regex para capturar tanto palavras quanto espaços como tokens separados
    // O regex (\S+|\s+) captura sequências de caracteres não-espaço OU sequências de espaços
    const tokens = segment.text.match(/(\S+|\s+)/g) || [];
    
    for (const token of tokens) {
      wordSegments.push({
        text: token,
        bold: segment.bold,
        italic: segment.italic
      });
    }
  }
  
  return wordSegments;
}

/**
 * Remove os marcadores Markdown do texto e retorna um array de palavras individuais
 */
export function stripMarkdown(text: string): string[] {
  const cleanText = text
    .replace(/\*\*/g, '')  // Remove **
    .replace(/\*/g, '');   // Remove *
  
  // Divide o texto em palavras individuais e remove espaços vazios
  return cleanText.split(/\s+/).filter(word => word.length > 0);
} 