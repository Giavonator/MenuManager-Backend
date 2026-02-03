export type UnitCategory = "volume" | "weight" | "count";

export const VOLUME_UNITS = [
  "tsp",
  "tbsp",
  "cup",
  "fl oz",
  "pt",
  "qt",
  "gal",
  "ml",
  "l",
] as const;

export const WEIGHT_UNITS = [
  "oz",
  "lb",
  "g",
  "kg",
] as const;

export const COUNT_UNITS = [
  "each",
  "dozen",
  "package",
  "bag",
  "box",
  "can",
  "bottle",
] as const;

export type SupportedUnit =
  | (typeof VOLUME_UNITS)[number]
  | (typeof WEIGHT_UNITS)[number]
  | (typeof COUNT_UNITS)[number];

const volumeSet = new Set<string>(VOLUME_UNITS);
const weightSet = new Set<string>(WEIGHT_UNITS);
const countSet = new Set<string>(COUNT_UNITS);

export const getUnitCategory = (
  unit: string,
): UnitCategory | "unknown" => {
  if (volumeSet.has(unit)) return "volume";
  if (weightSet.has(unit)) return "weight";
  if (countSet.has(unit)) return "count";
  return "unknown";
};

export const isSupportedUnit = (unit: string): unit is SupportedUnit =>
  getUnitCategory(unit) !== "unknown";

// Base units used for conversion math:
// - volume: ml
// - weight: g
// - count: treated as 1:1 between all supported count units

const ML_PER_TSP = 4.92892159375;
const ML_PER_TBSP = ML_PER_TSP * 3;
const ML_PER_FL_OZ = 29.5735295625;
const ML_PER_CUP = 236.5882365;
const ML_PER_PINT = 473.176473;
const ML_PER_QUART = 946.352946;
const ML_PER_GALLON = 3785.411784;
const ML_PER_LITER = 1000;

const G_PER_OZ = 28.349523125;
const G_PER_LB = G_PER_OZ * 16;
const G_PER_KG = 1000;

const toBaseFromVolume: Record<string, number> = {
  "tsp": ML_PER_TSP,
  "tbsp": ML_PER_TBSP,
  "cup": ML_PER_CUP,
  "fl oz": ML_PER_FL_OZ,
  "pt": ML_PER_PINT,
  "qt": ML_PER_QUART,
  "gal": ML_PER_GALLON,
  "ml": 1,
  "l": ML_PER_LITER,
};

const toBaseFromWeight: Record<string, number> = {
  "oz": G_PER_OZ,
  "lb": G_PER_LB,
  "g": 1,
  "kg": G_PER_KG,
};

export const convertWithinCategory = (
  value: number,
  fromUnit: string,
  toUnit: string,
): number | null => {
  if (!Number.isFinite(value)) return null;

  const fromCategory = getUnitCategory(fromUnit);
  const toCategory = getUnitCategory(toUnit);

  if (fromCategory === "unknown" || toCategory === "unknown") {
    return null;
  }

  if (fromCategory !== toCategory) {
    return null;
  }

  // Count: all units treated as 1:1 for now.
  if (fromCategory === "count") {
    return value;
  }

  if (fromCategory === "volume") {
    const fromFactor = toBaseFromVolume[fromUnit];
    const toFactor = toBaseFromVolume[toUnit];
    if (!fromFactor || !toFactor) return null;
    const inBase = value * fromFactor;
    return inBase / toFactor;
  }

  if (fromCategory === "weight") {
    const fromFactor = toBaseFromWeight[fromUnit];
    const toFactor = toBaseFromWeight[toUnit];
    if (!fromFactor || !toFactor) return null;
    const inBase = value * fromFactor;
    return inBase / toFactor;
  }

  return null;
};
