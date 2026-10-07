export interface Options {
  glyph?: string;
  repeatX?: number;
  repeatY?: number;
  ecc?: "L" | "M" | "Q" | "H";
  boost?: boolean;
  width?: number;
  font?: "Menlo" | "Courier New" | "monospace";
  stroke?: 0 | 0.1;
}
export interface Recipe {
  schema: "aqrobat-recipe-v1" | "aqrobat-recipe-v2";
  payload: string;
  options: Required<Options>;
}
export interface Qr {
  recipe: Recipe;
  matrix: boolean[][];
  palette: string[];
  glyphMatrix: (string | null)[][];
  rows: string[];
  text: string;
  quiet: number;
  totalModules: number;
  modules: number;
  version: number;
  utf8Bytes: number;
  eci: number | null;
  requestedEcc: string;
  actualEcc: string;
  characterColumns: number;
  characterRows: number;
  scanStatus: "untested";
}
export const PRESETS: readonly Readonly<{ glyph: string; name: string }>[];
export const DEFAULTS: Readonly<Required<Options>>;
export function validateGlyph(glyph: string): string;
export function parsePalette(input: string): string[];
export function normalizeOptions(options?: Options): Required<Options>;
export function generate(payload: string, options?: Options): Qr;
export function fromRecipe(recipe: Recipe): Qr;
export function recipeKey(recipe: Recipe): string;
export function escapeXml(value: unknown): string;
export function toSvg(qr: Qr): string;
