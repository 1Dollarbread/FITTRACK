"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { formatWeight, toDisplayValue, type WeightUnit } from "@/lib/weightUnits";

export type { WeightUnit } from "@/lib/weightUnits";

interface WeightUnitContextValue {
  unit: WeightUnit;
  toggleUnit: () => void;
  setUnit: (unit: WeightUnit) => void;
  displayWeight: (kg: number) => string;
  toDisplayValue: (kg: number) => number;
  toKg: (value: number) => number;
}

const STORAGE_KEY = "po-weight-unit";

const WeightUnitContext = createContext<WeightUnitContextValue | null>(null);

export function WeightUnitProvider({ children }: { children: ReactNode }) {
  const [unit, setUnitState] = useState<WeightUnit>("kg");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "kg" || stored === "lb") {
      setUnitState(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, unit);
  }, [unit]);

  const setUnit = useCallback((next: WeightUnit) => {
    setUnitState(next);
  }, []);

  const toggleUnit = useCallback(() => {
    setUnitState((prev) => (prev === "kg" ? "lb" : "kg"));
  }, []);

  const displayWeight = useCallback(
    (kg: number) => formatWeight(kg, unit),
    [unit]
  );

  const toDisplayValueForUnit = useCallback(
    (kg: number) => toDisplayValue(kg, unit),
    [unit]
  );

  const toKg = useCallback(
    (value: number) => (unit === "lb" ? Math.ceil(value / 2.20462262185) : Math.ceil(value)),
    [unit]
  );

  const value = useMemo<WeightUnitContextValue>(
    () => ({ unit, toggleUnit, setUnit, displayWeight, toDisplayValue: toDisplayValueForUnit, toKg }),
    [displayWeight, setUnit, toDisplayValueForUnit, toKg, toggleUnit, unit]
  );

  return <WeightUnitContext.Provider value={value}>{children}</WeightUnitContext.Provider>;
}

export function useWeightUnit() {
  const ctx = useContext(WeightUnitContext);
  if (!ctx) throw new Error("useWeightUnit must be used within WeightUnitProvider");
  return ctx;
}
