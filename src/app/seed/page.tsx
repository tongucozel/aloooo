"use client";

import { useEffect, useState } from "react";

const TBO_WORKOUTS: Record<number, { title: string; exercises: { name: string; sets: number; reps: string; notes?: string }[]; notes?: string }> = {
  0: {
    title: "Chest & Triceps",
    notes: "Focus on mind-muscle connection. Rest 90s between sets.",
    exercises: [
      { name: "Bench Press", sets: 4, reps: "8-10", notes: "Controlled tempo, full range" },
      { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", notes: "30 degree angle" },
      { name: "Cable Fly", sets: 3, reps: "12-15", notes: "Squeeze at the top" },
      { name: "Dips", sets: 3, reps: "10-12", notes: "Lean forward for chest" },
      { name: "Tricep Pushdown", sets: 3, reps: "12-15" },
      { name: "Overhead Tricep Extension", sets: 3, reps: "10-12" },
    ],
  },
  1: {
    title: "Back & Biceps",
    notes: "Pull with your elbows, not your hands. Rest 90s.",
    exercises: [
      { name: "Deadlift", sets: 4, reps: "6-8", notes: "Keep back neutral, brace core" },
      { name: "Pull-ups", sets: 4, reps: "8-10", notes: "Full dead hang to chin over bar" },
      { name: "Barbell Row", sets: 3, reps: "10-12", notes: "Squeeze shoulder blades" },
      { name: "Seated Cable Row", sets: 3, reps: "12" },
      { name: "Barbell Curl", sets: 3, reps: "10-12" },
      { name: "Hammer Curl", sets: 3, reps: "12", notes: "Slow negative" },
    ],
  },
  2: {
    title: "Legs — Quad Focus",
    notes: "Go deep on squats. Don't skip the stretching after.",
    exercises: [
      { name: "Barbell Squat", sets: 4, reps: "8-10", notes: "Below parallel" },
      { name: "Leg Press", sets: 3, reps: "12", notes: "Feet shoulder width" },
      { name: "Walking Lunges", sets: 3, reps: "12 each", notes: "Hold dumbbells" },
      { name: "Leg Extension", sets: 3, reps: "15", notes: "Squeeze at the top" },
      { name: "Calf Raises", sets: 4, reps: "15-20" },
    ],
  },
  3: {
    title: "Shoulders & Abs",
    notes: "Light warm-up rotator cuff work before pressing.",
    exercises: [
      { name: "Overhead Press", sets: 4, reps: "8-10", notes: "Strict form, no leg drive" },
      { name: "Lateral Raise", sets: 4, reps: "15", notes: "Controlled, slight lean" },
      { name: "Face Pull", sets: 3, reps: "15", notes: "High pull, external rotate" },
      { name: "Reverse Fly", sets: 3, reps: "12-15" },
      { name: "Hanging Leg Raise", sets: 3, reps: "12" },
      { name: "Cable Crunch", sets: 3, reps: "15" },
    ],
  },
  4: {
    title: "Legs — Hamstring & Glute Focus",
    notes: "Hip hinge movements. Feel the stretch in hamstrings.",
    exercises: [
      { name: "Romanian Deadlift", sets: 4, reps: "10-12", notes: "Slow eccentric, feel the stretch" },
      { name: "Hip Thrust", sets: 4, reps: "10-12", notes: "Pause at top, squeeze glutes" },
      { name: "Bulgarian Split Squat", sets: 3, reps: "10 each", notes: "Rear foot elevated" },
      { name: "Lying Leg Curl", sets: 3, reps: "12-15" },
      { name: "Glute Kickback", sets: 3, reps: "12 each" },
    ],
  },
  5: {
    title: "Arms & Core",
    notes: "Pump day. Higher reps, shorter rest (60s).",
    exercises: [
      { name: "Close Grip Bench Press", sets: 3, reps: "10-12" },
      { name: "EZ Bar Curl", sets: 3, reps: "12" },
      { name: "Skull Crusher", sets: 3, reps: "12" },
      { name: "Incline Dumbbell Curl", sets: 3, reps: "12", notes: "Full stretch at bottom" },
      { name: "Plank", sets: 3, reps: "45-60s" },
      { name: "Russian Twist", sets: 3, reps: "20" },
    ],
  },
  6: {
    title: "Active Recovery",
    notes: "Light cardio, stretching, foam rolling. Listen to your body.",
    exercises: [
      { name: "Light Jog / Walk", sets: 1, reps: "20 min" },
      { name: "Full Body Stretch", sets: 1, reps: "15 min" },
      { name: "Foam Rolling", sets: 1, reps: "10 min" },
    ],
  },
};

export default function SeedPage() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Seed TBO workouts
    const workouts: Record<number, unknown> = {};
    for (const [day, w] of Object.entries(TBO_WORKOUTS)) {
      workouts[Number(day)] = {
        id: `local-tbo-${day}`,
        day_of_week: Number(day),
        person: "tbo",
        title: w.title,
        exercises: w.exercises,
        notes: w.notes || null,
        updated_at: new Date().toISOString(),
      };
    }
    localStorage.setItem("zdbfit_workouts_tbo", JSON.stringify(workouts));
    setDone(true);
  }, []);

  if (!done) return null;

  return (
    <main className="max-w-md mx-auto px-4 pt-20 text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-card bg-success flex items-center justify-center shadow-[0_0_24px_rgba(52,211,153,0.3)]">
        <svg className="w-8 h-8 text-brand-deep" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-extrabold text-text-primary mb-2">Done!</h1>
      <p className="text-text-muted text-sm mb-8">
        TBO workout program loaded — 7 days, full PPL split.
      </p>
      <a href="/" className="btn-primary px-8 py-3 text-sm inline-block">
        Open App
      </a>
    </main>
  );
}
