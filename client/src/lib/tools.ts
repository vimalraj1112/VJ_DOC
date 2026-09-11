import type { LucideIcon } from 'lucide-react';
import {
  FileImage,
  FileOutput,
  FileType2,
  FileSpreadsheet,
  Presentation,
  FileJson,
  Combine,
  Scissors,
  SquareDashed,
  Trash2,
  ArrowUpDown,
  RotateCw,
  Files,
  FilePenLine,
  Type,
  ImagePlus,
  Highlighter,
  PencilLine,
  Shapes,
  Crop,
  Hash,
  LockKeyhole,
  Unlock,
  Droplets,
  EyeOff,
  PenLine,
  FileSignature,
  Sparkles,
  MessageSquareText,
  NotebookText,
  ListChecks,
  Languages,
  FileDown,
  Wand2,
} from 'lucide-react';

export type CategoryKey = 'convert' | 'organize' | 'optimize' | 'edit' | 'security' | 'sign' | 'ai';

export type ToolKind = 'image-to-pdf' | 'pdf-to-image' | 'merge' | 'page-op' | 'pdfOp' | 'soon';

export interface SettingField {
  key: string;
  label: string;
  type: 'select' | 'segmented' | 'slider' | 'text';
  options?: { value: string | number; label: string }[];
  default: string | number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  help?: string;
}

export interface ToolDef {
  id: string;
  category: CategoryKey;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  kind: ToolKind;
  accept: string;
  acceptHint: string;
  minFiles: number;
  maxFiles: number;
  settings?: SettingField[];
  /** pageOpsProcessor `op` for kind 'page-op'. */
  pageOp?: 'split' | 'extract' | 'delete' | 'reorder';
  related: string[];
  soon?: boolean;
  accent: readonly [string, string];
  faq?: { q: string; a: string }[];
}

export const CATEGORY_META: Record<CategoryKey, { label: string; blurb: string }> = {
  convert: { label: 'Convert', blurb: 'Transform documents between formats — images, PDFs and Office files.' },
  organize: { label: 'Organize', blurb: 'Merge, split and rearrange your pages however you need them.' },
  optimize: { label: 'Optimize', blurb: 'Shrink and repair files without losing what matters.' },
  edit: { label: 'Edit', blurb: 'Add text, images and annotations to any PDF.' },
  security: { label: 'Security', blurb: 'Protect, unlock and watermark your documents.' },
  sign: { label: 'Sign', blurb: 'Sign documents electronically in seconds.' },
  ai: { label: 'AI', blurb: 'Ask questions and extract insight from your documents.' },
};

export const CATEGORY_ORDER: CategoryKey[] = ['convert', 'organize', 'optimize', 'edit', 'security', 'sign', 'ai'];

const IMAGE_SETTINGS: SettingField[] = [
  {
    key: 'pageSize',
    label: 'Page size',
    type: 'select',
    default: 'A4',
    options: [
      { value: 'A4', label: 'A4' },
      { value: 'A3', label: 'A3' },
      { value: 'letter', label: 'Letter' },
      { value: 'legal', label: 'Legal' },
      { value: 'original', label: 'Original size' },
    ],
  },
  {
    key: 'orientation',
    label: 'Orientation',
    type: 'segmented',
    default: 'auto',
    options: [
      { value: 'auto', label: 'Auto' },
      { value: 'portrait', label: 'Portrait' },
      { value: 'landscape', label: 'Landscape' },
    ],
  },
  {
    key: 'margin',
    label: 'Margins',
    type: 'segmented',
    default: 'none',
    options: [
      { value: 'none', label: 'None' },
      { value: 'small', label: 'Small' },
      { value: 'medium', label: 'Medium' },
      { value: 'large', label: 'Large' },
    ],
  },
  {
    key: 'imageFit',
    label: 'Image fit',
    type: 'segmented',
    default: 'fit',
    options: [
      { value: 'fit', label: 'Fit page' },
      { value: 'fill', label: 'Fill page' },
      { value: 'original', label: 'Original' },
    ],
  },
  {
    key: 'quality',
    label: 'Image quality',
    type: 'segmented',
    default: 'standard',
    options: [
      { value: 'standard', label: 'Standard' },
      { value: 'high', label: 'High' },
      { value: 'maximum', label: 'Maximum' },
    ],
  },
];

