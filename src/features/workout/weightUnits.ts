import type { WeightDisplayUnit } from './model';

const KG_PER_LB = 0.45359237;

function roundCanonicalKg(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function displayWeightToKg(value: number, unit: WeightDisplayUnit): number {
  return roundCanonicalKg(unit === 'KG' ? value : value * KG_PER_LB);
}

export function kgToDisplayWeight(valueKg: number, unit: WeightDisplayUnit): number {
  const value = unit === 'KG' ? valueKg : valueKg / KG_PER_LB;
  return Math.round(value * 100) / 100;
}

export function formatWeightInput(valueKg: number | null, unit: WeightDisplayUnit): string {
  if (valueKg === null) return '';
  return String(kgToDisplayWeight(valueKg, unit));
}

export function weightUnitLabel(unit: WeightDisplayUnit): string {
  return unit === 'KG' ? 'kg' : 'lb';
}
