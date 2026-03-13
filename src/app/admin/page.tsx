"use client";

import { useEffect, useState } from "react";
import {
  fetchWorkout,
  saveWorkout,
  getLogHistoryFromSupabase,
  isDemoMode,
  DAYS,
  PROFILES,
  type Person,
  type Exercise,
  type DayLog,
} from "@/lib/supabase";

const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || "1234";
const emptyExercise: Exercise = { name: "", sets: 3, reps: "10", notes: "" };

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [person, setPerson] = useState<Person>("zdb");
  const [selectedDay, setSelectedDay] = useState(0);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demo, setDemo] = useState(false);
  const [tab, setTab] = useState<"program" | "history">("program");
  const [history, setHistory] = useState<DayLog[]>([]);

  useEffect(() => { setDemo(isDemoMode()); }, []);

  function handlePin() {
    if (pin === ADMIN_PIN) { setAuthenticated(true); setPinError(false); }
    else setPinError(true);
  }

  useEffect(() => {
    if (authenticated) loadDay(selectedDay, person);
  }, [selectedDay, person, authenticated]);

  async function loadDay(day: number, p: Person) {
    setLoading(true);
    const data = await fetchWorkout(day, p);
    if (data) {
      setTitle(data.title || "");
      setNotes(data.notes || "");
      setExercises(data.exercises || []);
    } else {
      setTitle("");
      setNotes("");
      setExercises([]);
    }
    const logs = await getLogHistoryFromSupabase(day, p);
    setHistory(logs);
    setLoading(false);
  }

  function addExercise() { setExercises([...exercises, { ...emptyExercise }]); }
  function updateExercise(i: number, field: keyof Exercise, value: string | number) {
    const u = [...exercises]; u[i] = { ...u[i], [field]: value }; setExercises(u);
  }
  function removeExercise(i: number) { setExercises(exercises.filter((_, idx) => idx !== i)); }
  function moveExercise(i: number, dir: -1 | 1) {
    const ni = i + dir;
    if (ni < 0 || ni >= exercises.length) return;
    const u = [...exercises]; [u[i], u[ni]] = [u[ni], u[i]]; setExercises(u);
  }

  async function handleSave() {
    setSaving(true); setSaved(false);
    const clean = exercises
      .filter((e) => e.name.trim() !== "")
      .map((e) => ({ name: e.name.trim(), sets: Number(e.sets), reps: String(e.reps), notes: e.notes?.trim() || "" }));
    await saveWorkout(selectedDay, person, title, clean, notes || null);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  // ===== PIN SCREEN =====
  if (!authenticated) {
    return (
      <main className="max-w-md mx-auto px-4 pt-24 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-card gradient-accent flex items-center justify-center shadow-glow">
          <svg className="w-7 h-7 text-brand-deep" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold text-gradient mb-2">Coach Access</h1>
        <p className="text-text-muted text-sm mb-8">Enter your PIN</p>
        <div className="flex justify-center mb-4">
          <input
            type="password" inputMode="numeric" maxLength={6} value={pin}
            onChange={(e) => { setPin(e.target.value); setPinError(false); }}
            onKeyDown={(e) => e.key === "Enter" && handlePin()}
            className={`w-48 text-center text-2xl tracking-[0.5em] py-3 input-dark ${pinError ? "!border-danger" : ""}`}
            placeholder="----" autoFocus
          />
        </div>
        {pinError && <p className="text-danger text-sm mb-4 font-medium">Wrong PIN</p>}
        <button onClick={handlePin} className="btn-primary px-10 py-3 text-sm">Enter</button>
        <p className="text-text-muted/40 text-xs mt-8">Default PIN: 1234</p>
      </main>
    );
  }

  // ===== ADMIN PANEL =====
  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-8 safe-bottom">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-gradient">Coach Panel</h1>
          <p className="text-sm text-text-muted mt-0.5">Edit workout programs</p>
        </div>
        <a href="/" className="btn-ghost px-3 py-1.5 text-sm font-medium">View App</a>
      </div>

      {demo && (
        <div className="glass-card p-3 mb-4 border-accent-gold/20">
          <p className="text-xs text-accent-gold font-medium">Demo mode — data saved in browser.</p>
        </div>
      )}

      {/* Person Selector */}
      <div className="flex gap-1 glass-card-strong !rounded-btn p-1 mb-4">
        {(["zdb", "tbo"] as Person[]).map((p) => (
          <button
            key={p}
            onClick={() => setPerson(p)}
            className={`flex-1 py-2.5 text-sm font-bold rounded-[8px] transition-all ${
              person === p
                ? "gradient-accent text-brand-deep shadow-glow"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {PROFILES[p].label}
          </button>
        ))}
      </div>

      {/* Day Selector */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {DAYS.map((day, i) => (
          <button
            key={day}
            onClick={() => setSelectedDay(i)}
            className={`flex-shrink-0 px-3 py-2 rounded-btn text-xs font-bold uppercase tracking-wider transition-all ${
              selectedDay === i
                ? "gradient-accent text-brand-deep shadow-glow"
                : "glass-card text-text-muted hover:text-text-secondary"
            }`}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      {/* Tab Selector */}
      <div className="flex gap-1 glass-card-strong !rounded-btn p-1 mb-6">
        <button
          onClick={() => setTab("program")}
          className={`flex-1 py-2.5 text-sm font-bold rounded-[8px] transition-all ${
            tab === "program" ? "gradient-accent text-brand-deep shadow-glow" : "text-text-muted hover:text-text-secondary"
          }`}
        >
          Program
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex-1 py-2.5 text-sm font-bold rounded-[8px] transition-all flex items-center justify-center gap-1.5 ${
            tab === "history" ? "gradient-accent text-brand-deep shadow-glow" : "text-text-muted hover:text-text-secondary"
          }`}
        >
          {PROFILES[person].label}&apos;s Progress
          {history.length > 0 && (
            <span className={`pill text-[9px] py-0 px-1.5 ${
              tab === "history" ? "bg-brand-deep/20 text-brand-deep" : "bg-accent-soft text-accent-DEFAULT"
            }`}>{history.length}</span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent-soft border-t-accent-DEFAULT rounded-full animate-spin" />
        </div>
      ) : tab === "program" ? (
        /* ===== PROGRAM TAB ===== */
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-1.5 block">Workout Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Upper Body Power" className="w-full px-4 py-3 input-dark" />
          </div>

          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-1.5 block">Day Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..." rows={2} className="w-full px-4 py-3 input-dark resize-none" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Exercises</label>
              <span className="text-xs text-text-muted/60">{exercises.length} exercise{exercises.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="space-y-3">
              {exercises.map((exercise, index) => (
                <div key={index} className="glass-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-7 h-7 gradient-accent rounded-lg flex items-center justify-center text-xs font-extrabold text-brand-deep">{index + 1}</span>
                    <div className="flex gap-1">
                      <button onClick={() => moveExercise(index, -1)} disabled={index === 0} className="p-1.5 text-text-muted/40 hover:text-text-muted disabled:opacity-20 transition-colors">↑</button>
                      <button onClick={() => moveExercise(index, 1)} disabled={index === exercises.length - 1} className="p-1.5 text-text-muted/40 hover:text-text-muted disabled:opacity-20 transition-colors">↓</button>
                      <button onClick={() => removeExercise(index)} className="p-1.5 text-danger/50 hover:text-danger transition-colors">✕</button>
                    </div>
                  </div>
                  <input type="text" value={exercise.name} onChange={(e) => updateExercise(index, "name", e.target.value)}
                    placeholder="Exercise name" className="w-full px-3 py-2 input-dark text-sm mb-2" />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[9px] text-text-muted/60 uppercase tracking-widest font-bold">Sets</label>
                      <input type="number" value={exercise.sets} onChange={(e) => updateExercise(index, "sets", parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 input-dark text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] text-text-muted/60 uppercase tracking-widest font-bold">Reps</label>
                      <input type="text" value={exercise.reps} onChange={(e) => updateExercise(index, "reps", e.target.value)}
                        placeholder="8-10" className="w-full px-3 py-2 input-dark text-sm" />
                    </div>
                  </div>
                  <input type="text" value={exercise.notes || ""} onChange={(e) => updateExercise(index, "notes", e.target.value)}
                    placeholder="Notes (optional)" className="w-full mt-2 px-3 py-2 input-dark text-sm" />
                </div>
              ))}
            </div>

            <button onClick={addExercise}
              className="w-full mt-3 py-3 rounded-btn border border-dashed border-accent-border text-accent-DEFAULT text-sm font-bold hover:bg-accent-soft transition-colors">
              + Add Exercise
            </button>
          </div>

          <button onClick={handleSave} disabled={saving}
            className={`w-full py-4 rounded-btn font-extrabold text-sm tracking-wide transition-all ${
              saved ? "bg-success text-brand-deep shadow-[0_0_24px_rgba(52,211,153,0.3)]" : "btn-primary shadow-glow"
            } disabled:opacity-70`}>
            {saving ? "Saving..." : saved ? "Saved!" : `Save ${PROFILES[person].label} — ${DAYS[selectedDay]}`}
          </button>
        </div>
      ) : (
        /* ===== HISTORY TAB ===== */
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-text-secondary">
            {PROFILES[person].label} — {DAYS[selectedDay]}
          </h3>

          {history.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 mx-auto mb-4 glass-card-strong flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-text-muted text-sm">No sessions logged yet.</p>
              <p className="text-text-muted/40 text-xs mt-1">Data will appear once {PROFILES[person].label} starts working out.</p>
            </div>
          ) : (
            history.map((dayLog) => {
              const done = dayLog.exercises.filter((e) => e.completed).length;
              const total = dayLog.exercises.length;
              return (
                <div key={dayLog.date} className="glass-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-text-primary">{formatDate(dayLog.date)}</h4>
                    <span className={`pill ${done === total ? "bg-success-soft text-success" : done > 0 ? "bg-accent-soft text-accent-DEFAULT" : "bg-brand-surface-2 text-text-muted"}`}>
                      {done}/{total}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {dayLog.exercises.map((ex, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold ${ex.completed ? "bg-success text-brand-deep" : "bg-brand-surface-2 text-text-muted/40"}`}>
                            {ex.completed ? "✓" : ""}
                          </span>
                          <span className={`text-sm ${ex.completed ? "text-text-secondary" : "text-text-muted/60"}`}>{ex.name}</span>
                        </div>
                        {ex.kg ? (
                          <span className="text-sm font-bold text-accent-DEFAULT">{ex.kg} kg</span>
                        ) : (
                          <span className="text-xs text-text-muted/20">—</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </main>
  );
}
