/**
 * Single source of truth describing every tool the API accepts.
 *
 * The frontend nests a mirrored registry; these two must stay in sync. Keeping
 * the canonical copy here lets the upload route validate inputs declaratively
 * instead of switch-casing per tool.
 */

export type ProcessorKind =
  | 'imageToPdf'
  | 'pdfToImage'
  | 'merge'
  | 'pageOps'
  | 'rotate'
  | 'overlay'
  | 'compress';
export type AcceptedKind = 'pdf' | 'png' | 'jpeg' | 'webp';

export interface ToolConfig {
  id: string;
  processor: ProcessorKind;
  label: string;
  accepts: AcceptedKind[];
  minFiles: number;
  maxFiles: number;
  singleOutput: boolean;
  /** Merged into any options the client sends (a safe place to fix `op`/defaults). */
  defaultOptions: Record<string, unknown>;
}

type Registry = Record<string, ToolConfig>;

const baseImageToPdf = (id: string, label: string, ext: AcceptedKind): ToolConfig => ({
  id,
  processor: 'imageToPdf',
  label,
  accepts: (ext === 'jpeg' ? ['jpeg', 'png', 'webp'] : [ext]) as AcceptedKind[],
  minFiles: 1,
  maxFiles: 30,
  singleOutput: true,
  defaultOptions: { pageSize: 'A4', orientation: 'auto', margin: 'none', imageFit: 'fit', quality: 'standard' },
});

const basePdfToImage = (id: string, label: string, format: string): ToolConfig => ({
  id,
  processor: 'pdfToImage',
  label,
  accepts: ['pdf'],
  minFiles: 1,
  maxFiles: 1,
  singleOutput: false,
  defaultOptions: { mode: 'all', pages: [], format, quality: 82, scale: 2 },
});

export const toolRegistry: Registry = {
  'png-to-pdf': { ...baseImageToPdf('png-to-pdf', 'PNG to PDF', 'png'), accepts: ['png'] },
  'jpg-to-pdf': baseImageToPdf('jpg-to-pdf', 'JPG to PDF', 'jpeg'),
  'webp-to-pdf': baseImageToPdf('webp-to-pdf', 'WEBP to PDF', 'webp'),

  'pdf-to-jpg': basePdfToImage('pdf-to-jpg', 'PDF to JPG', 'jpg'),
  'pdf-to-png': basePdfToImage('pdf-to-png', 'PDF to PNG', 'png'),
  'pdf-to-webp': basePdfToImage('pdf-to-webp', 'PDF to WEBP', 'webp'),

  'merge-pdf': {
    id: 'merge-pdf',
    processor: 'merge',
    label: 'Merge PDF',
    accepts: ['pdf'],
    minFiles: 2,
    maxFiles: 30,
    singleOutput: true,
    defaultOptions: {},
  },

  'split-pdf': pageOpsTool('split-pdf', 'Split PDF', { op: 'split', every: 1 }),
  'extract-pages': pageOpsTool('extract-pages', 'Extract Pages', { op: 'extract' }),
  'delete-pages': pageOpsTool('delete-pages', 'Delete Pages', { op: 'delete' }),
  'reorder-pages': pageOpsTool('reorder-pages', 'Reorder Pages', { op: 'reorder' }),

  'rotate-pdf': pdfOpTool('rotate-pdf', 'Rotate PDF', 'rotate', { angle: 90 }),
  'watermark': pdfOpTool('watermark', 'Watermark PDF', 'overlay', { op: 'watermark', text: '', opacity: 0.25, size: 48 }),
  'add-page-numbers': pdfOpTool('add-page-numbers', 'Add Page Numbers', 'overlay', { op: 'pageNumber', start: 1, position: 'bottom-right' }),
  'sign-pdf': pdfOpTool('sign-pdf', 'Sign PDF', 'overlay', { op: 'signature', text: '' }),
  'compress-pdf': pdfOpTool('compress-pdf', 'Compress PDF', 'compress', { quality: 60 }),
};

function pageOpsTool(id: string, label: string, defaults: Record<string, unknown>): ToolConfig {
  return {
    id,
    processor: 'pageOps',
    label,
    accepts: ['pdf'],
    minFiles: 1,
    maxFiles: 1,
    singleOutput: true,
    defaultOptions: defaults,
  };
}

function pdfOpTool(
  id: string,
  label: string,
  processor: 'rotate' | 'overlay' | 'compress',
  defaults: Record<string, unknown>,
): ToolConfig {
  return {
    id,
    processor,
    label,
    accepts: ['pdf'],
    minFiles: 1,
    maxFiles: 1,
    singleOutput: true,
    defaultOptions: defaults,
  };
}

export function getToolConfig(toolId: string): ToolConfig | null {
  return toolRegistry[toolId] ?? null;
}