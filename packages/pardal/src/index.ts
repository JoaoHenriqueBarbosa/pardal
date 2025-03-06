import Pardal from "./pardal";
import { Sizing } from "./pardal/domain/layout/sizing";
import { Alignment } from "./pardal/domain/layout/alignment";
import { Padding } from "./pardal/domain/layout/padding";
import { ImageFitMode } from "./pardal/domain/model/types";
import { DefaultPDFKitFactory } from "./pardal/domain/model/pdfkit";
import { ConsoleLogger } from "./pardal/domain/utils/logger";
import { LogLevel } from "./pardal/domain/utils/logger";
import { NullLogger } from "./pardal/domain/utils/logger";

export { Sizing, Alignment, Padding, ImageFitMode };

// Exportações de funções auxiliares
export { measureWords, wrapTextIntoLines } from "./pardal/domain/layout/engine";

// Exportações de classes concretas
export { DefaultPDFKitFactory, ConsoleLogger, LogLevel, NullLogger };
export type { Logger } from "./pardal/domain/utils/logger";

export default Pardal;