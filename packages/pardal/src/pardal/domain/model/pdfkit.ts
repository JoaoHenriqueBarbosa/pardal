import type PDFKit from 'pdfkit';

/**
 * Tipo para representar um documento PDF
 * Usamos any para evitar problemas com o tipo do PDFKit,
 * mas na prática isso vai representar uma instância de PDFKit
 */
export type PDFDocument = typeof PDFKit;

/**
 * Interface para a factory de PDFKit
 */
export interface PDFKitFactory {
  createDocument(options?: any): PDFDocument;
}

/**
 * Implementação padrão da factory de PDFKit
 * Essa implementação lida com ambientes Node.js e browser
 */
export class DefaultPDFKitFactory implements PDFKitFactory {
  createDocument(options?: any): PDFDocument {
    const PDFKit = this.getPDFKit();
    return new PDFKit(options);
  }
  
  private getPDFKit(): typeof PDFKit {
    if (typeof window === 'undefined') {
      // Ambiente Node.js - carregamos do pacote instalado
      return require('pdfkit');
    } else {
      // Ambiente browser - usamos o global
      return (window as any).PDFDocument;
    }
  }
}