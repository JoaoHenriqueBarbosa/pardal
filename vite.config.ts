import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Pardal',
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      // Certifique-se de externalizar dependências que não devem ser empacotadas
      external: [],
      output: {
        // Fornece variáveis globais para dependências externalizadas
        globals: {}
      }
    },
    sourcemap: true,
    // Garante que os arquivos de declaração TypeScript sejam gerados
    emptyOutDir: false,
  }
}); 