const PDF_TO_IMAGE_SETTINGS: SettingField[] = [
  {
    key: 'format',
    label: 'Image format',
    type: 'segmented',
    default: 'jpg',
    options: [
      { value: 'jpg', label: 'JPG' },
      { value: 'png', label: 'PNG' },
      { value: 'webp', label: 'WEBP' },
    ],
  },
  {
    key: 'mode',
    label: 'Pages',
    type: 'segmented',
    default: 'all',
    options: [
      { value: 'all', label: 'All pages' },
      { value: 'selected', label: 'Selected' },
    ],
  },
  {
    key: 'scale',
    label: 'Resolution',
    type: 'select',
    default: 2,
    options: [
      { value: 1, label: '1× · 72 DPI' },
      { value: 2, label: '2× · 144 DPI' },
      { value: 3, label: '3× · 216 DPI' },
      { value: 4, label: '4× · 288 DPI' },
    ],
  },
  {
    key: 'quality',
    label: 'Quality',
    type: 'slider',
    default: 85,
    min: 40,
    max: 100,
    step: 5,
    suffix: '%',
  },
];

type ToolBuilder = ToolDef;

function imageToPdf(id: string, name: string, accept: string, acceptHint: string, tagline: string, accent: readonly [string, string]): ToolBuilder {
  return {
    id,
    category: 'convert',
    name,
    tagline,
    description: `Turn your ${accept === 'image/jpeg' ? 'JPEG' : name.split(' ')[0].toUpperCase()} images into polished, print-ready PDF documents. Reorder pages, choose your page size and margins, and download a professional PDF in seconds — all private and free.`,
    icon: FileImage,
    kind: 'image-to-pdf',
    accept,
    acceptHint,
    minFiles: 1,
    maxFiles: 30,
    settings: IMAGE_SETTINGS,
    related: ['jpg-to-pdf', 'png-to-pdf', 'pdf-to-jpg', 'merge-pdf'],
    accent,
  };
}

