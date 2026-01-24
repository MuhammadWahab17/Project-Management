import { Suspense } from "react";
import WeeklyProgressForm from "./WeeklyProgressForm";

export default function NewWeeklyProgressPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <WeeklyProgressForm />
    </Suspense>
  );
}
