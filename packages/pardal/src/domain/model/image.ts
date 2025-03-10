import { Buffer } from "../../polyfills/buffer";

/**
 * Interface para manipulação de imagens
 * Define as operações básicas que qualquer implementação deve fornecer
 */
export interface ImageProcessor {
  /**
   * Converte uma imagem para o formato PNG
   * @param buffer Buffer da imagem de entrada
   * @returns Promise com o buffer da imagem processada em PNG
   */
  toPng(buffer: Buffer): Promise<Buffer>;

  getAvgRGBValuesToArea(buffer: Buffer, area: { x: number; y: number, width: number, height: number }): Promise<{ r: number; g: number; b: number }>;
}

/**
 * Interface para a factory de ImageProcessor
 */
export interface ImageFactory {
  /**
   * Cria uma instância do processador de imagens
   * @returns Uma instância de ImageProcessor
   */
  createProcessor(): ImageProcessor;
}

/**
 * Implementação do processador de imagens usando Sharp
 * Esta implementação será usada apenas se Sharp estiver disponível
 */
export class SharpImageProcessor implements ImageProcessor {
  private getSharp() {
    try {
      return require("sharp");
    } catch (error) {
      throw new Error(
        'Sharp não está disponível. Instale-o com "npm install sharp" ou use uma implementação alternativa'
      );
    }
  }

  async toPng(buffer: Buffer): Promise<Buffer> {
    const sharp = this.getSharp();
    return sharp(buffer).png().toBuffer();
  }

  async getAvgRGBValuesToArea(buffer: Buffer, area: { x: number; y: number, width: number, height: number }): Promise<{ r: number; g: number; b: number }> {
    const sharp = this.getSharp();
    
    try {
      // Get image metadata
      const metadata = await sharp(buffer).metadata();
      
      // Ensure parameters are valid
      const left = Math.max(0, Math.round(area.x));
      const top = Math.max(0, Math.round(area.y));
      
      // Ensure width and height are positive and don't exceed image boundaries
      const width = Math.max(1, Math.min(
        Math.round(area.width),
        metadata.width ? metadata.width - left : area.width
      ));
      
      const height = Math.max(1, Math.min(
        Math.round(area.height),
        metadata.height ? metadata.height - top : area.height
      ));
      
      // Skip extraction if area is invalid
      if (width <= 0 || height <= 0 || left >= (metadata.width || 0) || top >= (metadata.height || 0)) {
        // Return black if extraction area is invalid
        return { r: 0, g: 0, b: 0 };
      }
      
      // Extract the specified area with validated parameters
      const extractedBuffer = await sharp(buffer)
        .extract({ 
          left, 
          top, 
          width, 
          height 
        })
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      const { data, info } = extractedBuffer;
      const pixelCount = info.width * info.height;
      
      // Sum all RGB values in the buffer
      let r = 0;
      let g = 0;
      let b = 0;
      
      for (let i = 0; i < data.length; i += 3) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }
      
      // Return average values
      return {
        r: Math.round(r / pixelCount),
        g: Math.round(g / pixelCount),
        b: Math.round(b / pixelCount)
      };
    } catch (error) {
      console.error("Error in getAvgRGBValuesToArea:", error);
      // Return black as fallback
      return { r: 0, g: 0, b: 0 };
    }
  }
}

/**
 * Implementação do processador de imagens para ambiente browser usando Canvas
 */
export class CanvasImageProcessor implements ImageProcessor {
  private createCanvas(width: number, height: number): HTMLCanvasElement {
    if (typeof window === "undefined") {
      throw new Error("CanvasImageProcessor só pode ser usado em ambiente browser");
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  private getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Falha ao obter contexto 2D do canvas");
    }
    return ctx;
  }

  private async loadImage(buffer: Buffer): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const blob = new Blob([buffer]);
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Falha ao carregar imagem"));
      };

      img.src = url;
    });
  }

  private canvasToBuffer(canvas: HTMLCanvasElement, mimeType: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Falha ao converter canvas para blob"));
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          if (!reader.result) {
            reject(new Error("Falha ao ler resultado"));
            return;
          }

          const arrayBuffer = reader.result as ArrayBuffer;
          // Usar type assertion para evitar o erro de tipo
          resolve(Buffer.from(arrayBuffer) as unknown as Buffer);
        };

        reader.onerror = () => {
          reject(new Error("Falha ao ler blob"));
        };

        reader.readAsArrayBuffer(blob);
      }, mimeType);
    });
  }

  async toPng(buffer: Buffer): Promise<Buffer> {
    const img = await this.loadImage(buffer);
    const canvas = this.createCanvas(img.width, img.height);
    const ctx = this.getContext(canvas);

    ctx.drawImage(img, 0, 0);

    return this.canvasToBuffer(canvas, "image/png");
  }

  async getAvgRGBValuesToArea(buffer: Buffer, area: { x: number; y: number, width: number, height: number }): Promise<{ r: number; g: number; b: number }> {
    const img = await this.loadImage(buffer);
    const canvas = this.createCanvas(img.width, img.height);
    const ctx = this.getContext(canvas);
    
    // Draw the image onto the canvas
    ctx.drawImage(img, 0, 0);
    
    // Extract the pixel data from the specified area
    const imageData = ctx.getImageData(area.x, area.y, area.width, area.height);
    const data = imageData.data;
    
    // Calculate the sum of RGB values
    let r = 0;
    let g = 0;
    let b = 0;
    
    // The data array contains R,G,B,A values for each pixel (4 values per pixel)
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];       // R value
      g += data[i + 1];   // G value
      b += data[i + 2];   // B value
      // We ignore the Alpha channel (data[i + 3])
    }
    
    // Calculate average values
    const pixelCount = area.width * area.height;
    
    return {
      r: Math.round(r / pixelCount),
      g: Math.round(g / pixelCount),
      b: Math.round(b / pixelCount)
    };
  }
}

/**
 * Factory para criar processadores de imagem
 * Implementação padrão que usa Sharp quando disponível,
 * ou Canvas em ambiente browser
 */
export class DefaultImageFactory implements ImageFactory {
  createProcessor(): ImageProcessor {
    if (typeof window === "undefined") {
      try {
        // Tentativa leve de verificar se o Sharp está disponível
        require.resolve("sharp");
        return new SharpImageProcessor();
      } catch (error) {
        throw new Error(
          'Sharp não está disponível no ambiente Node.js. Instale-o com "npm install sharp" ou implemente uma alternativa usando "class MyImageProcessor implements ImageProcessor"'
        );
      }
    } else {
      // Em ambiente browser, usa Canvas
      return new CanvasImageProcessor();
    }
  }
}
