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
  localStorage.setItem(logKey(person, todayStr(), day), JSON.stringify(logs));

  if (!isDemoMode()) {
    getSupabase()
      .from("workout_logs")
      .upsert(
        { day_of_week: day, person, log_date: todayStr(), exercise_logs: logs },
        { onConflict: "day_of_week,log_date,person" }
      )
      .then(() => {});
  }
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
