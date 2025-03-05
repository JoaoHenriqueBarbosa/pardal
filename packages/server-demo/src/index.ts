/// <reference types="bun-types" />
import {
  renderToPDF,
  createPDFDocument,
  Sizing,
  beginLayout,
  endLayout,
  image,
  getCurrentContext,
  measureWords,
  wrapTextIntoLines,
  Alignment,
  ImageFitMode,
  column,
  row,
  text,
  TextAlignment,
} from "pardal";

async function getPDF() {
   // Definir algumas cores para usar no documento
   const colors = {
    white: "#FFFFFF",
    background: "#F7F9FA",
    skeleton: "#E1E8ED",
    skeletonDark: "#BDC5CD",
    blue: "#1DA1F2",
    gray: "#657786",
    border: "#EBEEF0",
    purple: "#800080",
  };

  // Criar um novo documento PDF
  const doc = createPDFDocument({
    // debug: true,
  });

  if (getCurrentContext().debugMode) {
    console.log("Documento PDF criado");
  }

  const imageBuffer = await fetch("https://via.assets.so/game.png").then(
    (res) => res.arrayBuffer()
  );

  // Iniciar o layout
  beginLayout();

  // Exemplo de obtenção das medidade de um texto quebrado em linhas
  const fontSize = 16;
  const containerWidth = 500;
  const words = measureWords(
    "Este é um exemplo de texto quebrado em linhas. Ele é longo o suficiente para quebrar em várias linhas.",
    fontSize
  );
  const lines = wrapTextIntoLines(
    "Este é um exemplo de texto quebrado em linhas. Ele é longo o suficiente para quebrar em várias linhas.",
    words,
    containerWidth,
    fontSize
  );
  console.log(lines);
  // Elemento principal
  image(
    `data:image/png;base64,${Buffer.from(imageBuffer).toString("base64")}`,
    {
      width: Sizing.grow(),
      height: Sizing.grow(),
      fillColor: colors.background,
      padding: 20,
      childAlignment: Alignment.center(),
      fit: ImageFitMode.COVER,
    },
    () => {
      // Container do Tweet - centralizado e com largura fixa
      column(
        {
          width: Sizing.fixed(500),
          height: Sizing.fit(),
          fillColor: colors.white,
          padding: 16,
          cornerRadius: 12,
          childGap: 12,
        },
        () => {
          // Cabeçalho do tweet - avatar e informações do usuário
          row(
            {
              width: Sizing.grow(),
              height: Sizing.fit(),
              childGap: 12,
              fillColor: colors.white,
            },
            () => {
              // Avatar do usuário (círculo)
              image(
                `data:image/png;base64,${Buffer.from(imageBuffer).toString(
                  "base64"
                )}`,
                {
                  width: Sizing.fixed(48),
                  height: Sizing.fixed(48),
                  fit: ImageFitMode.COVER,
                  rounded: true,
                }
              );

              // Informações do usuário
              column(
                {
                  childGap: 0,
                  fillColor: colors.white,
                  id: "user-info-column",
                  childAlignment: Alignment.center(),
                  height: Sizing.grow(),
                },
                () => {
                  // Nome do usuário - agora usando texto
                  text("John Doe", {
                    fillColor: colors.gray,
                  });

                  // Handle/username - agora usando texto
                  text("@johndoe", {
                    fillColor: colors.blue,
                  });
                }
              );
            }
          );

          column(
            {
              childGap: 12,
              fillColor: colors.white,
              width: Sizing.grow(),
              padding: 4,
            },
            () => {
              // Texto do tweet - usando formatação Markdown
              text(
                "Este, é um exemplo de **texto em negrito** e *texto em itálico* usando Markdown no Pardal.",
                {
                  width: Sizing.grow(),
                  fillColor: colors.gray,
                  textAlignment: TextAlignment.LEFT,
                }
              );

              // Linha com estilos aninhados
              text(
                "Agora podemos ter **negrito com *itálico aninhado* dentro dele** e também *itálico com **negrito aninhado** dentro*.",
                {
                  width: Sizing.grow(),
                  fontSize: 18,
                  fillColor: colors.blue,
                  textAlignment: TextAlignment.CENTER,
                }
              );

              // Casos especiais de formatação
              text(
                "**Início em negrito** e depois normal e *final em itálico*",
                {
                  width: Sizing.grow(),
                  fontSize: 14,
                  fillColor: colors.purple,
                  textAlignment: TextAlignment.LEFT,
                }
              );

              // Exemplo com cantos arredondados
              image(
                `data:image/png;base64,${Buffer.from(imageBuffer).toString(
                  "base64"
                )}`,
                {
                  width: Sizing.grow(),
                  height: Sizing.fixed(200),
                  fit: ImageFitMode.COVER,
                  cornerRadius: 15,
                }
              );

              // Exemplo com formato quadrado
              image(
                `data:image/png;base64,${Buffer.from(imageBuffer).toString(
                  "base64"
                )}`,
                {
                  width: Sizing.fixed(100),
                  height: Sizing.fixed(100),
                  fit: ImageFitMode.COVER,
                }
              );

              // Exemplo com formato circular
              image(
                `data:image/png;base64,${Buffer.from(imageBuffer).toString(
                  "base64"
                )}`,
                {
                  width: Sizing.fixed(100),
                  height: Sizing.fixed(100),
                  fit: ImageFitMode.COVER,
                  rounded: true,
                }
              );
            }
          );
        }
      );
    }
  );

  // Finalizar o layout e renderizar o PDF
  endLayout();
  await renderToPDF(doc);

  // Finalizar o documento para iniciar o streaming
  doc.end();

  // Define the buffers array
  const buffers: Uint8Array[] = [];
  
  return new Promise<Uint8Array>((resolve) => {
    doc.on('data', (chunk: Uint8Array) => {
      buffers.push(chunk);
    });
    
    doc.on('end', () => {
      // Calcular o tamanho total dos buffers
      const totalLength = buffers.reduce((sum: number, buffer: Uint8Array) => sum + buffer.length, 0);
      
      // Criar um buffer único
      const combinedBuffer = new Uint8Array(totalLength);
      
      // Copiar cada buffer para o buffer combinado
      let offset = 0;
      for (const buffer of buffers) {
        combinedBuffer.set(buffer, offset);
        offset += buffer.length;
      }
      
      resolve(combinedBuffer);
    });
  });
}

const server = Bun.serve({
  port: 3001,
  async fetch(request: Request) {
   
    const pdfBytes = await getPDF();
    

    return new Response(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
      },
    });
  },
});

console.log(`Listening on ${server.url}`);
