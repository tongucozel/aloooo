"use client";

import { useEffect, useState } from "react";
import { getSupabase, DAYS, type Workout, type Exercise } from "@/lib/supabase";

const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || "1234";

const emptyExercise: Exercise = { name: "", sets: 3, reps: "10", notes: "" };

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  function handlePin() {
    if (pin === ADMIN_PIN) {
      setAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  }

  useEffect(() => {
    if (authenticated) {
      fetchWorkout(selectedDay);
    }
  }, [selectedDay, authenticated]);

  async function fetchWorkout(day: number) {
    setLoading(true);
    const { data } = await getSupabase()
      .from("workouts")
      .select("*")
      .eq("day_of_week", day)
      .single();

    if (data) {
      setTitle(data.title || "");
      setNotes(data.notes || "");
      setExercises(data.exercises || []);
    } else {
      setTitle("");
      setNotes("");
      setExercises([]);
    }
    setLoading(false);
  }

  function addExercise() {
    setExercises([...exercises, { ...emptyExercise }]);
  }

  function updateExercise(index: number, field: keyof Exercise, value: string | number) {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  }

  function removeExercise(index: number) {
    setExercises(exercises.filter((_, i) => i !== index));
  }

  function moveExercise(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= exercises.length) return;
    const updated = [...exercises];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setExercises(updated);
  }

  async function saveWorkout() {
    setSaving(true);
    setSaved(false);

    const cleanExercises = exercises
      .filter((e) => e.name.trim() !== "")
      .map((e) => ({
        name: e.name.trim(),
        sets: Number(e.sets),
        reps: String(e.reps),
        notes: e.notes?.trim() || "",
      }));

    const payload = {
      day_of_week: selectedDay,
      title: title.trim(),
      exercises: cleanExercises,
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const sb = getSupabase();
    const { data: existing } = await sb
      .from("workouts")
      .select("id")
      .eq("day_of_week", selectedDay)
      .single();

    if (existing) {
      await sb.from("workouts").update(payload).eq("id", existing.id);
    } else {
      await sb.from("workouts").insert(payload);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // PIN Screen
  if (!authenticated) {
    return (
      <main className="max-w-md mx-auto px-4 pt-20 text-center">
        <div className="text-5xl mb-6">🔒</div>
        <h1 className="text-2xl font-bold text-primary-700 mb-2">
          Coach Access
        </h1>
        <p className="text-gray-400 text-sm mb-8">Enter your PIN</p>
        <div className="flex justify-center gap-2 mb-4">
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setPinError(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && handlePin()}
            className={`w-48 text-center text-2xl tracking-[0.5em] py-3 rounded-2xl border-2 bg-white outline-none transition-colors ${
              pinError
                ? "border-red-400 text-red-500"
                : "border-primary-200 focus:border-primary-500 text-gray-800"
            }`}
            placeholder="----"
            autoFocus
          />
        </div>
        {pinError && (
          <p className="text-red-400 text-sm mb-4">Wrong PIN</p>
        )}
        <button
          onClick={handlePin}
          className="bg-primary-600 text-white px-8 py-3 rounded-2xl font-medium shadow-lg shadow-primary-600/30 hover:bg-primary-700 transition-colors"
        >
          Enter
        </button>
      </main>
    );
  }

  // Admin Panel
  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-8 safe-bottom">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary-700">Coach Panel</h1>
          <p className="text-sm text-primary-400">Edit workout programs</p>
        </div>
        <a
          href="/"
          className="text-sm text-primary-500 bg-primary-50 px-3 py-1.5 rounded-xl hover:bg-primary-100 transition-colors"
        >
          View App
        </a>
      </div>

      {/* Day Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {DAYS.map((day, i) => (
          <button
            key={day}
            onClick={() => setSelectedDay(i)}
            className={`flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium transition-all ${
              selectedDay === i
                ? "bg-primary-600 text-white shadow-lg shadow-primary-600/30"
                : "bg-white text-gray-500 border border-gray-200"
            }`}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Workout Title */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Workout Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Upper Body Power"
              className="w-full mt-1 px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-800 outline-none focus:border-primary-400 transition-colors"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Day Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for the day..."
              rows={2}
              className="w-full mt-1 px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-800 outline-none focus:border-primary-400 transition-colors resize-none"
            />
          </div>

          {/* Exercises */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Exercises
              </label>
              <span className="text-xs text-gray-400">
                {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-3">
              {exercises.map((exercise, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-7 h-7 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveExercise(index, -1)}
                        disabled={index === 0}
                        className="p-1.5 text-gray-300 hover:text-gray-500 disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveExercise(index, 1)}
                        disabled={index === exercises.length - 1}
                        className="p-1.5 text-gray-300 hover:text-gray-500 disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeExercise(index)}
                        className="p-1.5 text-red-300 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={exercise.name}
                    onChange={(e) => updateExercise(index, "name", e.target.value)}
                    placeholder="Exercise name"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-800 outline-none focus:border-primary-400 mb-2"
                  />

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-400 uppercase">
                        Sets
                      </label>
                      <input
                        type="number"
                        value={exercise.sets}
                        onChange={(e) =>
                          updateExercise(index, "sets", parseInt(e.target.value) || 0)
                        }
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-800 outline-none focus:border-primary-400"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-400 uppercase">
                        Reps
                      </label>
                      <input
                        type="text"
                        value={exercise.reps}
                        onChange={(e) =>
                          updateExercise(index, "reps", e.target.value)
                        }
                        placeholder="8-10"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-800 outline-none focus:border-primary-400"
                      />
                    </div>
                  </div>

                  <input
                    type="text"
                    value={exercise.notes || ""}
                    onChange={(e) =>
                      updateExercise(index, "notes", e.target.value)
                    }
                    placeholder="Notes (optional)"
                    className="w-full mt-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-400 outline-none focus:border-primary-400"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={addExercise}
              className="w-full mt-3 py-3 rounded-2xl border-2 border-dashed border-primary-200 text-primary-500 text-sm font-medium hover:bg-primary-50 transition-colors"
            >
              + Add Exercise
            </button>
          </div>

          {/* Save Button */}
          <button
            onClick={saveWorkout}
            disabled={saving}
            className={`w-full py-4 rounded-2xl font-semibold text-white shadow-lg transition-all ${
              saved
                ? "bg-green-500 shadow-green-500/30"
                : "bg-primary-600 shadow-primary-600/30 hover:bg-primary-700"
            } disabled:opacity-70`}
          >
            {saving ? "Saving..." : saved ? "Saved!" : `Save ${DAYS[selectedDay]}`}
          </button>
        </div>
      )}
    </main>
  );
}
