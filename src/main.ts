import "./styles.css";
import {
  renderToPDF,
  createPDFDocument,
  Sizing,
  beginLayout,
  endLayout,
  row,
  column,
  circle,
  text,
  Alignment,
  TextAlignment,
} from "./pardal";
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

console.log("Iniciando aplicação");

// Criar um novo documento PDF
const doc = createPDFDocument({
  // debug: true,
});

console.log("Documento PDF criado");

// Iniciar o layout
beginLayout();

// Elemento principal
column(
  {
    width: Sizing.grow(),
    height: Sizing.grow(),
    fillColor: colors.background,
    padding: 20,
    childAlignment: Alignment.center(),
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
            circle({
              width: Sizing.fixed(48),
              height: Sizing.fixed(48),
              fillColor: colors.skeleton,
            });

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
              "Este, é um exemplo de **texto em negrito** e *texto em itálico* usando \nMarkdown no Pardal.",
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
          }
        );
      }
    );
  }
);

console.log("Elementos criados, finalizando o layout");

// Finalizar o layout e obter comandos de renderização
const commands = endLayout();
console.log(
  `Layout finalizado com ${commands.length} comandos de renderização`
);

// Renderizar toda a árvore no documento PDF
renderToPDF(doc);

console.log("Renderização do PDF concluída");

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

  console.log("PDF gerado e disponibilizado em URL");

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
    console.log("PDF exibido no iframe");
  }
});
