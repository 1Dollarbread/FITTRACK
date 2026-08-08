"use client";

import AppShell from "@/components/AppShell";
import { EXERCISES, MUSCLE_GROUP_LABELS } from "@/lib/exercises";
import { MuscleGroup } from "@/lib/types";

export default function ExercisesPage() {
  const byMuscle = EXERCISES.reduce<Record<string, typeof EXERCISES>>((acc, ex) => {
    const key = ex.muscleGroup;
    (acc[key] ??= []).push(ex);
    return acc;
  }, {});

  const order = Object.keys(byMuscle) as MuscleGroup[];

  return (
    <AppShell title="Exercises">
      <main className="px-4 sm:px-6 lg:px-10 py-6 max-w-3xl mx-auto w-full">
        <h1 className="font-display font-bold text-2xl mb-2">Exercises</h1>
        <p className="text-sm text-muted mb-6">
          Catalog used by the swap engine and program builder.
        </p>
        <div className="space-y-4">
          {order.map((muscle) => (
            <section key={muscle} className="card p-5">
              <h2 className="font-display font-semibold mb-3">
                {MUSCLE_GROUP_LABELS[muscle] ?? muscle}
              </h2>
              <ul className="divide-y divide-border">
                {byMuscle[muscle].map((ex) => (
                  <li key={ex.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{ex.name}</span>
                    <span className="text-xs text-muted data-readout">
                      {ex.pattern}
                      {ex.isAccessory ? " · accessory" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
