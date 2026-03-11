import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error("Missing Supabase env vars. Copy .env.local.example to .env.local and fill in your values.");
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export type Exercise = {
  name: string;
  sets: number;
  reps: string;
  notes?: string;
};

export type Workout = {
  id: string;
  day_of_week: number;
  title: string;
  exercises: Exercise[];
  notes: string | null;
  updated_at: string;
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