export const TOOLS: ToolDef[] = [
  // ── Convert ─────────────────────────────────────────────
  imageToPdf('png-to-pdf', 'PNG to PDF', 'image/png', 'PNG', 'Convert PNG images into sharp, professional PDF documents.', ['#22d3ee', '#0e7490']),
  imageToPdf('jpg-to-pdf', 'JPG to PDF', 'image/jpeg', 'JPG, JPEG', 'Turn JPG photographs into polished PDF files in one click.', ['#f59e0b', '#b45309']),
  imageToPdf('webp-to-pdf', 'WEBP to PDF', 'image/webp', 'WEBP', 'Convert high-efficiency WEBP images into clean PDF pages.', ['#a78bfa', '#6d28d9']),
  {
    id: 'pdf-to-jpg',
    category: 'convert',
    name: 'PDF to JPG',
    tagline: 'Export pages of a PDF into high-quality JPG images.',
    description:
      'Render every page of your PDF as a crisp JPG (or PNG/WEBP) image. Multi-page files are delivered as a tidy ZIP — perfect for slides, thumbnails or social posts.',
    icon: FileOutput,
    kind: 'pdf-to-image',
    accept: 'application/pdf',
    acceptHint: 'PDF',
    minFiles: 1,
    maxFiles: 1,
    settings: PDF_TO_IMAGE_SETTINGS,
    related: ['png-to-pdf', 'merge-pdf', 'compress-pdf'],
    accent: ['#34d399', '#047857'],
  },
  { id: 'pdf-to-png', category: 'convert', name: 'PDF to PNG', tagline: 'High-quality PNG renders of every PDF page.', description: 'Render every page of your PDF as a sharp PNG image with crisp text and graphics. Multi-page files are delivered as a tidy ZIP.', icon: FileType2, kind: 'pdf-to-image', accept: 'application/pdf', acceptHint: 'PDF', minFiles: 1, maxFiles: 1, settings: PDF_TO_IMAGE_SETTINGS, related: ['pdf-to-jpg'], accent: ['#34d399', '#065f46'] as const },
  { id: 'pdf-to-webp', category: 'convert', name: 'PDF to WEBP', tagline: 'Compact, web-friendly WEBP images from PDF pages.', description: 'Render PDF pages into efficient WEBP images that load fast on the web. Multi-page files are delivered as a ZIP.', icon: FileImage, kind: 'pdf-to-image', accept: 'application/pdf', acceptHint: 'PDF', minFiles: 1, maxFiles: 1, settings: PDF_TO_IMAGE_SETTINGS, related: ['pdf-to-jpg'], accent: ['#2dd4bf', '#0f766e'] as const },
  { id: 'word-to-pdf', category: 'convert', name: 'Word to PDF', tagline: 'Convert DOCX documents into faithful PDFs.', description: 'Turn Word documents into PDFs.', icon: FileType2, kind: 'soon', accept: '', acceptHint: '', minFiles: 1, maxFiles: 1, related: ['pdf-to-word'], accent: ['#60a5fa', '#1d4ed8'] as const, soon: true },
  { id: 'excel-to-pdf', category: 'convert', name: 'Excel to PDF', tagline: 'Spreadsheets into shareable PDFs.', description: 'Turn Excel workbooks into PDFs.', icon: FileSpreadsheet, kind: 'soon', accept: '', acceptHint: '', minFiles: 1, maxFiles: 1, related: ['pdf-to-excel'], accent: ['#4ade80', '#15803d'] as const, soon: true },
  { id: 'ppt-to-pdf', category: 'convert', name: 'PowerPoint to PDF', tagline: 'Slide decks into clean PDF pages.', description: 'Turn PowerPoint files into PDFs.', icon: Presentation, kind: 'soon', accept: '', acceptHint: '', minFiles: 1, maxFiles: 1, related: ['pdf-to-ppt'], accent: ['#fb7185', '#be123c'] as const, soon: true },
  { id: 'pdf-to-word', category: 'convert', name: 'PDF to Word', tagline: 'Editable DOCX from your PDF.', description: 'Convert PDF to editable Word.', icon: FileType2, kind: 'soon', accept: '', acceptHint: '', minFiles: 1, maxFiles: 1, related: ['word-to-pdf'], accent: ['#60a5fa', '#1e40af'] as const, soon: true },
  { id: 'pdf-to-excel', category: 'convert', name: 'PDF to Excel', tagline: 'Extract tables from PDFs into XLSX.', description: 'Convert PDF to spreadsheet.', icon: FileJson, kind: 'soon', accept: '', acceptHint: '', minFiles: 1, maxFiles: 1, related: ['excel-to-pdf'], accent: ['#4ade80', '#166534'] as const, soon: true },
  { id: 'pdf-to-ppt', category: 'convert', name: 'PDF to PowerPoint', tagline: 'Turn PDF pages into an editable deck.', description: 'Convert PDF to PowerPoint.', icon: FileDown, kind: 'soon', accept: '', acceptHint: '', minFiles: 1, maxFiles: 1, related: ['ppt-to-pdf'], accent: ['#fb7185', '#9f1239'] as const, soon: true },

  // ── Organize ────────────────────────────────────────────
  {
    id: 'merge-pdf',
    category: 'organize',
    name: 'Merge PDF',
    tagline: 'Combine multiple PDFs into one in your preferred order.',
    description: 'Drag your PDFs into the order you want and merge them into a single document — a complete file merged from parts in seconds.',
    icon: Combine,
    kind: 'merge',
    accept: 'application/pdf',
    acceptHint: 'PDF',
    minFiles: 2,
    maxFiles: 30,
    settings: [],
    related: ['split-pdf', 'compress-pdf', 'reorder-pages'],
    accent: ['#c084fc', '#7c3aed'],
  },
  { id: 'split-pdf', category: 'organize', name: 'Split PDF', tagline: 'Divide one PDF into multiple smaller documents.', description: 'Split a PDF into parts of N pages each.', icon: Scissors, kind: 'page-op', pageOp: 'split', accept: 'application/pdf', acceptHint: 'PDF', minFiles: 1, maxFiles: 1, settings: [{ key: 'every', label: 'Pages per file', type: 'slider', default: 1, min: 1, max: 20, step: 1 }], related: ['merge-pdf', 'extract-pages'], accent: ['#f472b6', '#be185d'] },
  { id: 'extract-pages', category: 'organize', name: 'Extract Pages', tagline: 'Pull out the pages you need into a new PDF.', description: 'Select pages and export just those.', icon: SquareDashed, kind: 'page-op', pageOp: 'extract', accept: 'application/pdf', acceptHint: 'PDF', minFiles: 1, maxFiles: 1, settings: [], related: ['split-pdf', 'delete-pages'], accent: ['#2dd4bf', '#0e7490'] },
  { id: 'delete-pages', category: 'organize', name: 'Delete Pages', tagline: 'Remove unwanted pages before sharing.', description: 'Delete selected pages from a PDF.', icon: Trash2, kind: 'page-op', pageOp: 'delete', accept: 'application/pdf', acceptHint: 'PDF', minFiles: 1, maxFiles: 1, settings: [], related: ['extract-pages', 'reorder-pages'], accent: ['#f87171', '#b91c1c'] },
  { id: 'reorder-pages', category: 'organize', name: 'Reorder Pages', tagline: 'Rearrange pages into a new order.', description: 'Reorder the pages of a PDF.', icon: ArrowUpDown, kind: 'page-op', pageOp: 'reorder', accept: 'application/pdf', acceptHint: 'PDF', minFiles: 1, maxFiles: 1, settings: [], related: ['merge-pdf', 'extract-pages'], accent: ['#fbbf24', '#b45309'] },
  { id: 'rotate-pdf', category: 'organize', name: 'Rotate PDF', tagline: 'Rotate every page into the right orientation.', description: 'Spin every page of your PDF 90°, 180° or 270° to fix sideways scans and mis-oriented documents — then download the corrected file ready to share.', icon: RotateCw, kind: 'pdfOp', accept: 'application/pdf', acceptHint: 'PDF', minFiles: 1, maxFiles: 1, settings: [{ key: 'angle', label: 'Rotation', type: 'segmented', default: 90, options: [{ value: 90, label: '90°' }, { value: 180, label: '180°' }, { value: 270, label: '270°' }], help: 'Rotates every page of your PDF.' }], related: ['reorder-pages', 'split-pdf'], accent: ['#f59e0b', '#92400e'] as const },
  { id: 'add-page-numbers', category: 'organize', name: 'Add Page Numbers', tagline: 'Stamp page numbers onto your document.', description: 'Number every page of your PDF in a corner, starting from any value. Ideal for reports and formal documents.', icon: Hash, kind: 'pdfOp', accept: 'application/pdf', acceptHint: 'PDF', minFiles: 1, maxFiles: 1, settings: [{ key: 'position', label: 'Position', type: 'segmented', default: 'bottom-right', options: [{ value: 'bottom-right', label: 'Bottom right' }, { value: 'bottom-left', label: 'Bottom left' }, { value: 'top-right', label: 'Top right' }, { value: 'top-left', label: 'Top left' }] }, { key: 'start', label: 'Start at', type: 'slider', default: 1, min: 1, max: 30, step: 1 }], related: ['rotate-pdf', 'merge-pdf'], accent: ['#a78bfa', '#6d28d9'] as const },

  // ── Optimize ────────────────────────────────────────────
  { id: 'compress-pdf', category: 'optimize', name: 'Compress PDF', tagline: 'Shrink file size without wrecking quality.', description: 'Rebuild your PDF page-by-page at a lighter quality to cut its file size — ideal for emailing and uploading image-heavy documents.', icon: Files, kind: 'pdfOp', accept: 'application/pdf', acceptHint: 'PDF', minFiles: 1, maxFiles: 1, settings: [{ key: 'quality', label: 'Compression', type: 'slider', default: 60, min: 20, max: 95, step: 5, suffix: '%', help: 'Lower = smaller file, slightly softer quality.' }], related: ['pdf-to-jpg', 'repair-pdf'], accent: ['#34d399', '#047857'] as const },
  { id: 'repair-pdf', category: 'optimize', name: 'Repair PDF', tagline: 'Recover a broken or corrupt PDF.', description: 'Repair a damaged PDF.', icon: Wand2, kind: 'soon', accept: '', acceptHint: '', minFiles: 1, maxFiles: 1, related: ['compress-pdf'], accent: ['#f472b6', '#be185d'] as const, soon: true },
  { id: 'flatten-pdf', category: 'optimize', name: 'Flatten PDF', tagline: 'Merge layers and make edits permanent.', description: 'Flatten a PDF.', icon: Files, kind: 'soon', accept: '', acceptHint: '', minFiles: 1, maxFiles: 1, related: ['protect-pdf'], accent: ['#38bdf8', '#0369a1'] as const, soon: true },

  // ── Edit ────────────────────────────────────────────────
  { id: 'edit-pdf', category: 'edit', name: 'Edit PDF', tagline: 'Full-fidelity PDF editor in your browser.', description: 'Edit PDF text, images and pages.', icon: FilePenLine, kind: 'soon', accept: '', acceptHint: '', minFiles: 1, maxFiles: 1, related: ['add-text', 'crop-pdf'], accent: ['#818cf8', '#4f46e5'] as const, soon: true },
  { id: 'add-text', category: 'edit', name: 'Add Text', tagline: 'Insert editable text anywhere.', description: 'Add text to a PDF.', icon: Type, kind: 'soon', accept: '', acceptHint: '', minFiles: 1, maxFiles: 1, related: ['edit-pdf'], accent: ['#a78bfa', '#6d28d9'] as const, soon: true },
  { id: 'add-image', category: 'edit', name: 'Add Image', tagline: 'Place images onto your page.', description: 'Add images to a PDF.', icon: ImagePlus, kind: 'soon', accept: '', acceptHint: '', minFiles: 1, maxFiles: 1, related: ['edit-pdf'], accent: ['#34d399', '#047857'] as const, soon: true },
  { id: 'highlight', category: 'edit', name: 'Highlight', tagline: 'Mark key passages with color.', description: 'Highlight PDF text.', icon: Highlighter, kind: 'soon', accept: '', acceptHint: '', minFiles: 1, maxFiles: 1, related: ['edit-pdf'], accent: ['#fbbf24', '#b45309'] as const, soon: true },
  { id: 'crop-pdf', category: 'edit', name: 'Crop PDF', tagline: 'Trim pages to focus on the content.', description: 'Crop a PDF page.', icon: Crop, kind: 'soon', accept: '', acceptHint: '', minFiles: 1, maxFiles: 1, related: ['edit-pdf'], accent: ['#f87171', '#b91c1c'] as const, soon: true },

  // ── Security ────────────────────────────────────────────
  { id: 'protect-pdf', category: 'security', name: 'Protect PDF', tagline: 'Lock your document with a strong password.', description: 'Set a password on a PDF.', icon: LockKeyhole, kind: 'soon', accept: '', acceptHint: '', minFiles: 1, maxFiles: 1, related: ['unlock-pdf', 'watermark'], accent: ['#f59e0b', '#92400e'] as const, soon: true },
  { id: 'unlock-pdf', category: 'security', name: 'Unlock PDF', tagline: 'Remove a password you know.', description: 'Unlock a password-protected PDF.', icon: Unlock, kind: 'soon', accept: '', acceptHint: '', minFiles: 1, maxFiles: 1, related: ['protect-pdf'], accent: ['#34d399', '#047857'] as const, soon: true },
  { id: 'watermark', category: 'security', name: 'Watermark PDF', tagline: 'Stamp a text watermark across every page.', description: 'Repeat a semi-transparent word or phrase across each page of your PDF to protect drafts and mark ownership.', icon: Droplets, kind: 'pdfOp', accept: 'application/pdf', acceptHint: 'PDF', minFiles: 1, maxFiles: 1, settings: [{ key: 'text', label: 'Watermark text', type: 'text', default: '', help: 'Repeated diagonally across each page.' }, { key: 'opacity', label: 'Opacity', type: 'slider', default: 0.25, min: 0.05, max: 0.9, step: 0.05 }], related: ['protect-pdf', 'sign-pdf'], accent: ['#38bdf8', '#0369a1'] as const },
  { id: 'redact-pdf', category: 'security', name: 'Redact PDF', tagline: 'Permanently black out sensitive content.', description: 'Redact a PDF.', icon: EyeOff, kind: 'soon', accept: '', acceptHint: '', minFiles: 1, maxFiles: 1, related: ['protect-pdf'], accent: ['#f87171', '#991b1b'] as const, soon: true },

  // ── Sign ────────────────────────────────────────────────
  { id: 'sign-pdf', category: 'sign', name: 'Sign PDF', tagline: 'Type a signature onto your document.', description: 'Place a clean typed signature near the bottom of the last page of your PDF, ready to send back instantly.', icon: PenLine, kind: 'pdfOp', accept: 'application/pdf', acceptHint: 'PDF', minFiles: 1, maxFiles: 1, settings: [{ key: 'text', label: 'Your signature', type: 'text', default: '', help: 'Placed near the bottom of the last page.' }], related: ['watermark', 'compress-pdf'], accent: ['#34d399', '#065f46'] as const },
  { id: 'request-signature', category: 'sign', name: 'Request Signature', tagline: 'Ask others to sign securely.', description: 'Request signatures from others.', icon: FileSignature, kind: 'soon', accept: '', acceptHint: '', minFiles: 1, maxFiles: 1, related: ['sign-pdf'], accent: ['#c084fc', '#6d28d9'] as const, soon: true },

  // ── AI ──────────────────────────────────────────────────
  { id: 'ai-summary', category: 'ai', name: 'AI PDF Summary', tagline: 'Instant summary of any document.', description: 'Summarise a document with AI.', icon: Sparkles, kind: 'soon', accept: '', acceptHint: '', minFiles: 1, maxFiles: 1, related: ['ask-pdf'], accent: ['#a78bfa', '#7c3aed'] as const, soon: true },
  { id: 'ask-pdf', category: 'ai', name: 'Ask PDF', tagline: 'Chat with your document.', description: 'Ask questions about a PDF.', icon: MessageSquareText, kind: 'soon', accept: '', acceptHint: '', minFiles: 1, maxFiles: 1, related: ['ai-summary'], accent: ['#818cf8', '#4f46e5'] as const, soon: true },
  { id: 'pdf-to-markdown', category: 'ai', name: 'PDF to Markdown', tagline: 'Clean Markdown from any PDF.', description: 'Convert PDF to Markdown.', icon: FileJson, kind: 'soon', accept: '', acceptHint: '', minFiles: 1, maxFiles: 1, related: ['ask-pdf'], accent: ['#f472b6', '#be185d'] as const, soon: true },
];

const byId = new Map<string, ToolDef>(TOOLS.map((t) => [t.id, t]));

export function getTool(id: string): ToolDef | undefined {
  return byId.get(id);
}

export function toolsByCategory(category: CategoryKey): ToolDef[] {
  return TOOLS.filter((t) => t.category === category);
}

export function toolsByIds(ids: string[]): ToolDef[] {
  return ids.map((n) => byId.get(n)).filter((t): t is ToolDef => Boolean(t));
}

export function relatedTools(tool: ToolDef): ToolDef[] {
  return toolsByIds(tool.related);
}

export function workingTools(): ToolDef[] {
  return TOOLS.filter((t) => !t.soon);
}

export function soonTools(): ToolDef[] {
  return TOOLS.filter((t) => t.soon);
}