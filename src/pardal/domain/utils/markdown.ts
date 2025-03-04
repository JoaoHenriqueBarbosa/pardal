// Utilitários para processamento de texto Markdown
import { FontOptions } from "../model/types";

// Tipo de segmento de texto com estilo específico
export interface TextSegment {
  text: string;
  bold: boolean;
  italic: boolean;
}

/**
 * Processa um texto com formatação Markdown básica (negrito e itálico)
 * e o divide em segmentos com diferentes estilos, suportando estilos aninhados
 * 
 * @param text Texto com formatação Markdown
 * @returns Array de segmentos de texto com suas propriedades de estilo
 */
export function parseMarkdownText(text: string): TextSegment[] {
  if (!text) return [];
  
  // Se não há marcadores, retornar texto simples
  if (!text.includes('*')) {
    return [{ text, bold: false, italic: false }];
  }
  
  // Implementação de máquina de estados para processamento de Markdown
  const segments: TextSegment[] = [];
  
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
  
  // Remover marcadores não fechados (limpar o texto)
  return cleanSegments(segments);
}

/**
 * Limpa e corrige segmentos, removendo marcadores Markdown não fechados corretamente
 */
function cleanSegments(segments: TextSegment[]): TextSegment[] {
  const result = segments.map(segment => {
    return {
      ...segment,
      // Remover possíveis marcadores Markdown que sobraram no texto
      text: segment.text
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
    };
  });
  
  // Remover segmentos vazios e mesclar segmentos adjacentes do mesmo estilo
  const merged: TextSegment[] = [];
  let current: TextSegment | null = null;
  
  for (const segment of result) {
    // Pular segmentos vazios
    if (!segment.text.trim()) continue;
    
    if (!current) {
      current = { ...segment };
      merged.push(current);
      continue;
    }
    
    // Se o estilo for o mesmo, mesclar
    if (current.bold === segment.bold && current.italic === segment.italic) {
      current.text += segment.text;
    } else {
      // Senão, adicionar como novo segmento
      current = { ...segment };
      merged.push(current);
    }
  }
  
  return merged;
}

/**
 * Determina a fonte a ser usada com base nas propriedades de estilo
 */
export function getFontForSegment(
  segment: TextSegment, 
  fonts: FontOptions
): string {
  if (segment.bold && segment.italic) {
    return fonts.boldItalic || fonts.bold || fonts.regular || 'Helvetica-Bold';
  } else if (segment.bold) {
    return fonts.bold || fonts.regular || 'Helvetica-Bold';
  } else if (segment.italic) {
    return fonts.regularItalic || fonts.regular || 'Helvetica-Oblique';
  } else {
    return fonts.regular || 'Helvetica';
  }
}

/**
 * Remove os marcadores Markdown do texto
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, '')  // Remove **
    .replace(/\*/g, '');   // Remove *
} 