import type { ComponentType } from 'react';
import type { ToolDef } from '@/lib/tools';
import { ImageToPdfWorkflow } from './imageToPdf/ImageToPdfWorkflow';
import { PdfToImageWorkflow } from './pdfToImage/PdfToImageWorkflow';
import { MergeWorkflow } from './merge/MergeWorkflow';
import { PageOpWorkflow } from './pageOps/PageOpWorkflow';
import { PdfOpWorkflow } from './pdfOp/PdfOpWorkflow';

export interface WorkflowMap {
  imageToPdf: ComponentType<{ tool: ToolDef }>;
  pdfToImage: ComponentType<{ tool: ToolDef }>;
  merge: ComponentType<{ tool: ToolDef }>;
  pageOp: ComponentType<{ tool: ToolDef }>;
  pdfOp: ComponentType<{ tool: ToolDef }>;
}

export const WORKFLOWS: WorkflowMap = {
  imageToPdf: ImageToPdfWorkflow,
  pdfToImage: PdfToImageWorkflow,
  merge: MergeWorkflow,
  pageOp: PageOpWorkflow,
  pdfOp: PdfOpWorkflow,
};

/** Resolve the workflow component for a tool's hyphenated `kind`, or null if none. */
export function workflowFor(kind: ToolDef['kind']): ComponentType<{ tool: ToolDef }> | null {
  switch (kind) {
    case 'image-to-pdf':
      return WORKFLOWS.imageToPdf;
    case 'pdf-to-image':
      return WORKFLOWS.pdfToImage;
    case 'merge':
      return WORKFLOWS.merge;
    case 'page-op':
      return WORKFLOWS.pageOp;
    case 'pdfOp':
      return WORKFLOWS.pdfOp;
    default:
      return null;
  }
}