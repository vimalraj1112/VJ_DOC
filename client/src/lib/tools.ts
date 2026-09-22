import type { LucideIcon } from 'lucide-react';
import {
  FileImage,
  FileOutput,
  FileType2,
  Maximize2,
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
  ShieldCheck,
} from 'lucide-react';

export type CategoryKey = 'convert' | 'organize' | 'optimize' | 'edit' | 'security' | 'sign' | 'ai';

export type ToolKind = 'image-to-pdf' | 'pdf-to-image' | 'merge' | 'page-op' | 'pdfOp' | 'image-op' | 'docOp' | 'office' | 'securityPdf' | 'aiDoc' | 'signatureRequest' | 'soon';

export interface SettingField {
  key: string;
  label: string;
  type: 'select' | 'segmented' | 'slider' | 'text' | 'password';
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

/** Office Open XML MIME types used by the Office ↔ PDF workflows. */
export const OFFICE_MIME = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
} as const;

/**
 * Map a ToolDef's `accept` field (comma-separated MIME types) into the
 * react-dropzone `Accept` object used by the uploader.
 */
export function acceptForTool(tool: Pick<ToolDef, 'accept'>): Record<string, string[]> {
  const entries: Record<string, string[]> = {};
  for (const mime of (tool.accept || '').split(',').map((m) => m.trim()).filter(Boolean)) {
    entries[mime] = [];
  }
  return entries;
}

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

/** Builder for the image-op tools (format transcode / resize / crop). */
function imageOp(
  id: string,
  name: string,
  tagline: string,
  description: string,
  accept: string,
  acceptHint: string,
  category: CategoryKey,
  icon: LucideIcon,
  settings: SettingField[] | undefined,
  related: string[],
  accent: readonly [string, string],
): ToolBuilder {
  return {
    id,
    category,
    name,
    tagline,
    description,
    icon,
    kind: 'image-op',
    accept,
    acceptHint,
    minFiles: 1,
    maxFiles: 10,
    settings,
    related,
    accent,
  };
}

const RESIZE_SETTINGS: SettingField[] = [
  { key: 'scale', label: 'Scale', type: 'slider', default: 75, min: 5, max: 200, step: 5, suffix: '%', help: 'Percent of the original size. Values over 100% upscale.' },
];
const CROP_SETTINGS: SettingField[] = [
  { key: 'width', label: 'Width', type: 'slider', default: 100, min: 10, max: 100, step: 5, suffix: '%', help: 'How much of the image width to keep.' },
  { key: 'left', label: 'Left edge', type: 'slider', default: 0, min: 0, max: 90, step: 5, suffix: '%' },
  { key: 'height', label: 'Height', type: 'slider', default: 100, min: 10, max: 100, step: 5, suffix: '%' },
  { key: 'top', label: 'Top edge', type: 'slider', default: 0, min: 0, max: 90, step: 5, suffix: '%' },
];

