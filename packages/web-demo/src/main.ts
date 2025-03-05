import "./styles.css";
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
  addPage,
  TextAlignment,
} from "pardal";
import { Buffer } from "buffer";

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

const loadImage = async () => {
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

  endLayout();

  await renderToPDF(doc);

  addPage(doc, {
    size: [595.28, 841.89],
  });

  column(
    {
      width: Sizing.grow(),
      height: Sizing.grow(),
    },
    () => {
      image(
        `data:image/png;base64,${Buffer.from(imageBuffer).toString("base64")}`,
        {
          width: Sizing.grow(),
          height: Sizing.grow(),
        }
      );
    }
  );

  // Finalizar o layout e renderizar o PDF
  endLayout();
  await renderToPDF(doc);

  doc.end();

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
    // Criar um blob e um URL para download
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    // Exibir o PDF em um iframe
    const iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.style.width = "100%";
    iframe.style.height = "90vh";
    iframe.style.border = "none";

    const appElement = document.getElementById("app");
    if (appElement) {
      // Adicionar um título
      const title = document.createElement("h1");
      title.textContent = "Pardal - PDF Demo";
      appElement.appendChild(title);

      // Adicionar um botão de download
      const downloadButton = document.createElement("a");
      downloadButton.href = url;
      downloadButton.download = "pardal-demo.pdf";
      downloadButton.textContent = "Download PDF";
      downloadButton.style.display = "inline-block";
      downloadButton.style.padding = "10px 15px";
      downloadButton.style.backgroundColor = colors.blue;
      downloadButton.style.color = colors.white;
      downloadButton.style.textDecoration = "none";
      downloadButton.style.borderRadius = "4px";
      downloadButton.style.margin = "10px 0";
      appElement.appendChild(downloadButton);

      // Adicionar o iframe com o PDF
      appElement.appendChild(iframe);
    }
  });
};

loadImage().catch(console.error);
