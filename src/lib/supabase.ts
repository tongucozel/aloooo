import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

export const isDemoMode = () =>
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Not available in demo mode");
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export type Person = "zdb" | "tbo";

export type Exercise = {
  name: string;
  sets: number;
  reps: string;
  notes?: string;
};

export type Workout = {
  id: string;
  day_of_week: number;
  person: Person;
  title: string;
  exercises: Exercise[];
  notes: string | null;
  updated_at: string;
};

export type ExerciseLog = {
  name: string;
  completed: boolean;
  kg: string;
};

export type DayLog = {
  date: string;
  day_of_week: number;
  exercises: ExerciseLog[];
};

export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const PROFILES: Record<Person, { label: string; initials: string }> = {
  zdb: { label: "ZDB", initials: "ZDB" },
  tbo: { label: "TBO", initials: "TBO" },
};

// --- Workout storage ---

const WORKOUT_KEY = "zdbfit_workouts";
const LOG_PREFIX = "zdbfit_log_";

function wKey(person: Person) {
  return `${WORKOUT_KEY}_${person}`;
}

function getLocalWorkouts(person: Person): Record<number, Workout> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(wKey(person));
  return raw ? JSON.parse(raw) : {};
}

function setLocalWorkouts(person: Person, workouts: Record<number, Workout>) {
  localStorage.setItem(wKey(person), JSON.stringify(workouts));
}

export async function fetchWorkout(day: number, person: Person): Promise<Workout | null> {
  if (isDemoMode()) {
    return getLocalWorkouts(person)[day] || null;
  }
  const { data } = await getSupabase()
    .from("workouts")
    .select("*")
    .eq("day_of_week", day)
    .eq("person", person)
    .single();
  return data;
}

export async function saveWorkout(
  day: number,
  person: Person,
  title: string,
  exercises: Exercise[],
  notes: string | null
): Promise<void> {
  const payload = {
    day_of_week: day,
    person,
    title: title.trim(),
    exercises,
    notes: notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (isDemoMode()) {
    const workouts = getLocalWorkouts(person);
    workouts[day] = { id: `local-${person}-${day}`, ...payload };
    setLocalWorkouts(person, workouts);
    return;
  }

  const sb = getSupabase();
  const { data: existing } = await sb
    .from("workouts")
    .select("id")
    .eq("day_of_week", day)
    .eq("person", person)
    .single();

  if (existing) {
    await sb.from("workouts").update(payload).eq("id", existing.id);
  } else {
    await sb.from("workouts").insert(payload);
  }
}

// --- Exercise logs ---

function logKey(person: Person, date: string, day: number): string {
  return `${LOG_PREFIX}${person}_${date}_${day}`;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getExerciseLogs(day: number, person: Person): ExerciseLog[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(logKey(person, todayStr(), day));
  return raw ? JSON.parse(raw) : [];
}

export function saveExerciseLogs(day: number, person: Person, logs: ExerciseLog[]) {
  const date = todayStr();
  localStorage.setItem(logKey(person, date, day), JSON.stringify(logs));

  if (!isDemoMode()) {
    syncLogToSupabase(day, person, date, logs);
  }
}

async function syncLogToSupabase(day: number, person: Person, date: string, logs: ExerciseLog[]) {
  try {
    const { error } = await getSupabase()
      .from("workout_logs")
      .upsert(
        { day_of_week: day, person, log_date: date, exercise_logs: logs },
        { onConflict: "day_of_week,log_date,person" }
      );
    if (error) {
      console.error("Supabase sync failed:", error);
      markPendingSync(day, person, date);
    }
  } catch (e) {
    console.error("Supabase sync error:", e);
    markPendingSync(day, person, date);
  }
}

function markPendingSync(day: number, person: Person, date: string) {
  const key = "zdbfit_pending_sync";
  const pending: string[] = JSON.parse(localStorage.getItem(key) || "[]");
  const entry = `${person}_${date}_${day}`;
  if (!pending.includes(entry)) {
    pending.push(entry);
    localStorage.setItem(key, JSON.stringify(pending));
  }
}

export async function retryPendingSync() {
  if (isDemoMode() || typeof window === "undefined") return;
  const key = "zdbfit_pending_sync";
  const pending: string[] = JSON.parse(localStorage.getItem(key) || "[]");
  if (pending.length === 0) return;

  const stillPending: string[] = [];
  for (const entry of pending) {
    const [person, date, dayStr] = entry.split("_") as [Person, string, string];
    const day = parseInt(dayStr);
    const logData = localStorage.getItem(logKey(person, date, day));
    if (!logData) continue;

    try {
      const { error } = await getSupabase()
        .from("workout_logs")
        .upsert(
          { day_of_week: day, person, log_date: date, exercise_logs: JSON.parse(logData) },
          { onConflict: "day_of_week,log_date,person" }
        );
      if (error) stillPending.push(entry);
    } catch {
      stillPending.push(entry);
    }
  }

  localStorage.setItem(key, JSON.stringify(stillPending));
}

export async function syncTodayToSupabase(day: number, person: Person) {
  if (isDemoMode() || typeof window === "undefined") return;
  const date = todayStr();
  const logData = localStorage.getItem(logKey(person, date, day));
  if (!logData) return;

  const logs: ExerciseLog[] = JSON.parse(logData);
  if (!logs.some((e) => e.completed || e.kg)) return;

  await syncLogToSupabase(day, person, date, logs);
}

// One-time sync: push ALL localStorage logs to Supabase (catches any missed syncs)
export async function syncAllLocalLogsToSupabase() {
  if (isDemoMode() || typeof window === "undefined") return;
  const synced = localStorage.getItem("zdbfit_full_sync_done");
  if (synced) return; // only run once

  const prefix = LOG_PREFIX;
  const entries: { person: Person; date: string; day: number; logs: ExerciseLog[] }[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;
    // key format: zdbfit_log_{person}_{date}_{day}
    const rest = key.slice(prefix.length); // e.g. "zdb_2026-03-22_6"
    const parts = rest.match(/^(zdb|tbo)_(\d{4}-\d{2}-\d{2})_(\d)$/);
    if (!parts) continue;

    try {
      const data: ExerciseLog[] = JSON.parse(localStorage.getItem(key)!);
      if (data.some((e) => e.completed || e.kg)) {
        entries.push({
          person: parts[1] as Person,
          date: parts[2],
          day: parseInt(parts[3]),
          logs: data,
        });
      }
    } catch { /* skip */ }
  }

  if (entries.length === 0) {
    localStorage.setItem("zdbfit_full_sync_done", "1");
    return;
  }

  let allOk = true;
  for (const entry of entries) {
    try {
      const { error } = await getSupabase()
        .from("workout_logs")
        .upsert(
          { day_of_week: entry.day, person: entry.person, log_date: entry.date, exercise_logs: entry.logs },
          { onConflict: "day_of_week,log_date,person" }
        );
      if (error) allOk = false;
    } catch {
      allOk = false;
    }
  }

  if (allOk) {
    localStorage.setItem("zdbfit_full_sync_done", "1");
  }
}

// --- Activity tracking ---

async function fetchGeoLocation(): Promise<{ city: string; region: string; country: string; ip: string } | null> {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      city: data.city || "",
      region: data.region || "",
      country: data.country_name || "",
      ip: data.ip || "",
    };
  } catch { return null; }
}

