"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EditWeeklyProgressModal from "./EditWeeklyProgressModal";
import { formatDate, getWeekNumber, getWeekSinceProjectStart, getISOWeek } from "@/lib/utils";

interface WeeklyProgressItemProps {
  progress: {
    id: string;
    weekStartDate: Date;
    weekEndDate: Date;
    completedThisWeek: string;
    plannedForNextWeek: string;
    taskDelays?: string | null;
    goalsAchieved: boolean;
    notes: string | null;
  };
  canEdit: boolean;
  projectStartDate: Date;
}

export default function WeeklyProgressItem({ progress, canEdit, projectStartDate }: WeeklyProgressItemProps) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  
  const weekStart = new Date(progress.weekStartDate);
  const weekEnd = new Date(progress.weekEndDate);
  const weekSinceStart = getWeekSinceProjectStart(new Date(projectStartDate), weekStart);
  const isoWeek = getISOWeek(weekStart);
  const completedTasks = JSON.parse(progress.completedThisWeek || "[]");
  const plannedTasks = JSON.parse(progress.plannedForNextWeek || "[]");
  const taskDelays: Array<{ task: string; isCompleted: boolean; delayReasons?: string[]; delayReasonText?: string }> = 
    progress.taskDelays ? JSON.parse(progress.taskDelays) : [];

  const handleSuccess = (message: string) => {
    router.refresh();
  };

  return (
    <>
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-sm font-semibold text-gray-900">
                Week {weekSinceStart} ({isoWeek})
              </div>
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                progress.goalsAchieved 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {progress.goalsAchieved ? '✓ Achieved' : '✗ Not Achieved'}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {formatDate(weekStart)} - {formatDate(weekEnd)}
            </div>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowEditModal(true)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Edit Progress"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
        </div>

        {(completedTasks.length > 0 || plannedTasks.length > 0) && (
          <div className="space-y-2 text-sm">
            {completedTasks.length > 0 && (
              <div className="bg-green-50 rounded border border-green-200 p-2">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-semibold text-green-700 uppercase">Completed</span>
                </div>
                <ul className="space-y-1">
                  {completedTasks.slice(0, 2).map((task: string, idx: number) => {
                    const delay = taskDelays.find((d) => d.task === task);
                    const isCompleted = delay?.isCompleted ?? true; // Default to true if no delay entry
                    const hasDelay = delay && !isCompleted && delay.delayReasons && delay.delayReasons.length > 0;
                    return (
                      <li key={idx} className="text-xs text-gray-700">
                        <div className="flex items-start">
                          <span className={`mr-1.5 mt-0.5 ${isCompleted ? 'text-green-600' : hasDelay ? 'text-red-600' : 'text-yellow-600'}`}>
                            {isCompleted ? '✓' : hasDelay ? '⚠' : '○'}
                          </span>
                          <div className="flex-1">
                            <span className={isCompleted ? '' : 'text-gray-600'}>{task}</span>
                            {hasDelay && (
                              <div className="mt-1 ml-4 text-xs text-red-600">
                                <span className="font-medium">
                                  {delay.delayReasons?.map((reason, i) => {
                                    const labels: Record<string, string> = {
                                      'client': 'Delayed by client',
                                      'developer': 'Delayed by developer',
                                      'other': 'Other reason'
                                    };
                                    return labels[reason] || reason;
                                  }).join(', ')}
                                </span>
                                {delay.delayReasonText && (
                                  <span className="block mt-0.5 text-gray-600">{delay.delayReasonText}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                  {completedTasks.length > 2 && (
                    <li className="text-xs text-gray-500">+{completedTasks.length - 2} more</li>
                  )}
                </ul>
              </div>
            )}
            {plannedTasks.length > 0 && (
              <div className="bg-blue-50 rounded border border-blue-200 p-2">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-xs font-semibold text-blue-700 uppercase">Planned</span>
                </div>
                <ul className="space-y-1">
                  {plannedTasks.slice(0, 2).map((task: string, idx: number) => (
                    <li key={idx} className="text-xs text-gray-700 flex items-start">
                      <span className="text-blue-600 mr-1.5 mt-0.5">•</span>
                      <span className="line-clamp-1">{task}</span>
                    </li>
                  ))}
                  {plannedTasks.length > 2 && (
                    <li className="text-xs text-gray-500">+{plannedTasks.length - 2} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {progress.notes && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-600 italic line-clamp-2">{progress.notes}</p>
          </div>
        )}
      </div>

      {showEditModal && (
        <EditWeeklyProgressModal
          progressId={progress.id}
          initialData={{
            completedThisWeek: completedTasks,
            plannedForNextWeek: plannedTasks,
            taskDelays: taskDelays as Array<{ task: string; isCompleted: boolean; delayReasons?: ("client" | "developer" | "other")[]; delayReasonText?: string }>,
            goalsAchieved: progress.goalsAchieved,
            notes: progress.notes,
          }}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
