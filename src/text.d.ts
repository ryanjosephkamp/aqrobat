import type { Qr } from "./core.mjs";
export const TEXT_LAYOUT: "aqrobat-text-v1";
export interface PlainText {
  text: string;
  rows: string[];
  across: number;
  down: number;
  blank: string;
  mixed: boolean;
  layout: string;
}
export interface TextMetrics {
  kind: string;
  fontSize?: number;
  lineHeight?: number;
  fontSizes?: Record<string, number>;
  width: number;
  characterOnly: boolean;
}
export function plainText(qr: Qr): PlainText;
export function textMetrics(qr: Qr): TextMetrics;
export function formattedText(qr: Qr, metrics: TextMetrics): string;
export function textDocument(qr: Qr, metrics: TextMetrics): string;
export function textRtf(qr: Qr, metrics: TextMetrics): string;
export function exportName(value: unknown): string;
