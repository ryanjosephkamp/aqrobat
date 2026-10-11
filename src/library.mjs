import { fromRecipe } from "./core.mjs";

export const LIBRARY_KEY = "aqrobat-recipes-v1";
export const LIBRARY_LIMIT = 20;

export function readLibrary(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > LIBRARY_LIMIT)
    throw new TypeError(
      "The saved recipe library is invalid. Export any recoverable recipes before changing it.",
    );
  const ids = new Set();
  return value.map((entry) => {
    if (
      !entry ||
      !/^[a-f0-9-]{36}$/i.test(entry.id) ||
      ids.has(entry.id) ||
      typeof entry.name !== "string" ||
      !entry.name.trim() ||
      entry.name.length > 80
    )
      throw new TypeError("Invalid saved recipe.");
    ids.add(entry.id);
    return {
      id: entry.id,
      name: entry.name,
      recipe: fromRecipe(entry.recipe).recipe,
    };
  });
}

export function addRecipe(entries, name, recipe, id) {
  const all = readLibrary(entries);
  if (all.length >= LIBRARY_LIMIT)
    throw new RangeError(
      "The library holds 20 recipes. Export and remove one before adding another.",
    );
  return readLibrary([...all, { id, name: String(name).trim(), recipe }]);
}