export const TOOLS: ToolDef[] = [
  // ── Convert ─────────────────────────────────────────────
  imageToPdf('png-to-pdf', 'PNG to PDF', 'image/png', 'PNG', 'Convert PNG images into sharp, professional PDF documents.', ['#22d3ee', '#0e7490']),
  imageToPdf('jpg-to-pdf', 'JPG to PDF', 'image/jpeg', 'JPG, JPEG', 'Turn JPG photographs into polished PDF files in one click.', ['#f59e0b', '#b45309']),
  imageToPdf('webp-to-pdf', 'WEBP to PDF', 'image/webp', 'WEBP', 'Convert high-efficiency WEBP images into clean PDF pages.', ['#a78bfa', '#6d28d9']),

  imageOp('webp-to-png', 'WEBP to PNG', 'Convert WEBP images to crisp, lossless PNG.', 'Transcode high-efficiency WEBP images into PNG with perfect quality — ideal for editing or screenshots that need a transparent, lossless format.', 'image/webp', 'WEBP', 'convert', FileImage, undefined, ['png-to-webp', 'webp-to-jpg'], ['#a78bfa', '#6d28d9']),
  imageOp('webp-to-jpg', 'WEBP to JPG', 'Turn WEBP images into widely-supported JPG photos.', 'Convert WEBP to JPG for maximum compatibility with apps, email and social platforms that still prefer classic JPG files.', 'image/webp', 'WEBP', 'convert', FileImage, undefined, ['jpg-to-webp', 'webp-to-png'], ['#fbbf24', '#b45309']),
  imageOp('png-to-webp', 'PNG to WEBP', 'Shrink PNG files into efficient WEBP images.', 'Compress PNG to WEBP for dramatically smaller files with negligible quality loss — perfect for the web.', 'image/png', 'PNG', 'convert', FileImage, undefined, ['webp-to-png', 'png-to-jpg'], ['#22d3ee', '#0369a1']),
  imageOp('png-to-jpg', 'PNG to JPG', 'Convert PNG images into compact JPG photos.', 'Turn PNG into JPG for smaller files and universal compatibility. Great for photos where transparency is not required.', 'image/png', 'PNG', 'convert', FileImage, undefined, ['jpg-to-png', 'png-to-webp'], ['#f59e0b', '#b45309']),
  imageOp('jpg-to-webp', 'JPG to WEBP', 'Convert JPG photos into lightweight WEBP.', 'Re-encode JPG to WEBP for up to 60% smaller files that load faster without noticeably losing quality.', 'image/jpeg', 'JPG, JPEG', 'convert', FileImage, undefined, ['webp-to-jpg', 'auto-pdf-from-images'], ['#38bdf8', '#0369a1']),
  imageOp('jpg-to-png', 'JPG to PNG', 'Convert JPG to lossless, transparent PNG.', 'Upgrade JPG photos to PNG for lossless quality and transparent backgrounds.', 'image/jpeg', 'JPG, JPEG', 'convert', FileImage, undefined, ['png-to-jpg', 'jpg-to-webp'], ['#34d399', '#047857']),

  imageOp('image-resize', 'Resize Image', 'Scale images down or up as a percentage.', 'Resize one or many images by a percentage of their original size — shrink large photos for the web or upscale small ones.', 'image/*', 'JPG, PNG, WEBP', 'optimize', Maximize2, RESIZE_SETTINGS, ['image-crop', 'compress-pdf'], ['#2dd4bf', '#0f766e']),
  imageOp('image-crop', 'Crop Image', 'Trim images to focus on what matters.', 'Crop one or many images by setting the visible area as percentages — cut away edges to keep only the part you need.', 'image/*', 'JPG, PNG, WEBP', 'edit', Crop, CROP_SETTINGS, ['image-resize', 'edit-pdf'], ['#f87171', '#b91c1c']),

  {
    id: 'extract-text',
    category: 'convert',
    name: 'Extract Text',
    tagline: 'Pull every word out of a PDF into a clean text file.',
    description: 'Extract the text from any text-based PDF and get it back as a plain .txt file — perfect for quoting, editing or repurposing content. (Text amount varies by how the PDF encodes its content.)',
    icon: Type,
    kind: 'docOp',
    accept: 'application/pdf',
    acceptHint: 'PDF',
    minFiles: 1,
    maxFiles: 1,
    related: ['remove-metadata', 'compress-pdf'],
    accent: ['#38bdf8', '#0369a1'],
  },
  {
    id: 'remove-metadata',
    category: 'optimize',
    name: 'Remove Metadata',
    tagline: 'Wipe hidden info like author, title and producer from a PDF.',
    description: 'Rebuild your PDF without its hidden metadata (author, title, creator, producer, dates) so you can share it without leaking who made it or when.',
    icon: ShieldCheck,
    kind: 'docOp',
    accept: 'application/pdf',
    acceptHint: 'PDF',
    minFiles: 1,
    maxFiles: 1,
    related: ['extract-text', 'compress-pdf'],
    accent: ['#34d399', '#047857'],
  },

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
  { id: 'word-to-pdf', category: 'convert', name: 'Word to PDF', tagline: 'Convert DOCX documents into faithful PDFs.', description: 'Turn Word documents into pixel-perfect PDFs with real WYSIWYG layout — fonts, margins and tables preserved exactly as in Word.', icon: FileType2, kind: 'office', accept: OFFICE_MIME.docx, acceptHint: 'DOCX', minFiles: 1, maxFiles: 1, related: ['pdf-to-word'], accent: ['#60a5fa', '#1d4ed8'] as const },
  { id: 'excel-to-pdf', category: 'convert', name: 'Excel to PDF', tagline: 'Spreadsheets into shareable PDFs.', description: 'Turn Excel workbooks into clean PDFs with all rows, columns and formatting intact — ready to share or print.', icon: FileSpreadsheet, kind: 'office', accept: OFFICE_MIME.xlsx, acceptHint: 'XLSX', minFiles: 1, maxFiles: 1, related: ['pdf-to-excel'], accent: ['#4ade80', '#15803d'] as const },
  { id: 'ppt-to-pdf', category: 'convert', name: 'PowerPoint to PDF', tagline: 'Slide decks into clean PDF pages.', description: 'Turn PowerPoint decks into polished PDF slides — each slide becomes its own crisp page.', icon: Presentation, kind: 'office', accept: OFFICE_MIME.pptx, acceptHint: 'PPTX', minFiles: 1, maxFiles: 1, related: ['pdf-to-ppt'], accent: ['#fb7185', '#be123c'] as const },
  { id: 'pdf-to-word', category: 'convert', name: 'PDF to Word', tagline: 'Editable DOCX from your PDF.', description: 'Convert a PDF into an editable Word document using LibreOffice. Text-only PDFs are reconstructed cleanly in DOCX.', icon: FileType2, kind: 'office', accept: 'application/pdf', acceptHint: 'PDF', minFiles: 1, maxFiles: 1, related: ['word-to-pdf'], accent: ['#60a5fa', '#1e40af'] as const },
  { id: 'pdf-to-excel', category: 'convert', name: 'PDF to Excel', tagline: 'Extract tables from PDFs into XLSX.', description: 'Pull the content of your PDF into an editable spreadsheet — every paragraph and table becomes a row you can work with.', icon: FileJson, kind: 'office', accept: 'application/pdf', acceptHint: 'PDF', minFiles: 1, maxFiles: 1, related: ['excel-to-pdf'], accent: ['#4ade80', '#166534'] as const },
  { id: 'pdf-to-ppt', category: 'convert', name: 'PDF to PowerPoint', tagline: 'Turn PDF pages into an editable deck.', description: 'Convert a PDF into an editable PowerPoint presentation — each page lands on its own slide.', icon: FileDown, kind: 'office', accept: 'application/pdf', acceptHint: 'PDF', minFiles: 1, maxFiles: 1, related: ['ppt-to-pdf'], accent: ['#fb7185', '#9f1239'] as const },

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
  { id: 'protect-pdf', category: 'security', name: 'Protect PDF', tagline: 'Lock your document with a strong password.', description: 'Encrypt your PDF with a strong password so only people you trust can open it. Runs locally through LibreOffice with AES encryption.', icon: LockKeyhole, kind: 'securityPdf', accept: 'application/pdf', acceptHint: 'PDF', minFiles: 1, maxFiles: 1, settings: [{ key: 'password', label: 'Password', type: 'password', default: '', help: 'At least 4 characters. The file can only be opened with it.' }], related: ['unlock-pdf', 'watermark'], accent: ['#f59e0b', '#92400e'] as const },
  { id: 'unlock-pdf', category: 'security', name: 'Unlock PDF', tagline: 'Remove a password you know.', description: 'Strip protection from a PDF you have the password for. Output is rebuilt page-by-page, so it opens freely without a password.', icon: Unlock, kind: 'securityPdf', accept: 'application/pdf', acceptHint: 'PDF', minFiles: 1, maxFiles: 1, settings: [{ key: 'password', label: 'Current password', type: 'password', default: '', help: 'Only needed if the PDF is password-protected.' }], related: ['protect-pdf'], accent: ['#34d399', '#047857'] as const },
  { id: 'watermark', category: 'security', name: 'Watermark PDF', tagline: 'Stamp a text watermark across every page.', description: 'Repeat a semi-transparent word or phrase across each page of your PDF to protect drafts and mark ownership.', icon: Droplets, kind: 'pdfOp', accept: 'application/pdf', acceptHint: 'PDF', minFiles: 1, maxFiles: 1, settings: [{ key: 'text', label: 'Watermark text', type: 'text', default: '', help: 'Repeated diagonally across each page.' }, { key: 'opacity', label: 'Opacity', type: 'slider', default: 0.25, min: 0.05, max: 0.9, step: 0.05 }], related: ['protect-pdf', 'sign-pdf'], accent: ['#38bdf8', '#0369a1'] as const },
  { id: 'redact-pdf', category: 'security', name: 'Redact PDF', tagline: 'Permanently black out sensitive content.', description: 'Black out every mention of the terms you choose across your whole PDF — permanently. The removed text is gone for good.', icon: EyeOff, kind: 'securityPdf', accept: 'application/pdf', acceptHint: 'PDF', minFiles: 1, maxFiles: 1, settings: [{ key: 'terms', label: 'Terms to redact', type: 'text', default: '', help: 'Comma separated, e.g. "John Doe, 123-45-6789". Matching text is blacked out.' }], related: ['protect-pdf'], accent: ['#f87171', '#991b1b'] as const },

  // ── Sign ────────────────────────────────────────────────
  { id: 'sign-pdf', category: 'sign', name: 'Sign PDF', tagline: 'Type a signature onto your document.', description: 'Place a clean typed signature near the bottom of the last page of your PDF, ready to send back instantly.', icon: PenLine, kind: 'pdfOp', accept: 'application/pdf', acceptHint: 'PDF', minFiles: 1, maxFiles: 1, settings: [{ key: 'text', label: 'Your signature', type: 'text', default: '', help: 'Placed near the bottom of the last page.' }], related: ['watermark', 'compress-pdf'], accent: ['#34d399', '#065f46'] as const },
  { id: 'request-signature', category: 'sign', name: 'Request Signature', tagline: 'Ask others to sign securely.', description: 'Upload a PDF and instantly create a private signing link. Share it with whoever needs to sign — they open the link, type their name, and get the signed document back. No accounts, no app install.', icon: FileSignature, kind: 'signatureRequest', accept: 'application/pdf', acceptHint: 'PDF', minFiles: 1, maxFiles: 1, settings: [{ key: 'signerName', label: 'Who should sign', type: 'text', default: '', help: 'The recipient\u2019s name, so they know the request is for them.' }, { key: 'signerEmail', label: 'Recipient email (optional)', type: 'text', default: '', help: 'For reference only — nothing is emailed; you share the link yourself.' }], related: ['sign-pdf'], accent: ['#c084fc', '#6d28d9'] as const },

  // ── AI ──────────────────────────────────────────────────
  { id: 'ai-summary', category: 'ai', name: 'AI PDF Summary', tagline: 'Instant summary of any document.', description: 'Extract pages into text and have AI condense the whole document into a tight, readable summary you can copy or download as Markdown.', icon: Sparkles, kind: 'aiDoc', accept: 'application/pdf', acceptHint: 'PDF', minFiles: 1, maxFiles: 1, related: ['ask-pdf'], accent: ['#a78bfa', '#7c3aed'] as const },
  { id: 'ask-pdf', category: 'ai', name: 'Ask PDF', tagline: 'Chat with your document.', description: 'Ask questions about your PDF and get grounded answers drawn from the document text itself, with the source pages cited.', icon: MessageSquareText, kind: 'aiDoc', accept: 'application/pdf', acceptHint: 'PDF', minFiles: 1, maxFiles: 1, settings: [{ key: 'question', label: 'Your question', type: 'text', default: '', help: 'What do you want to know about this document?' }], related: ['ai-summary'], accent: ['#818cf8', '#4f46e5'] as const },
  { id: 'pdf-to-markdown', category: 'ai', name: 'PDF to Markdown', tagline: 'Clean Markdown from any PDF.', description: 'Extract your PDF into clean, well-structured Markdown — headings, paragraphs and page markers preserved for notes, docs and publishing.', icon: FileJson, kind: 'aiDoc', accept: 'application/pdf', acceptHint: 'PDF', minFiles: 1, maxFiles: 1, related: ['ask-pdf'], accent: ['#f472b6', '#be185d'] as const },
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