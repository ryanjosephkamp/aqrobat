import type { Qr } from "./core.mjs";
import type { TextMetrics } from "./text.mjs";
export type Format = "formatted" | "plain" | "markdown" | "blocks" | "png";
export interface Destination {
  id: string;
  name: string;
  format: Format;
  hosts: readonly string[];
  how: string;
  limit?: number;
}
export interface Tested {
  glyphs: readonly string[];
  name: string;
}
export const FORMATS: Readonly<
  Record<Format, { name: string; note: string; tested: Tested | null }>
>;
export const DESTINATIONS: readonly Destination[];
export function destination(id: string): Destination;
export function destinationForHost(hostname: string): Destination | null;
export function clipboardFor(
  qr: Qr,
  id: string,
  metrics: TextMetrics,
): { format: Format; html: string | null; text: string | null };
export function pasteCheck(
  qr: Qr,
  id: string,
): { tested: Tested | null; ok: boolean };
export function characterCount(text: string): number;
