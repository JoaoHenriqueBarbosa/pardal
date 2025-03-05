import "./styles.css";
import {
  renderToPDF,
  createPDFDocument,
  Sizing,
  beginLayout,
  endLayout,
  row,
  column,
  text,
  Alignment,
  TextAlignment,
  ImageFitMode
} from "./pardal";
import { Buffer } from "buffer";
import { image } from "./pardal/interface/element-helpers";
import { getCurrentContext } from "./pardal/domain/layout/context";
import { measureWords, wrapTextIntoLines } from "./pardal/domain/layout/engine";

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

const imageBuffer = await fetch("https://via.assets.so/game.png").then((res) =>
  res.arrayBuffer()
);

// Iniciar o layout
beginLayout();

// Exemplo de obtenção das medidade de um texto quebrado em linhas

const fontSize = 16;
const containerWidth = 500;
const words = measureWords("Este é um exemplo de texto quebrado em linhas. Ele é longo o suficiente para quebrar em várias linhas.", fontSize);
const lines = wrapTextIntoLines("Este é um exemplo de texto quebrado em linhas. Ele é longo o suficiente para quebrar em várias linhas.", words, containerWidth, fontSize);
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
        height: Sizing.fit(200, 600),
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
            text("**Início em negrito** e depois normal e *final em itálico*", {
              width: Sizing.grow(),
              fontSize: 14,
              fillColor: colors.purple,
              textAlignment: TextAlignment.LEFT,
            });

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

            // Exemplo com cantos arredondados
            image(
              `data:image/png;base64,${Buffer.from(imageBuffer).toString(
                "base64"
              )}`,
              {
                width: Sizing.fixed(100),
                height: Sizing.fixed(100),
                fit: ImageFitMode.COVER,
                cornerRadius: 15,
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

if (getCurrentContext().debugMode) {
      console.log("Elementos criados, finalizando o layout");
    }

// Finalizar o layout e obter comandos de renderização
const commands = endLayout();
if (getCurrentContext().debugMode) {
      console.log(
  `Layout finalizado com ${commands.length} comandos de renderização`
);
}

// Renderizar toda a árvore no documento PDF
renderToPDF(doc);

if (getCurrentContext().debugMode) {
      console.log("Renderização do PDF concluída");
    }

// Finalizar o documento
doc.end();

// Código para exibir o PDF no iframe
let pdfUrl = "";
const pdfBuffers: Buffer[] = [];
doc.on("data", pdfBuffers.push.bind(pdfBuffers));
doc.on("end", () => {
  const pdfBuffer = Buffer.concat(pdfBuffers);
  const blob = new Blob([pdfBuffer], { type: "application/pdf" });
  pdfUrl = URL.createObjectURL(blob);

  if (getCurrentContext().debugMode) {
      console.log("PDF gerado e disponibilizado em URL");
    }

  // Exibir o PDF em um iframe
  const iframe = document.createElement("iframe");
  iframe.src = pdfUrl;
  iframe.width = "100%";
  iframe.height = "100%";
  iframe.style.border = "none";

  const container = document.getElementById("app");
  if (container) {
    container.innerHTML = "";
    container.appendChild(iframe);
    if (getCurrentContext().debugMode) {
      console.log("PDF exibido no iframe");
    }
  }
});
