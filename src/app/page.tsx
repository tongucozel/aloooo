"use client";

import { useEffect, useState, useCallback } from "react";
import {
  fetchWorkout,
  getExerciseLogs,
  saveExerciseLogs,
  getLogHistoryFromSupabase,
  retryPendingSync,
  syncTodayToSupabase,
  syncAllLocalLogsToSupabase,
  updateLastSeen,
  weekRange,
  getSupabase,
  isDemoMode,
  DAYS,
  PROFILES,
  type Person,
  type Workout,
  type Exercise,
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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Load saved profile on mount + retry pending syncs
  useEffect(() => {
    const saved = localStorage.getItem("zdbfit_person") as Person | null;
    if (saved && (saved === "zdb" || saved === "tbo")) {
      setPerson(saved);
      updateLastSeen(saved);
    }
    retryPendingSync();
    syncAllLocalLogsToSupabase();
  }, []);

  function selectPerson(p: Person) {
    localStorage.setItem("zdbfit_person", p);
    setPerson(p);
    updateLastSeen(p);
  }

  const loadDay = useCallback(
    async (day: number, p: Person, silent = false) => {
      if (!silent) setLoading(true);
      const data = await fetchWorkout(day, p);
      setWorkout(data);

      if (data && data.exercises.length > 0) {
        const saved = await getExerciseLogs(day, p);
        const filled: ExerciseLog[] = data.exercises.map((ex, i) => ({
          name: saved[i]?.name || ex.name,
          completed: saved[i]?.completed ?? false,
          kg: saved[i]?.kg ?? "",
        }));
        setLogs((prev) => (JSON.stringify(prev) === JSON.stringify(filled) ? prev : filled));
        setHistory(await getLogHistoryFromSupabase(day, p));
        syncTodayToSupabase(day, p);
      } else {
        setLogs([]);
        setHistory([]);
      }
      if (!silent) setLoading(false);
    },
    []
  );

  useEffect(() => {
    if (person) {
      loadDay(selectedDay, person);
      setShowHistory(false);
    }
  }, [selectedDay, person, loadDay]);

  // Realtime: live-update when the same person's logs change on another device
  useEffect(() => {
    if (!person || isDemoMode()) return;
    const sb = getSupabase();
    const channel = sb
      .channel(`workout_logs_${person}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workout_logs",
          filter: `person=eq.${person}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as
            | { day_of_week?: number; log_date?: string; exercise_logs?: ExerciseLog[] }
            | null;
          if (!row || row.day_of_week !== selectedDay) return;
          const { start, end } = weekRange();
          if (!row.log_date || row.log_date < start || row.log_date > end) return;
          loadDay(selectedDay, person, true);
        }
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [person, selectedDay, loadDay]);

  // Refresh on tab/app focus so cross-device changes appear without realtime push
  useEffect(() => {
    if (!person) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        loadDay(selectedDay, person, true);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [person, selectedDay, loadDay]);

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

  function updateName(index: number, name: string) {
    if (!person) return;
    const updated = [...logs];
    updated[index] = { ...updated[index], name };
    setLogs(updated);
    saveExerciseLogs(selectedDay, person, updated);
  }

  const completedCount = logs.filter((l) => l.completed).length;
  const totalCount = workout?.exercises.length ?? 0;

  const BODY_STATS: Record<Person, { weight: number }> = {
    zdb: { weight: 57 },
    tbo: { weight: 80 },
  };

  function estimateCalories(exercises: Exercise[]): number {
    if (!person) return 0;
    const weight = BODY_STATS[person].weight;
    let totalMinutes = 0;
    let weightedMET = 0;

    for (const ex of exercises) {
      const name = ex.name.toLowerCase();
      let met = 3.5;
      let duration = ex.sets * 1.5;

      if (name.includes("treadmill") || name.includes("walk")) {
        met = 6.0;
        const minMatch = String(ex.reps).match(/(\d+)\s*min/);
        if (minMatch) duration = parseInt(minMatch[1]);
      } else if (name.includes("rowing machine")) {
        met = 7.0;
        duration = ex.sets * 2;
      } else if (/squat|leg press|hip thrust|deadlift|lunge|glute bridge/i.test(name)) {
        met = 5.0;
      } else if (/pulldown|row|chest press|bench|shoulder press/i.test(name)) {
        met = 4.5;
      } else if (/curl|raise|extension|kickback|face pull|abduction/i.test(name)) {
        met = 3.5;
      } else if (/knee raise|plank|crunch|hang/i.test(name)) {
        met = 3.8;
      }

      totalMinutes += duration;
      weightedMET += met * duration;
    }

    if (totalMinutes === 0) return 0;
    const avgMET = weightedMET / totalMinutes;
    return Math.round(avgMET * weight * (totalMinutes / 60));
  }

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
                <div className="mt-3">
                  <p className="text-brand-deep/80 text-sm font-bold">
                    All done! Great work
                  </p>
                  <p className="text-brand-deep/70 text-xs mt-1 font-semibold">
                    ~{estimateCalories(workout.exercises)} kcal burned
                  </p>
                </div>
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
                    {editingIndex === index ? (
                      <input
                        autoFocus
                        type="text"
                        value={log.name}
                        onChange={(e) => updateName(index, e.target.value)}
                        onBlur={() => setEditingIndex(null)}
                        onKeyDown={(e) => { if (e.key === "Enter") setEditingIndex(null); }}
                        className="w-full font-bold text-text-primary bg-transparent border-b border-accent-DEFAULT outline-none pb-0.5"
                      />
                    ) : (
                      <h4
                        onClick={() => setEditingIndex(index)}
                        className={`font-bold transition-colors cursor-pointer ${log.completed ? "text-text-muted line-through" : "text-text-primary"}`}
                      >
                        {log.name}
                        {log.name !== exercise.name && (
                          <span className="ml-1.5 text-[10px] font-normal text-accent-DEFAULT/60 no-underline inline-block">edited</span>
                        )}
                      </h4>
                    )}
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
