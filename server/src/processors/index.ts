import type { ProcessorKind } from '../config/toolRegistry.js';
import { imageToPdfProcessor } from './imageToPdfProcessor.js';
import { pdfToImageProcessor } from './pdfToImageProcessor.js';
import { mergePdfProcessor, pageOpsProcessor } from './pdfLibProcessors.js';
import { rotatePdfProcessor } from './rotatePdfProcessor.js';
import { overlayPdfProcessor } from './overlayPdfProcessor.js';
import { compressPdfProcessor } from './compressPdfProcessor.js';
import { imageOpProcessor } from './imageOpProcessor.js';
import { documentOpProcessor } from './documentOpProcessor.js';
import type { Processor } from './types.js';

/**
 * Maps a tool's `processor` kind to its implementation.
 * ExtENDING here (and in toolRegistry) is all that is needed to add a tool.
 */
const processByKind: Record<ProcessorKind, Processor> = {
  imageToPdf: imageToPdfProcessor,
  pdfToImage: pdfToImageProcessor,
  merge: mergePdfProcessor,
  pageOps: pageOpsProcessor,
  rotate: rotatePdfProcessor,
  overlay: overlayPdfProcessor,
  compress: compressPdfProcessor,
  imageOp: imageOpProcessor,
  documentOp: documentOpProcessor,
};

export function resolveProcessor(kind: ProcessorKind): Processor {
  const processor = processByKind[kind];
  if (!processor) {
    throw new Error(`No registered processor for kind "${kind}".`);
  }
  return processor;
}

export type { ProcessorContext, ProcessorInput, ProcessorOutput, ProcessorResult } from './types.js';