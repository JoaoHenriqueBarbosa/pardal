import Pardal from "./pardal";
import { Alignment } from "./pardal/domain/layout/alignment";
import { Padding } from "./pardal/domain/layout/padding";
import { Sizing } from "./pardal/domain/layout/sizing";
import { DefaultPDFKitFactory } from "./pardal/domain/model/pdfkit";
import { ImageFitMode } from "./pardal/domain/model/types";
import { TextAlignment } from "./pardal/domain/model/types";
import { ConsoleLogger } from "./pardal/domain/utils/logger";
import { LogLevel } from "./pardal/domain/utils/logger";
import { NullLogger } from "./pardal/domain/utils/logger";
import { Buffer } from "./polyfills/buffer";

export { Sizing, Alignment, Padding, ImageFitMode, TextAlignment };

// Exportações de funções auxiliares
export { measureWords, wrapTextIntoLines } from "./pardal/domain/layout/engine";

// Exportações de classes concretas
export { DefaultPDFKitFactory, ConsoleLogger, LogLevel, NullLogger };
export type { Logger } from "./pardal/domain/utils/logger";

// Polyfills
export { Buffer };

export default Pardal;
