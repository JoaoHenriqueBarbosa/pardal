# Pardal

PDF Automatic Rendering Dynamic Access Library - Uma biblioteca para geração de PDFs utilizando layout moderno, inspirado em sistemas de layout flexbox.

## Inspiração

Pardal é fortemente inspirado na biblioteca [Clay](https://github.com/nicbarker/clay) desenvolvida por Nic Barker. Clay é uma poderosa biblioteca de layout 2D para interfaces de usuário com foco em alta performance, utilizando um modelo semelhante ao flexbox para criar layouts complexos e responsivos. Assim como Clay, Pardal adota uma abordagem declarativa para definição de layouts, mas aplicada especificamente para a geração de documentos PDF.

## Instalação

```bash
bun add pardal
```

ou

```bash
npm install pardal
```

## Uso Básico

```typescript
import { 
  createPDFDocument, 
  beginLayout, 
  endLayout, 
  text, 
  column, 
  row, 
  Sizing, 
  renderToPDF 
} from 'pardal';

// Criar um novo documento PDF
const doc = createPDFDocument();

// Iniciar o layout
beginLayout();

// Criar elementos
column({
  width: Sizing.grow(),
  height: Sizing.grow(),
  padding: 20,
  children: [
    text("Título do Documento", {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 20
    }),
    text("Este é um exemplo de texto no documento PDF.", {
      fontSize: 16
    })
  ]
});

// Finalizar o layout e renderizar o PDF
endLayout();
const pdfBytes = await renderToPDF(doc);

// Salvar ou exibir o PDF
// ...
```

## Exemplos Avançados

### Rich Text com Markdown e Alinhamento

O Pardal suporta formatação rica usando sintaxe Markdown simples, quebras de linha explícitas com `\n` e oferece controle preciso sobre o alinhamento do texto:

```typescript
import { 
  createPDFDocument, 
  beginLayout, 
  endLayout, 
  text, 
  column, 
  row, 
  Sizing,
  Alignment,
  renderToPDF 
} from 'pardal';

// Criar um novo documento PDF
const doc = createPDFDocument();

// Iniciar o layout
beginLayout();

// Criar elementos com texto formatado e alinhamento
column({
  width: Sizing.grow(),
  height: Sizing.grow(),
  padding: 40,
  children: [
    // Título centralizado
    text("Relatório Anual 2023", {
      fontSize: 28,
      textAlign: Alignment.CENTER,
      marginBottom: 20
    }),
    
    // Texto com formatação markdown centralizado
    text("Este é um exemplo de **texto em negrito** e *texto em itálico* centralizado.", {
      fontSize: 16,
      textAlign: Alignment.CENTER,
      marginBottom: 30
    }),
    
    // Texto com formatação markdown alinhado à direita
    text("Este parágrafo está alinhado à **direita** e demonstra a capacidade de *rich text* com múltiplos estilos.", {
      fontSize: 14,
      textAlign: Alignment.RIGHT,
      marginBottom: 20
    }),
    
    // Container com bordas
    row({
      padding: 20,
      backgroundColor: "#f5f5f5",
      cornerRadius: 8,
      children: [
        // Coluna com texto centralizado
        column({
          width: Sizing.percent(0.5),
          padding: 10,
          children: [
            text("**Coluna 1**", {
              fontSize: 16,
              textAlign: Alignment.CENTER,
              marginBottom: 10
            }),
            text("Texto de exemplo com **alinhamento centralizado** dentro de uma coluna.", {
              fontSize: 14,
              textAlign: Alignment.CENTER
            })
          ]
        }),
        
        // Coluna com texto alinhado à esquerda
        column({
          width: Sizing.percent(0.5),
          padding: 10,
          children: [
            text("**Coluna 2**", {
              fontSize: 16,
              textAlign: Alignment.CENTER,
              marginBottom: 10
            }),
            text("Texto de exemplo com **alinhamento à esquerda** dentro de uma coluna.", {
              fontSize: 14,
              textAlign: Alignment.LEFT
            })
          ]
        })
      ]
    })
  ]
});

// Finalizar o layout e renderizar o PDF
endLayout();
const pdfBytes = await renderToPDF(doc);
```

Este exemplo demonstra como o Pardal supera as limitações do PDFKit puro, permitindo:

- Alinhamento centralizado e à direita para texto com formatação mista
- Suporte a Markdown simples (`**negrito**` e `*itálico*`)
- Quebras de linha explícitas com `\n`
- Organização hierárquica de elementos com layout flexbox
- Controle preciso sobre espaçamento e aparência visual

## Características

- Layout flexível inspirado em sistemas modernos de UI, com arquitetura baseada no modelo de layout do Clay
- Sistema declarativo para definição de elementos e hierarquias
- Suporte a texto, imagens e elementos compostos
- Quebra automática de texto
- Posicionamento preciso de elementos
- API simples e intuitiva
- Modelo de layout similar ao flexbox para alinhamento, espaçamento e dimensionamento de elementos
- Desempenho otimizado para geração de documentos complexos

## Arquitetura Técnica

### Visão Geral do Algoritmo

Pardal implementa um sofisticado algoritmo de layout inspirado na biblioteca Clay. Seu funcionamento pode ser dividido em múltiplas etapas (multi-pass), onde cada etapa tem uma responsabilidade específica no processamento da hierarquia de elementos.

### Algoritmo de Árvore Reversa

O coração do sistema de layout do Pardal é um algoritmo de "árvore reversa" que opera em duas direções principais:

1. **Bottom-up (de baixo para cima)**: Primeira passagem onde calculamos as dimensões mínimas necessárias para cada elemento, começando pelas folhas da árvore (elementos sem filhos) e subindo até o elemento raiz.

2. **Top-down (de cima para baixo)**: Segunda passagem onde distribuímos o espaço disponível, começando do elemento raiz e descendo para os elementos filhos.

Este mecanismo bidirectional permite que os layouts sejam flexíveis e responsivos, respeitando as restrições de cada elemento.

```
Processamento de Árvore Reversa:

     [ROOT]                  ↑                      [ROOT]
     /    \                  │                      /    \
    /      \     1. Bottom   │      2. Top        /      \
   /        \      Up        │      Down         /        \
[COLUMN]  [TEXT]  (Min       │    (Distribuir  [COLUMN]  [TEXT]
  /  \      │    Dims)       │     Espaço)       /  \      │
 /    \     │                │                  /    \     │
[A]   [B]   [C]              │                [A]   [B]   [C]
                             │
Ordem de Processamento: ──────┘
  - Fase 1 (Bottom-Up): C → B → A → TEXT → COLUMN → ROOT
  - Fase 2 (Top-Down):  ROOT → COLUMN → TEXT → A → B → C
```

Neste processo:
1. Primeiro calculamos as dimensões mínimas necessárias para cada elemento, começando pelas folhas e subindo
2. Depois distribuímos o espaço disponível, considerando as restrições e preferências de layout, do topo para baixo

### Algoritmos de Travessia

O Pardal implementa uma combinação sofisticada de algoritmos para processar a hierarquia de elementos em seu sistema de layout. Estes algoritmos garantem que todos os elementos sejam processados na ordem correta durante as diferentes etapas do cálculo do layout:

1. **Depth-First Search (DFS)**

   O algoritmo DFS é utilizado na fase bottom-up para calcular as dimensões mínimas dos elementos:
   
   ```typescript
   function calculateElementMinimumDimensions(element: LayoutElement): void {
     // Primeiro processar todos os filhos (recursivamente)
     for (const child of element.children) {
       calculateElementMinimumDimensions(child);
     }
     
     // Em seguida, calcular as dimensões mínimas deste elemento
     calculateElementFitSize(element);
   }
   ```
   
   Este algoritmo é especialmente adequado para esta fase porque:
   - Garante que os filhos sejam completamente processados antes do pai
   - Permite uma abordagem recursiva natural para o cálculo de dimensões mínimas
   - Segue a lógica bottom-up necessária para determinar as dimensões mínimas com base no conteúdo

2. **Breadth-First Search (BFS)**

   O algoritmo BFS é utilizado em fases específicas do processamento de layout, especialmente para:
   
   - Ordenação de elementos para operações que precisam ver a árvore "por níveis"
   - Processamento de elementos por camadas para determinadas otimizações
   - Garantir que elementos no mesmo nível sejam processados antes de passar para o próximo nível
   
   A implementação do BFS utiliza filas para armazenar e processar elementos por camadas:
   
   ```
   Processo BFS simplificado:
   1. Iniciar com elementos raiz na fila
   2. Enquanto a fila não estiver vazia:
      a. Retirar o primeiro elemento da fila
      b. Processar o elemento
      c. Adicionar todos os filhos deste elemento à fila
   ```

3. **Algoritmo Híbrido para Distribuição de Espaço**

   Para a distribuição de espaço (fase top-down), o Pardal utiliza um algoritmo híbrido que:
   
   - Processa primeiro o nível atual (abordagem em largura)
   - Em seguida, processa recursivamente os filhos (abordagem em profundidade)
   
   ```typescript
   function distributeSpaceToChildren(parent: LayoutElement, isXAxis: boolean): void {
     // Processar o elemento atual e distribuir espaço entre seus filhos
     // ...código de distribuição de espaço...
     
     // Processar todos os filhos recursivamente (componente DFS)
     for (const child of parent.children) {
       distributeSpaceToChildren(child, isXAxis);
     }
   }
   ```

4. **Algoritmo de Posicionamento Final**

   O algoritmo de posicionamento final também segue uma abordagem top-down para calcular as coordenadas exatas de cada elemento no documento:
   
   ```typescript
   function positionElement(element: LayoutElement, position: Vector2): void {
     // Posicionar o elemento atual
     // ...código de posicionamento...
     
     // Calcular posições iniciais para elementos filhos com base na direção do layout
     // Para layouts em linha (Row):
     //   Posições x incrementam da esquerda para a direita
     // Para layouts em coluna (Column):
     //   Posições y incrementam de cima para baixo
     
     // Posicionar recursivamente todos os filhos
     for (const child of element.children) {
       positionElement(child, childPosition);
     }
   }
   ```

A combinação de diferentes algoritmos de travessia permite que o Pardal processe eficientemente layouts complexos, garantindo resultados precisos e consistentes mesmo para documentos com estruturas hierárquicas profundas.

### Múltiplas Passagens (Multi-Pass)

O algoritmo de layout do Pardal utiliza um sistema de múltiplas passagens (multi-pass) para calcular o layout final:

1. **Fase de Inicialização**: Configura o elemento raiz com as dimensões do documento.

2. **Cálculo de Dimensões Mínimas**: Primeira passagem bottom-up que determina o tamanho mínimo necessário para cada elemento, considerando seu conteúdo, padding e outras restrições.

3. **Distribuição de Espaço no Eixo X**: Calcula e distribui o espaço horizontal disponível para os elementos.

4. **Processamento de Quebra de Texto**: Uma fase intermediária crucial onde o texto é quebrado em linhas com base nas larguras dos containers já definidas.

5. **Recálculo de Dimensões Mínimas**: Após o processamento de texto, as dimensões mínimas são recalculadas, já que a quebra de texto pode alterar a altura necessária.

6. **Distribuição de Espaço no Eixo Y**: Calcula e distribui o espaço vertical disponível para os elementos.

7. **Posicionamento Final e Geração de Comandos**: Determina a posição exata de cada elemento no documento e gera os comandos de renderização apropriados.

### Processamento de Texto e Rich Text

Uma das características mais poderosas do Pardal é o seu sistema avançado de processamento de texto que utiliza algoritmos específicos para cada etapa:

1. **Análise de Markdown com Tokenização**:
   - O parser Markdown implementa um algoritmo simples de tokenização que identifica estilos básicos no texto
   - Cada token é classificado com base em dois padrões de formatação: `**negrito**` e `*itálico*`
   - Suporte para quebras de linha explícitas com o caractere `\n`
   - A implementação processa o texto para preservar estas propriedades de formatação
   ```typescript
   export function parseMarkdownText(text: string): MeasuredWord[] {
     // Processamento de tokens de formatação
     // Suporte atual apenas para: **negrito** e *itálico*
     // Retorna array de palavras com propriedades de formatação
   }
   ```

2. **Algoritmo de Medição de Palavras**:
   - Cada palavra é processada para determinar suas dimensões exatas
   - O algoritmo carrega a fonte apropriada com base nas propriedades de formatação
   - Uma instância PDFKit temporária é utilizada para calcular as dimensões precisas
   ```typescript
   export function measureWords(text: string, fontSize: number = 16): MeasuredWord[] {
     // Cria instância temporária do PDFKit para medições
     // Para cada palavra, determina a fonte correta baseada em suas propriedades
     // Mede precisamente largura/altura usando o PDFKit e armazena os resultados
   }
   ```

3. **Algoritmo de Quebra de Linha (Line Breaking)**:
   - Implementa o algoritmo "greedy line breaking" para determinar onde quebrar linhas
   - Mantém palavras inteiras, sem quebrar no meio de uma palavra
   - Respeita quebras de linha explícitas indicadas pelo caractere `\n`
   - Considera o espaço disponível no container e as dimensões de cada palavra
   ```typescript
   export function wrapTextIntoLines(
     text: string, 
     words: MeasuredWord[], 
     containerWidth: number,
     fontSize: number = 16
   ): WrappedTextLine[] {
     // Inicializa estruturas para armazenar linhas
     // Percorre as palavras medidas, acumulando-as em linhas
     // Quebra uma linha quando a próxima palavra ultrapassaria a largura do container
     // Retorna array de linhas com suas palavras e dimensões
   }
   ```

4. **Algoritmo de Posicionamento e Alinhamento**:
   - Cada linha é posicionada verticalmente com base em seu lineHeight
   - O alinhamento horizontal (left, center, right) é calculado precisamente:
     - LEFT: posiciona no início da linha (padrão)
     - CENTER: calcula (containerWidth - lineWidth) / 2
     - RIGHT: calcula containerWidth - lineWidth - padding
   - Para cada palavra em uma linha, calcula a posição exata considerando:
     - Posição da linha
     - Alinhamento da linha
     - Largura da palavra
     - Espaçamento entre palavras
   
   ```
   Algoritmo de posicionamento (simplificado):
   1. Para cada linha de texto:
      a. Determinar posição Y com base na altura da linha anterior
      b. Calcular offset X com base no alinhamento (left, center, right)
      c. Para cada palavra na linha:
         - Definir fonte apropriada com base em propriedades (bold, italic)
         - Definir posição X atual + offset calculado
         - Renderizar palavra
         - Incrementar posição X pela largura da palavra + espaçamento
   ```

5. **Otimização com Cache de Medições**:
   - Implementa um sistema de cache para evitar medir repetidamente as mesmas palavras
   - Usa uma tabela hash para armazenar resultados de medições anteriores
   - A chave de cache combina texto, tamanho de fonte e propriedades de estilo
   - Reduz significativamente o tempo de processamento em documentos com texto repetido

O processamento de texto do Pardal representa um equilíbrio entre precisão e performance, permitindo formatação rica enquanto mantém um desempenho excelente mesmo em documentos com grande quantidade de texto.

### Abordagem Diferencial em Relação ao PDFKit

O Pardal utiliza uma abordagem fundamentalmente diferente do PDFKit para gerenciar o layout e renderização de documentos:

1. **Arquitetura de Renderização em Camadas**:
   - **PDFKit**: Modelo imperativo direto - comandos de desenho são executados na ordem em que são chamados, sem abstração de layout
   - **Pardal**: Arquitetura em três camadas:
     - **Camada Declarativa**: Define hierarquias e configurações de elementos
     - **Camada de Layout**: Processa a árvore de elementos, calcula dimensões e posições
     - **Camada de Renderização**: Traduz elementos posicionados em comandos PDFKit

2. **Sistema de Coordenadas Independente**:
   - O Pardal implementa seu próprio sistema de coordenadas virtual que:
     - Permite medir e posicionar elementos antes da renderização
     - Suporta alinhamentos complexos (centro, direita, justificado)
     - Facilita o cálculo de layouts responsivos com base nas dimensões reais do conteúdo

3. **Pipeline de Renderização Otimizado**:
   ```
   ┌────────────────┐    ┌────────────────┐    ┌────────────────┐    ┌────────────────┐
   │  Declaração    │ → │ Processamento  │ → │  Geração de    │ → │  Renderização  │
   │  de Elementos  │    │   de Layout    │    │   Comandos     │    │     Final      │
   └────────────────┘    └────────────────┘    └────────────────┘    └────────────────┘
   ```
   
   - **Fase 1**: Declaração - Construção da hierarquia de elementos
   - **Fase 2**: Processamento - Múltiplos passes para calcular e distribuir dimensões
   - **Fase 3**: Comandos - Geração de comandos de renderização abstratos
   - **Fase 4**: Renderização - Tradução dos comandos para chamadas PDFKit

4. **Gerenciamento de Contexto Avançado**:
   - Implementa um sistema de pilha de contexto para gerenciar o estado:
     ```typescript
     export function beginLayout(): void {
       // Inicia novo contexto de layout com pilha vazia para elementos
     }
     
     export function endLayout(): RenderCommand[] {
       // Finaliza contexto atual e gera comandos de renderização
     }
     ```
   - Permite operações de layout aninhadas e independentes
   - Facilita a criação de componentes reutilizáveis com escopo próprio

5. **Mecanismo de Z-index**:
   - Algoritmo que ordena elementos por profundidade para renderização:
     ```typescript
     // Classificar elementos por z-index antes da renderização
     renderCommands.sort((a, b) => a.zIndex - b.zIndex);
     ```
   - Permite sobreposição controlada de elementos
   - Resolve corretamente casos onde elementos com z-index menor contêm elementos com z-index maior

6. **Otimizações de Renderização**:
   - **Clipping Inteligente**: Evita renderizar elementos fora da área visível
   - **Renderização Condicional**: Pula elementos completamente transparentes 
   - **Batching de Operações**: Agrupa operações similares para reduzir chamadas à API do PDFKit

7. **Gerenciamento de Recursos**:
   - Sistema de referência para recursos como fontes e imagens
   - Carregamento sob demanda com descarregamento automático
   - Compartilhamento eficiente de recursos entre elementos similares

### Limitações do PDFKit e Soluções

O PDFKit, apesar de ser uma excelente biblioteca base para geração de PDFs, apresenta uma série de limitações técnicas que o Pardal supera através de algoritmos especializados:

1. **Problema de Alinhamento com Rich Text**:
   - **Limitação do PDFKit**: O PDFKit permite apenas centralizar texto de um único estilo por vez
   - **Causa Técnica**: PDFKit opera com "runs" de texto homogêneo, sem um mecanismo integrado para medir e alinhar fragmentos com estilos diferentes
   - **Solução do Pardal**: Implementa um algoritmo de renderização de texto em duas fases:
     ```
     Fase 1: Medição e Disposição
       1. Tokeniza o texto em palavras com propriedades de formatação (negrito ou itálico)
       2. Mede cada palavra individualmente considerando seu estilo específico
       3. Calcula a largura total de cada linha
       4. Determina o offset necessário para o alinhamento desejado
     
     Fase 2: Renderização Posicionada
       1. Para cada linha, aplica o offset de alinhamento
       2. Para cada palavra, aplica a fonte e estilo correspondentes
       3. Renderiza cada palavra na posição exata calculada
     ```

2. **Demonstração do Algoritmo de Centralização**:
   ```
   Texto original: "Texto com **negrito** e *itálico* centralizado"
   
   PDFKit tradicional (problema):
   +-----------------------------------------+
   |     Texto com negrito e itálico      |  <- Formatação perdida
   |                                      |     OU
   |  Texto com | negrito | e | itálico |     <- Alinhamento incorreto
   +-----------------------------------------+
   
   Algoritmo Pardal (solução):
   1. Tokenização:
      ["Texto", "com", "**negrito**", "e", "*itálico*", "centralizado"]
   
   2. Medição (px): 
      [30, 25, 45, 10, 40, 75]
   
   3. Largura total: 30+25+45+10+40+75+espaços = 240px
   
   4. Em container de 500px, offset = (500-240)/2 = 130px
   
   5. Renderização:
      +-----------------------------------------+
      |     Texto com negrito e itálico centralizado     |
      +-----------------------------------------+
                          ^ Formação preservada e corretamente centralizada
   ```

3. **Implementação da Solução para Rich Text Centralizado**:
   ```typescript
   // Trecho simplificado do algoritmo
   function renderRichTextLine(line: WrappedTextLine, boundingBox: BoundingBox, align: TextAlignment) {
     // Calcular largura total da linha
     const lineWidth = line.content.reduce((w, word) => w + word.width, 0);
     
     // Determinar offset base com base no alinhamento
     let offset = 0;
     if (align === TextAlignment.CENTER) {
       offset = (boundingBox.width - lineWidth) / 2;
     } else if (align === TextAlignment.RIGHT) {
       offset = boundingBox.width - lineWidth;
     }
     
     // Renderizar cada palavra na posição calculada
     let currentX = boundingBox.x + offset;
     for (const word of line.content) {
       // Aplicar a fonte correta para esta palavra
       const fontName = getFontForWord(word);
       pdfDoc.font(fontName);
       
       // Renderizar na posição exata
       pdfDoc.text(word.text, currentX, boundingBox.y);
       
       // Avançar para a posição da próxima palavra
       currentX += word.width + wordSpacing;
     }
   }
   ```

4. **Outros Desafios Superados**:
   - **Limitação de Flexbox**: PDFKit não inclui um sistema de layout flexbox nativo
   - **Quebra de Linha Manual**: PDFKit requer gerenciamento manual de quebras de linha para texto
   - **Nesting Limitado**: PDFKit é melhor para documentos "planos" em vez de estruturas profundamente aninhadas
   - **Posicionamento Absoluto**: PDFKit trabalha principalmente com coordenadas absolutas, tornando layouts responsivos difíceis

Esta abordagem permite ao Pardal criar documentos com formatação rica perfeitamente alinhados, superando uma das maiores limitações das bibliotecas tradicionais de geração de PDF.

## Desenvolvimento

Este projeto utiliza [Bun](https://bun.sh/) como ferramenta de desenvolvimento.

```bash
# Instalar dependências
bun install

# Executar em modo de desenvolvimento
bun run dev

# Gerar build
bun run build
```

## Licença

MIT 