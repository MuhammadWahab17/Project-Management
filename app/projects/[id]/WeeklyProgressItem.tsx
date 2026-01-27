"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import EditWeeklyProgressModal from "./EditWeeklyProgressModal";
import ConfirmModal from "@/components/ConfirmModal";
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
  weekNumber?: number; // Sequential week number for this milestone
  allProgress?: Array<{ id: string; weekStartDate: Date }>; // All progress reports for this milestone to calculate week number
}

export default function WeeklyProgressItem({ progress, canEdit, projectStartDate, weekNumber, allProgress }: WeeklyProgressItemProps) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingTask, setUpdatingTask] = useState<number | null>(null);
  const [localTaskDelays, setLocalTaskDelays] = useState<Array<{ task: string; isCompleted: boolean; delayReasons?: string[]; delayReasonText?: string }>>(
    progress.taskDelays ? JSON.parse(progress.taskDelays) : []
  );
  
  const weekStart = new Date(progress.weekStartDate);
  const weekEnd = new Date(progress.weekEndDate);
  
  // Calculate week number: use provided weekNumber, or calculate from allProgress, or fallback to project-relative
  let weekSinceStart: number;
  if (weekNumber !== undefined) {
    weekSinceStart = weekNumber;
  } else if (allProgress && allProgress.length > 0) {
    // Group progress by unique weekStartDate and assign sequential week numbers
    const uniqueWeeks = Array.from(new Set(
      allProgress
        .map(p => new Date(p.weekStartDate).getTime())
        .sort((a, b) => a - b)
    ));
    const progressWeekStart = weekStart.getTime();
    const weekIndex = uniqueWeeks.findIndex(weekTime => weekTime === progressWeekStart);
    weekSinceStart = weekIndex >= 0 ? weekIndex + 1 : getWeekSinceProjectStart(new Date(projectStartDate), weekStart);
  } else {
    weekSinceStart = getWeekSinceProjectStart(new Date(projectStartDate), weekStart);
  }
  
  const isoWeek = getISOWeek(weekStart);
  const completedTasks = JSON.parse(progress.completedThisWeek || "[]");
  const plannedTasks = JSON.parse(progress.plannedForNextWeek || "[]");
  
  // Use local state for task delays if available, otherwise parse from progress
  const taskDelays = localTaskDelays.length > 0 ? localTaskDelays : 
    (progress.taskDelays ? JSON.parse(progress.taskDelays) : []);

  // Calculate progress percentage
  const calculateProgress = () => {
    if (completedTasks.length === 0) return 0;
    const completedCount = completedTasks.filter((task: string, index: number) => {
      const delay = taskDelays[index];
      return delay?.isCompleted === true;
    }).length;
    const percentage = (completedCount / completedTasks.length) * 100;
    const rounded = Math.round(percentage * 100) / 100;
    // Ensure it's a valid number between 0 and 100
    return isNaN(rounded) ? 0 : Math.max(0, Math.min(100, rounded));
  };

  const progressPercentage = calculateProgress();

  // Sync local state when progress updates
  useEffect(() => {
    const newTaskDelays = progress.taskDelays ? JSON.parse(progress.taskDelays) : [];
    setLocalTaskDelays(newTaskDelays);
  }, [progress.taskDelays]);

  const handleSuccess = (message: string) => {
    router.refresh();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/weekly-progress/${progress.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete progress report");
      }

      setShowDeleteModal(false);
      router.refresh();
    } catch (error) {
      console.error("Error deleting progress:", error);
      // Error will be shown via the modal, but we'll close it on error
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleTaskCompletion = async (taskIndex: number) => {
    if (!canEdit) return;

    setUpdatingTask(taskIndex);
    
    // Update local state immediately for better UX
    const updatedDelays = [...taskDelays];
    if (!updatedDelays[taskIndex]) {
      updatedDelays[taskIndex] = { 
        task: completedTasks[taskIndex], 
        isCompleted: false, 
        delayReasons: [] 
      };
    }
    const newCompletionStatus = !updatedDelays[taskIndex].isCompleted;
    updatedDelays[taskIndex] = { 
      ...updatedDelays[taskIndex], 
      isCompleted: newCompletionStatus 
    };
    
    // Clear delay reasons if task is completed
    if (newCompletionStatus) {
      updatedDelays[taskIndex].delayReasons = [];
      updatedDelays[taskIndex].delayReasonText = undefined;
    }
    
    setLocalTaskDelays(updatedDelays);

    try {
      // Calculate goalsAchieved based on all tasks being completed
      const allTasksCompleted = completedTasks.every((task: string, index: number) => {
        const delay = updatedDelays[index];
        return delay?.isCompleted === true;
      });

      const response = await fetch(`/api/weekly-progress/${progress.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedThisWeek: JSON.stringify(completedTasks),
          plannedForNextWeek: JSON.stringify(plannedTasks),
          taskDelays: JSON.stringify(updatedDelays),
          goalsAchieved: allTasksCompleted,
          notes: progress.notes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update task completion");
      }

      router.refresh();
    } catch (error) {
      console.error("Error updating task completion:", error);
      // Revert local state on error
      setLocalTaskDelays(taskDelays);
      alert(error instanceof Error ? error.message : "Failed to update task completion");
    } finally {
      setUpdatingTask(null);
    }
  };

  return (
    <>
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 sm:p-4 hover:border-gray-300 transition-colors overflow-hidden">
        <div className="flex flex-col gap-2 mb-3">
          {/* Header Row - Week and Actions */}
          <div className="flex items-start justify-between gap-2 min-w-0">
            <div className="flex-1 min-w-0 pr-2">
              <div className="text-sm sm:text-base font-semibold text-gray-900 mb-1 break-words">
                Week {weekSinceStart} ({isoWeek})
              </div>
              <div className="text-xs text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis">
                {formatDate(weekStart)} - {formatDate(weekEnd)}
              </div>
            </div>
            {canEdit && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Edit Progress"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={isDeleting}
                  className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete Progress"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          
          {/* Badges Row */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {completedTasks.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 whitespace-nowrap">
                <span className="hidden sm:inline">{progressPercentage.toFixed(2)}% Complete</span>
                <span className="sm:hidden">{Math.round(progressPercentage)}% Done</span>
              </span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${
              progress.goalsAchieved 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {progress.goalsAchieved ? '✓ Achieved' : '✗ Not Achieved'}
            </span>
          </div>
        </div>

        {(completedTasks.length > 0 || plannedTasks.length > 0) && (
          <div className="space-y-2 text-sm">
            {completedTasks.length > 0 && (
              <div className="bg-green-50 rounded border border-green-200 p-2 sm:p-3 overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-semibold text-green-700 uppercase">Tasks This Week</span>
                </div>
                <ul className="space-y-2">
                  {completedTasks.map((task: string, idx: number) => {
                    const delay = taskDelays[idx] || taskDelays.find((d: { task: string; isCompleted: boolean; delayReasons?: string[]; delayReasonText?: string }) => d.task === task);
                    const isCompleted = delay?.isCompleted ?? false;
                    const hasDelay = delay && !isCompleted && delay.delayReasons && delay.delayReasons.length > 0;
                    const isUpdating = updatingTask === idx;
                    
                    return (
                      <li key={idx} className="text-xs sm:text-sm min-w-0">
                        <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                          {canEdit ? (
                            <label className="flex items-start cursor-pointer group flex-shrink-0 mt-0.5">
                              <input
                                type="checkbox"
                                checked={isCompleted}
                                onChange={() => handleToggleTaskCompletion(idx)}
                                disabled={isUpdating}
                                className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 text-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
                              />
                              {isUpdating && (
                                <svg className="animate-spin ml-1 w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              )}
                            </label>
                          ) : (
                            <span className={`flex-shrink-0 mt-0.5 ${isCompleted ? 'text-green-600' : hasDelay ? 'text-red-600' : 'text-yellow-600'}`}>
                              {isCompleted ? '✓' : hasDelay ? '⚠' : '○'}
                            </span>
                          )}
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <span className={`block break-words ${isCompleted ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                              {task}
                            </span>
                            {hasDelay && (
                              <div className="mt-1 ml-0 sm:ml-2 text-xs text-red-600">
                                <span className="font-medium">
                                  {delay.delayReasons?.map((reason: string, i: number) => {
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
                </ul>
              </div>
            )}
            {plannedTasks.length > 0 && (
              <div className="bg-blue-50 rounded border border-blue-200 p-2 sm:p-3">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-xs font-semibold text-blue-700 uppercase">Planned</span>
                </div>
                <ul className="space-y-1 sm:space-y-2">
                  {plannedTasks.map((task: string, idx: number) => (
                    <li key={idx} className="text-xs sm:text-sm text-gray-700 flex items-start">
                      <span className="text-blue-600 mr-1.5 sm:mr-2 mt-0.5 flex-shrink-0">•</span>
                      <span className="break-words">{task}</span>
                    </li>
                  ))}
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
            taskDelays: localTaskDelays.length > 0 ? localTaskDelays as Array<{ task: string; isCompleted: boolean; delayReasons?: ("client" | "developer" | "other")[]; delayReasonText?: string }> : 
              (taskDelays as Array<{ task: string; isCompleted: boolean; delayReasons?: ("client" | "developer" | "other")[]; delayReasonText?: string }>),
            goalsAchieved: progress.goalsAchieved,
            notes: progress.notes,
          }}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleSuccess}
        />
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Weekly Progress"
        message="Are you sure you want to delete this weekly progress report? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </>
  );
}
