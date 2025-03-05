// Exportações principais da biblioteca
export {
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
  ImageFitMode,
  addPage,
} from "./pardal";

// Exportação do componente image
export { image } from "./pardal/interface/element-helpers";

// Exportações de funções auxiliares
export { measureWords, wrapTextIntoLines } from "./pardal/domain/layout/engine";
export { getCurrentContext } from "./pardal/domain/layout/context"; 