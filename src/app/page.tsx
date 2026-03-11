"use client";

import { useEffect, useState } from "react";
import { getSupabase, DAYS, type Workout } from "@/lib/supabase";

export default function Home() {
  const today = new Date().getDay();
  // Convert JS day (0=Sun) to our format (0=Mon)
  const todayIndex = today === 0 ? 6 : today - 1;

  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkout(selectedDay);
  }, [selectedDay]);

  async function fetchWorkout(day: number) {
    setLoading(true);
    const { data } = await getSupabase()
      .from("workouts")
      .select("*")
      .eq("day_of_week", day)
      .single();
    setWorkout(data);
    setLoading(false);
  }

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-8 safe-bottom">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-primary-700 tracking-tight">
          FitCouple
        </h1>
        <p className="text-sm text-primary-400 mt-1">Your workout plan</p>
      </div>

      {/* Day Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {DAYS.map((day, i) => (
          <button
            key={day}
            onClick={() => setSelectedDay(i)}
            className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-2xl transition-all duration-200 ${
              selectedDay === i
                ? "bg-primary-600 text-white shadow-lg shadow-primary-600/30 scale-105"
                : i === todayIndex
                ? "bg-primary-100 text-primary-600 border-2 border-primary-300"
                : "bg-white text-gray-500 border border-gray-200"
            }`}
          >
            <span className="text-[10px] font-medium uppercase tracking-wider">
              {day.slice(0, 3)}
            </span>
          </button>
        ))}
      </div>

      {/* Day Title */}
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        {DAYS[selectedDay]}
        {selectedDay === todayIndex && (
          <span className="ml-2 text-xs bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full font-medium">
            Today
          </span>
        )}
      </h2>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : workout && workout.exercises.length > 0 ? (
        <div className="space-y-3">
          {/* Workout Title */}
          {workout.title && (
            <div className="bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-2xl p-4 shadow-lg shadow-primary-600/20">
              <h3 className="font-bold text-lg">{workout.title}</h3>
              {workout.notes && (
                <p className="text-primary-100 text-sm mt-1">{workout.notes}</p>
              )}
              <p className="text-primary-200 text-xs mt-2">
                {workout.exercises.length} exercise{workout.exercises.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}

          {/* Exercises */}
          {workout.exercises.map((exercise, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">
                      {exercise.name}
                    </h4>
                    <div className="flex gap-3 mt-1.5">
                      <span className="text-sm text-gray-500">
                        <span className="font-medium text-primary-600">
                          {exercise.sets}
                        </span>{" "}
                        sets
                      </span>
                      <span className="text-sm text-gray-500">
                        <span className="font-medium text-primary-600">
                          {exercise.reps}
                        </span>{" "}
                        reps
                      </span>
                    </div>
                    {exercise.notes && (
                      <p className="text-xs text-gray-400 mt-2 italic">
                        {exercise.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Updated info */}
          <p className="text-center text-xs text-gray-300 pt-4">
            Updated{" "}
            {new Date(workout.updated_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      ) : (
        /* Rest Day */
        <div className="text-center py-16">
          <div className="text-6xl mb-4">
            {selectedDay === 6 || selectedDay === 5 ? "🧘‍♀️" : "💪"}
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {selectedDay === 6 || selectedDay === 5
              ? "Rest Day"
              : "No workout yet"}
          </h3>
          <p className="text-gray-400 text-sm">
            {selectedDay === 6 || selectedDay === 5
              ? "Recovery is part of the process!"
              : "Your trainer hasn't added a workout for this day yet."}
          </p>
        </div>
      )}
    </main>
  );
}
