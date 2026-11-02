import type { Qr } from "./core.mjs";
export const TILES_LAYOUT: "aqrobat-tiles-v1";
export const BLOCKS_LAYOUT: "aqrobat-blocks-v1";
export const LIGHT_TILE: "⬜";
export const PASTE_LAYOUT: "aqrobat-paste-v1";
export const SQUARES: readonly { glyph: string; name: string }[];
export const DARK_TILES: readonly string[];
export const LIGHT_DOT: "▫️";
export const CORNER_TILE: "⬛";
export function wideGlyph(glyph: string): boolean;
export function usesCorners(qr: Qr): boolean;
export function finderModule(qr: Qr, x: number, y: number): boolean;
export function pasteLight(qr: Qr): string | null;
export interface PortableText {
  text: string;
  rows: string[];
  across: number;
  down: number;
  quiet: number;
  dark: string;
  layout: string;
}
export interface PortableOptions {
  dark?: string;
  across?: number;
  down?: number;
  quiet?: number;
}
export function tileText(qr: Qr, options?: PortableOptions): PortableText;
export function blockText(
  qr: Qr,
  options?: PortableOptions & { fence?: boolean },
): PortableText & { fence: boolean };
export function pasteText(
  qr: Qr,
  options?: { quiet?: number; fence?: boolean },
): {
  text: string;
  rows: string[];
  emoji: boolean;
  corners: boolean;
  light: string | null;
  quiet: number;
  fence: boolean;
  layout: "aqrobat-paste-v1";
};