export async function updateLastSeen(person: Person) {
  if (isDemoMode() || typeof window === "undefined") return;
  try {
    const now = new Date().toISOString();
    const geo = await fetchGeoLocation();

    await getSupabase()
      .from("activity_log")
      .upsert(
        { person, last_seen: now },
        { onConflict: "person" }
      );

    await getSupabase()
      .from("activity_history")
      .insert({
        person,
        seen_at: now,
        city: geo?.city || null,
        region: geo?.region || null,
        country: geo?.country || null,
        ip: geo?.ip || null,
      });
  } catch { /* silent */ }
}

export async function getLastSeen(): Promise<Record<Person, string | null>> {
  const result: Record<Person, string | null> = { zdb: null, tbo: null };
  if (isDemoMode()) return result;
  try {
    const { data } = await getSupabase().from("activity_log").select("*");
    if (data) {
      for (const row of data) {
        result[row.person as Person] = row.last_seen;
      }
    }
  } catch { /* silent */ }
  return result;
}

// --- History ---

export function getLogHistory(day: number, person: Person): DayLog[] {
  if (typeof window === "undefined") return [];
  const logs: DayLog[] = [];
  const prefix = `${LOG_PREFIX}${person}_`;
  const suffix = `_${day}`;
  const today = todayStr();

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix) && key.endsWith(suffix)) {
      const dateStr = key.slice(prefix.length, key.length - suffix.length);
      if (dateStr === today) continue;
      try {
        const data: ExerciseLog[] = JSON.parse(localStorage.getItem(key)!);
        if (data.some((e) => e.completed || e.kg)) {
          logs.push({ date: dateStr, day_of_week: day, exercises: data });
        }
      } catch { /* skip */ }
    }
  }

  return logs.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getLogHistoryFromSupabase(day: number, person: Person): Promise<DayLog[]> {
  if (isDemoMode()) return getLogHistory(day, person);

  const { data } = await getSupabase()
    .from("workout_logs")
    .select("*")
    .eq("day_of_week", day)
    .eq("person", person)
    .order("log_date", { ascending: false })
    .limit(12);

  if (!data) return [];

  return data.map((row: { log_date: string; day_of_week: number; exercise_logs: ExerciseLog[] }) => ({
    date: row.log_date,
    day_of_week: row.day_of_week,
    exercises: row.exercise_logs || [],
  }));
}
