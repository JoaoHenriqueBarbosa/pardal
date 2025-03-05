import type PDFKit from 'pdfkit';
// Função para obter o PDFDocument (compatível com ambientes web e node)
function getPDFKit(): typeof PDFKit {
  if (typeof window === 'undefined') {
    // Ambiente Node.js - carregamos do pacote instalado
    return require('pdfkit');
  } else {
    // Ambiente browser - usamos o global
    return (window as any).PDFDocument;
  }
}

export const PDFDocument = getPDFKit();
export type PDFDocument = typeof PDFDocument;