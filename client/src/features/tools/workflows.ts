import type { ComponentType } from 'react';
import type { ToolDef } from '@/lib/tools';
import { ImageToPdfWorkflow } from './imageToPdf/ImageToPdfWorkflow';
import { PdfToImageWorkflow } from './pdfToImage/PdfToImageWorkflow';
import { MergeWorkflow } from './merge/MergeWorkflow';
import { PageOpWorkflow } from './pageOps/PageOpWorkflow';
import { PdfOpWorkflow } from './pdfOp/PdfOpWorkflow';
import { ImageOpWorkflow } from './imageOp/ImageOpWorkflow';
import { DocumentWorkflow } from './documentOp/DocumentWorkflow';
import { RequestSignatureWorkflow } from './requestSignature/RequestSignatureWorkflow';

export interface WorkflowMap {
  imageToPdf: ComponentType<{ tool: ToolDef }>;
  pdfToImage: ComponentType<{ tool: ToolDef }>;
  merge: ComponentType<{ tool: ToolDef }>;
  pageOp: ComponentType<{ tool: ToolDef }>;
  pdfOp: ComponentType<{ tool: ToolDef }>;
  imageOp: ComponentType<{ tool: ToolDef }>;
  docOp: ComponentType<{ tool: ToolDef }>;
  office: ComponentType<{ tool: ToolDef }>;
  securityPdf: ComponentType<{ tool: ToolDef }>;
  aiDoc: ComponentType<{ tool: ToolDef }>;
  signatureRequest: ComponentType<{ tool: ToolDef }>;
}

export const WORKFLOWS: WorkflowMap = {
  imageToPdf: ImageToPdfWorkflow,
  pdfToImage: PdfToImageWorkflow,
  merge: MergeWorkflow,
  pageOp: PageOpWorkflow,
  pdfOp: PdfOpWorkflow,
  imageOp: ImageOpWorkflow,
  docOp: DocumentWorkflow,
  office: DocumentWorkflow,
  securityPdf: DocumentWorkflow,
  aiDoc: DocumentWorkflow,
  signatureRequest: RequestSignatureWorkflow,
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
    case 'image-op':
      return WORKFLOWS.imageOp;
    case 'docOp':
    case 'office':
    case 'securityPdf':
    case 'aiDoc':
      return WORKFLOWS.docOp;
    case 'signatureRequest':
      return WORKFLOWS.signatureRequest;
    default:
      return null;
  }
}
