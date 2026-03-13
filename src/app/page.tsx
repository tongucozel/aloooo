"use client";

import { useEffect, useState, useCallback } from "react";
import {
  fetchWorkout,
  getExerciseLogs,
  saveExerciseLogs,
  getLogHistory,
  DAYS,
  PROFILES,
  type Person,
  type Workout,
  type ExerciseLog,
  type DayLog,
} from "@/lib/supabase";

export default function Home() {
  const today = new Date().getDay();
  const todayIndex = today === 0 ? 6 : today - 1;

  const [person, setPerson] = useState<Person | null>(null);
  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [history, setHistory] = useState<DayLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load saved profile on mount
  useEffect(() => {
    const saved = localStorage.getItem("zdbfit_person") as Person | null;
    if (saved && (saved === "zdb" || saved === "tbo")) {
      setPerson(saved);
    }
  }, []);

  function selectPerson(p: Person) {
    localStorage.setItem("zdbfit_person", p);
    setPerson(p);
  }

  const loadDay = useCallback(
    async (day: number, p: Person) => {
      setLoading(true);
      const data = await fetchWorkout(day, p);
      setWorkout(data);

      if (data && data.exercises.length > 0) {
        const saved = getExerciseLogs(day, p);
        const filled: ExerciseLog[] = data.exercises.map((ex, i) => ({
          name: ex.name,
          completed: saved[i]?.completed ?? false,
          kg: saved[i]?.kg ?? "",
        }));
        setLogs(filled);
        setHistory(getLogHistory(day, p));
      } else {
        setLogs([]);
        setHistory([]);
      }
      setLoading(false);
    },
    []
  );

  useEffect(() => {
    if (person) {
      loadDay(selectedDay, person);
      setShowHistory(false);
    }
  }, [selectedDay, person, loadDay]);

  function toggleComplete(index: number) {
    if (!person) return;
    const updated = [...logs];
    updated[index] = { ...updated[index], completed: !updated[index].completed };
    setLogs(updated);
    saveExerciseLogs(selectedDay, person, updated);
  }

  function updateKg(index: number, kg: string) {
    if (!person) return;
    const updated = [...logs];
    updated[index] = { ...updated[index], kg };
    setLogs(updated);
    saveExerciseLogs(selectedDay, person, updated);
  }

  const completedCount = logs.filter((l) => l.completed).length;
  const totalCount = workout?.exercises.length ?? 0;

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // ===== PROFILE SELECTOR =====
  if (!person) {
    return (
      <main className="max-w-md mx-auto px-4 pt-20 text-center safe-bottom">
        <h1 className="text-4xl font-extrabold text-gradient mb-2">hialooo</h1>
        <p className="text-text-muted text-sm mb-12">Who&apos;s training today?</p>

        <div className="flex gap-4 justify-center">
          {(["zdb", "tbo"] as Person[]).map((p) => (
            <button
              key={p}
              onClick={() => selectPerson(p)}
              className="group flex flex-col items-center gap-3"
            >
              <div className="w-24 h-24 rounded-card gradient-accent flex items-center justify-center shadow-glow group-hover:shadow-glow-strong group-hover:scale-105 transition-all duration-200">
                <span className="text-2xl font-extrabold text-brand-deep">
                  {PROFILES[p].initials}
                </span>
              </div>
              <span className="text-sm font-bold text-text-secondary group-hover:text-text-primary transition-colors">
                {PROFILES[p].label}
              </span>
            </button>
          ))}
        </div>
      </main>
    );
  }

  // ===== WORKOUT VIEW =====
  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-8 safe-bottom">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gradient">hialooo</h1>
          <p className="text-xs text-text-muted mt-0.5">Your workout plan</p>
        </div>

        {/* Profile Switcher */}
        <div className="flex gap-1 glass-card-strong !rounded-btn p-1">
          {(["zdb", "tbo"] as Person[]).map((p) => (
            <button
              key={p}
              onClick={() => selectPerson(p)}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all ${
                person === p
                  ? "gradient-accent text-brand-deep shadow-glow"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {PROFILES[p].initials}
            </button>
          ))}
        </div>
      </div>

      {/* Day Selector */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
        {DAYS.map((day, i) => (
          <button
            key={day}
            onClick={() => setSelectedDay(i)}
            className={`flex-shrink-0 px-4 py-2.5 rounded-btn text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              selectedDay === i
                ? "gradient-accent text-brand-deep shadow-glow scale-105"
                : i === todayIndex
                ? "glass-card-strong text-accent-DEFAULT"
                : "glass-card text-text-muted hover:text-text-secondary"
            }`}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      {/* Day Title */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-text-primary">
          {DAYS[selectedDay]}
          {selectedDay === todayIndex && (
            <span className="ml-2 pill bg-accent-soft text-accent-DEFAULT">
              Today
            </span>
          )}
        </h2>
        {totalCount > 0 && (
          <span className="text-xs font-semibold text-text-muted">
            {completedCount}/{totalCount}
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent-soft border-t-accent-DEFAULT rounded-full animate-spin" />
        </div>
      ) : workout && workout.exercises.length > 0 ? (
        <div className="space-y-3">
          {/* Workout Title Card */}
          {workout.title && (
            <div className="gradient-accent rounded-card p-5 shadow-glow">
              <h3 className="font-extrabold text-lg text-brand-deep">
                {workout.title}
              </h3>
              {workout.notes && (
                <p className="text-brand-deep/70 text-sm mt-1">{workout.notes}</p>
              )}
              {completedCount === totalCount && totalCount > 0 ? (
                <p className="text-brand-deep/80 text-xs mt-2 font-bold">
                  All done! Great work
                </p>
              ) : (
                <p className="text-brand-deep/60 text-xs mt-3">
                  {totalCount} exercise{totalCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}

          {/* Progress Bar — only show when started */}
          {completedCount > 0 && (
            <div className="glass-card p-2.5">
              <div className="w-full h-1.5 bg-brand-surface rounded-full overflow-hidden">
                <div
                  className="h-full gradient-accent rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(completedCount / totalCount) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Exercises */}
          {workout.exercises.map((exercise, index) => {
            const log = logs[index] || { name: exercise.name, completed: false, kg: "" };
            return (
              <div
                key={index}
                className={`glass-card p-4 transition-all duration-200 ${
                  log.completed ? "border-success/30" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleComplete(index)}
                    className={`w-9 h-9 rounded-btn flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-200 ${
                      log.completed
                        ? "bg-success text-brand-deep shadow-[0_0_16px_rgba(52,211,153,0.3)]"
                        : "bg-accent-soft text-accent-DEFAULT hover:bg-accent-soft/50"
                    }`}
                  >
                    {log.completed ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-sm font-bold">{index + 1}</span>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <h4 className={`font-bold transition-colors ${log.completed ? "text-text-muted line-through" : "text-text-primary"}`}>
                      {exercise.name}
                    </h4>
                    <div className="flex gap-4 mt-1.5">
                      <span className="text-sm text-text-muted">
                        <span className="font-semibold text-accent-DEFAULT">{exercise.sets}</span> sets
                      </span>
                      <span className="text-sm text-text-muted">
                        <span className="font-semibold text-accent-DEFAULT">{exercise.reps}</span> reps
                      </span>
                    </div>
                    {exercise.notes && (
                      <p className="text-xs text-text-muted mt-1.5 italic opacity-70">{exercise.notes}</p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={log.kg}
                        onChange={(e) => updateKg(index, e.target.value)}
                        placeholder="0"
                        className="w-20 px-3 py-1.5 input-dark text-sm text-center"
                      />
                      <span className="text-xs text-text-muted font-semibold uppercase tracking-wider">kg</span>
                      <button
                        onClick={() => toggleComplete(index)}
                        className={`ml-auto px-4 py-1.5 rounded-btn text-xs font-bold transition-all duration-200 ${
                          log.completed
                            ? "bg-success text-brand-deep shadow-[0_0_12px_rgba(52,211,153,0.25)]"
                            : "bg-accent-soft text-accent-DEFAULT hover:bg-accent-soft/80"
                        }`}
                      >
                        {log.completed ? "Done ✓" : "Done"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* History Toggle */}
          {history.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full py-3 text-sm text-accent-DEFAULT font-semibold hover:text-accent-bright transition-colors flex items-center justify-center gap-2"
            >
              {showHistory ? "Hide" : "Show"} Previous Sessions ({history.length})
              <span className={`transition-transform duration-200 text-xs ${showHistory ? "rotate-180" : ""}`}>▼</span>
            </button>
          )}

          {/* History Section */}
          {showHistory && history.length > 0 && (
            <div className="space-y-3">
              {history.map((dayLog) => (
                <div key={dayLog.date} className="glass-card p-4 opacity-80">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-text-secondary">{formatDate(dayLog.date)}</h4>
                    <span className="pill bg-accent-soft text-accent-DEFAULT">
                      {dayLog.exercises.filter((e) => e.completed).length}/{dayLog.exercises.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {dayLog.exercises.map((ex, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-4 h-4 rounded flex items-center justify-center text-[9px] ${ex.completed ? "bg-success text-brand-deep" : "bg-brand-surface-2 text-text-muted"}`}>
                            {ex.completed ? "✓" : ""}
                          </span>
                          <span className={ex.completed ? "text-text-secondary" : "text-text-muted"}>{ex.name}</span>
                        </div>
                        {ex.kg ? (
                          <span className="text-xs font-bold text-accent-DEFAULT">{ex.kg} kg</span>
                        ) : (
                          <span className="text-xs text-text-muted/40">—</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-center text-xs text-text-muted/40 pt-4">
            Updated{" "}
            {new Date(workout.updated_at).toLocaleDateString("en-US", {
              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">
            {selectedDay === 6 || selectedDay === 5 ? "\u{1F9D8}\u200D\u2640\uFE0F" : "\u{1F4AA}"}
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2">
            {selectedDay === 6 || selectedDay === 5 ? "Rest Day" : "No workout yet"}
          </h3>
          <p className="text-text-muted text-sm">
            {selectedDay === 6 || selectedDay === 5
              ? "Recovery is part of the process!"
              : "Your trainer hasn't added a workout for this day yet."}
          </p>
        </div>
      )}
    </main>
  );
}
