"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navigation from "@/components/Navigation";
import { getCurrentWeekSunday, getCurrentWeekSaturday, getWeekSinceProjectStart, getISOWeek } from "@/lib/utils";
import Toast from "@/components/Toast";

interface TaskDelay {
  task: string;
  isCompleted: boolean;
  delayReasons?: ("client" | "developer" | "other")[];
  delayReasonText?: string;
}

export default function WeeklyProgressForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const milestoneId = searchParams.get("milestoneId");

  const [loading, setLoading] = useState(false);
  const [fetchingProject, setFetchingProject] = useState(true);
  const [projectData, setProjectData] = useState<{ createdAt: string; name: string } | null>(null);
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [isoWeek, setIsoWeek] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info"; isVisible: boolean }>({
    message: "",
    type: "info",
    isVisible: false,
  });
  const [formData, setFormData] = useState({
    milestoneId: milestoneId || "",
    weekStartDate: "",
    weekEndDate: "",
    completedThisWeek: [""],
    plannedForNextWeek: [""],
    taskDelays: [{ task: "", isCompleted: false, delayReasons: [] }] as TaskDelay[],
    goalsAchieved: false,
    notes: "",
  });

  // Calculate progress percentage
  const calculateProgress = () => {
    const tasks = formData.completedThisWeek.filter(t => t.trim() !== "");
    if (tasks.length === 0) return 0;
    const completedCount = formData.taskDelays.filter((d, i) => {
      const task = formData.completedThisWeek[i];
      return task && task.trim() !== "" && d.isCompleted;
    }).length;
    return Math.round((completedCount / tasks.length) * 100 * 100) / 100; // Round to 2 decimal places
  };

  // Automatically update goalsAchieved when all tasks are completed
  useEffect(() => {
    const validTasks = formData.completedThisWeek.filter(t => t.trim() !== "");
    if (validTasks.length === 0) {
      setFormData((prev) => ({ ...prev, goalsAchieved: false }));
      return;
    }
    
    // Check if all valid tasks are completed by matching indices
    const allTasksCompleted = formData.completedThisWeek.every((task, index) => {
      // Skip empty tasks
      if (task.trim() === "") return true;
      // Check if the task at this index is completed
      const delay = formData.taskDelays[index];
      return delay?.isCompleted === true;
    });
    
    setFormData((prev) => ({ ...prev, goalsAchieved: allTasksCompleted }));
  }, [formData.completedThisWeek, formData.taskDelays]);

  useEffect(() => {
    const sunday = getCurrentWeekSunday();
    const saturday = getCurrentWeekSaturday();
    setFormData((prev) => ({
      ...prev,
      weekStartDate: sunday.toISOString().split("T")[0],
      weekEndDate: saturday.toISOString().split("T")[0],
    }));

    // Fetch milestone and project data
    if (milestoneId) {
      fetch(`/api/milestones/${milestoneId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.project) {
            setProjectData({
              createdAt: data.project.createdAt,
              name: data.project.name,
            });
            const projectStartDate = new Date(data.project.createdAt);
            const currentWeek = getWeekSinceProjectStart(projectStartDate, sunday);
            const currentIsoWeek = getISOWeek(sunday);
            setWeekNumber(currentWeek);
            setIsoWeek(currentIsoWeek);
          }
          
          // Check if there's a previous week's progress and carry over incomplete tasks and planned tasks
          if (data.weeklyProgress && data.weeklyProgress.length > 0) {
            const previousWeek = data.weeklyProgress[0];
            const previousCompletedTasks = JSON.parse(previousWeek.completedThisWeek || "[]");
            const previousPlannedTasks = JSON.parse(previousWeek.plannedForNextWeek || "[]");
            const previousTaskDelays: Array<{ task: string; isCompleted: boolean; delayReasons?: string[]; delayReasonText?: string }> = 
              previousWeek.taskDelays ? JSON.parse(previousWeek.taskDelays) : [];
            
            // Get incomplete tasks from previous week's "completedThisWeek"
            const incompleteTasks: string[] = [];
            const incompleteTaskDelays: TaskDelay[] = [];
            
            previousCompletedTasks.forEach((task: string, index: number) => {
              if (task.trim() === "") return; // Skip empty tasks
              
              // Try to find delay by index first (most reliable since they should match)
              let taskDelay: { task: string; isCompleted: boolean; delayReasons?: string[]; delayReasonText?: string } | undefined = previousTaskDelays[index];
              
              // If index doesn't match or delay not found, try to find by task name
              if (!taskDelay) {
                taskDelay = previousTaskDelays.find((d: { task: string; isCompleted: boolean }) => d.task === task);
              }
              
              // Check if task is completed - explicitly check for true
              const isCompleted = taskDelay ? (taskDelay.isCompleted === true) : false;
              
              // Only carry over tasks that are NOT completed
              if (!isCompleted) {
                incompleteTasks.push(task);
                incompleteTaskDelays.push({
                  task,
                  isCompleted: false, // Reset completion status for new week
                  delayReasons: [], // Clear delay reasons for new week
                  delayReasonText: undefined,
                });
              }
            });
            
            // Get tasks from previous week's "plannedForNextWeek"
            const plannedTasks: string[] = [];
            const plannedTaskDelays: TaskDelay[] = [];
            
            previousPlannedTasks.forEach((task: string) => {
              if (task.trim() !== "") {
                plannedTasks.push(task);
                plannedTaskDelays.push({
                  task,
                  isCompleted: false, // Start as not completed - user can mark as complete
                  delayReasons: [], // No delay reasons initially
                  delayReasonText: undefined,
                });
              }
            });
            
            // Combine incomplete tasks and planned tasks
            const allTasksFromPreviousWeek = [...incompleteTasks, ...plannedTasks];
            const allTaskDelaysFromPreviousWeek = [...incompleteTaskDelays, ...plannedTaskDelays];
            
            // Add all tasks from previous week to the current week's completed tasks section
            if (allTasksFromPreviousWeek.length > 0) {
              setFormData((prev) => ({
                ...prev,
                completedThisWeek: [...allTasksFromPreviousWeek, ""],
                taskDelays: [...allTaskDelaysFromPreviousWeek, { task: "", isCompleted: false, delayReasons: [] }],
              }));
            }
          }
          
          setFetchingProject(false);
        })
        .catch((error) => {
          console.error("Error fetching project data:", error);
          setFetchingProject(false);
        });
    } else {
      setFetchingProject(false);
    }
  }, [milestoneId]);

  const addCompletedTask = () => {
    setFormData({
      ...formData,
      completedThisWeek: [...formData.completedThisWeek, ""],
      taskDelays: [...formData.taskDelays, { task: "", isCompleted: false, delayReasons: [] }],
    });
  };

  const updateCompletedTask = (index: number, value: string) => {
    const updated = [...formData.completedThisWeek];
    updated[index] = value;
    
    // Update task delay entry if it exists
    const updatedDelays = [...formData.taskDelays];
    if (updatedDelays[index]) {
      updatedDelays[index] = { ...updatedDelays[index], task: value };
    } else {
      updatedDelays[index] = { task: value, isCompleted: false, delayReasons: [] };
    }
    
    setFormData({ ...formData, completedThisWeek: updated, taskDelays: updatedDelays });
  };

  const removeCompletedTask = (index: number) => {
    const updated = formData.completedThisWeek.filter((_, i) => i !== index);
    const updatedDelays = formData.taskDelays.filter((_, i) => i !== index);
    setFormData({ ...formData, completedThisWeek: updated, taskDelays: updatedDelays });
  };

  const addPlannedTask = () => {
    setFormData({
      ...formData,
      plannedForNextWeek: [...formData.plannedForNextWeek, ""],
    });
  };

  const updatePlannedTask = (index: number, value: string) => {
    const updated = [...formData.plannedForNextWeek];
    updated[index] = value;
    setFormData({ ...formData, plannedForNextWeek: updated });
  };

  const removePlannedTask = (index: number) => {
    const updated = formData.plannedForNextWeek.filter((_, i) => i !== index);
    setFormData({ ...formData, plannedForNextWeek: updated });
  };

  const updateTaskCompletion = (index: number, isCompleted: boolean) => {
    const updatedDelays = [...formData.taskDelays];
    if (!updatedDelays[index]) {
      updatedDelays[index] = { task: formData.completedThisWeek[index] || "", isCompleted: false, delayReasons: [] };
    }
    updatedDelays[index] = { ...updatedDelays[index], isCompleted };
    if (isCompleted) {
      // Clear delay reasons if task is completed
      updatedDelays[index].delayReasons = [];
      updatedDelays[index].delayReasonText = undefined;
    }
    setFormData({ ...formData, taskDelays: updatedDelays });
  };

  const toggleTaskDelayReason = (index: number, reason: "client" | "developer" | "other") => {
    const updatedDelays = [...formData.taskDelays];
    if (!updatedDelays[index]) {
      updatedDelays[index] = { task: formData.completedThisWeek[index] || "", isCompleted: false, delayReasons: [] };
    }
    const currentReasons = updatedDelays[index].delayReasons || [];
    const isSelected = currentReasons.includes(reason);
    
    if (isSelected) {
      // Remove the reason
      updatedDelays[index].delayReasons = currentReasons.filter(r => r !== reason);
      if (reason === "other") {
        updatedDelays[index].delayReasonText = undefined;
      }
    } else {
      // Add the reason
      updatedDelays[index].delayReasons = [...currentReasons, reason];
    }
    
    setFormData({ ...formData, taskDelays: updatedDelays });
  };

  const updateTaskDelayReasonText = (index: number, text: string) => {
    const updatedDelays = [...formData.taskDelays];
    if (!updatedDelays[index]) {
      updatedDelays[index] = { task: formData.completedThisWeek[index] || "", isCompleted: false, delayReasons: [] };
    }
    updatedDelays[index] = { ...updatedDelays[index], delayReasonText: text };
    setFormData({ ...formData, taskDelays: updatedDelays });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.milestoneId) {
      setToast({ message: "Please select a milestone", type: "error", isVisible: true });
      setLoading(false);
      return;
    }

    // Validate that at least one task is added
    const validTasks = formData.completedThisWeek.filter((t) => t.trim() !== "");
    if (validTasks.length === 0) {
      setToast({ message: "Please add at least one task for this week", type: "error", isVisible: true });
      setLoading(false);
      return;
    }

    // Validate that incomplete tasks have delay reasons
    for (let i = 0; i < validTasks.length; i++) {
      const originalIndex = formData.completedThisWeek.indexOf(validTasks[i]);
      const delay = formData.taskDelays[originalIndex] || { task: validTasks[i], isCompleted: false, delayReasons: [] };
      if (!delay.isCompleted && (!delay.delayReasons || delay.delayReasons.length === 0)) {
        setToast({ message: `Please mark task "${validTasks[i]}" as completed or select a delay reason`, type: "error", isVisible: true });
        setLoading(false);
        return;
      }
    }

    try {
      // Prepare taskDelays - ensure it matches completedThisWeek length
      const taskDelaysForSave = validTasks.map((task, index) => {
        const originalIndex = formData.completedThisWeek.indexOf(task);
        return formData.taskDelays[originalIndex] || { task, isCompleted: false, delayReasons: [] };
      });

      // Calculate goalsAchieved based on all tasks being completed
      const allTasksCompleted = validTasks.every((task, index) => {
        const originalIndex = formData.completedThisWeek.indexOf(task);
        const delay = formData.taskDelays[originalIndex];
        return delay?.isCompleted === true;
      });

      const response = await fetch("/api/weekly-progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          completedThisWeek: JSON.stringify(validTasks),
          plannedForNextWeek: JSON.stringify(
            formData.plannedForNextWeek.filter((t) => t.trim() !== "")
          ),
          taskDelays: JSON.stringify(taskDelaysForSave),
          goalsAchieved: allTasksCompleted,
          weekStartDate: new Date(formData.weekStartDate),
          weekEndDate: new Date(formData.weekEndDate),
        }),
      });

      if (response.ok) {
        const progress = await response.json();
        setToast({ message: "Weekly progress created successfully!", type: "success", isVisible: true });
        setTimeout(() => {
          router.push(`/projects/${progress.projectId}`);
          // Refresh will happen automatically on navigation, but we can force it
          setTimeout(() => router.refresh(), 100);
        }, 1000);
      } else {
        const error = await response.json();
        setToast({ message: error.error || "Failed to create weekly progress", type: "error", isVisible: true });
      }
    } catch (error) {
      console.error("Error creating weekly progress:", error);
      setToast({ message: "Error creating weekly progress", type: "error", isVisible: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Weekly Progress Report
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Week Range *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Week Start (Sunday)
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.weekStartDate}
                    onChange={(e) =>
                      setFormData({ ...formData, weekStartDate: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Week End (Saturday)
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.weekEndDate}
                    onChange={(e) =>
                      setFormData({ ...formData, weekEndDate: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Tasks This Week *
                </label>
                {formData.completedThisWeek.filter(t => t.trim() !== "").length > 0 && (
                  <div className="text-sm font-semibold text-blue-600">
                    Progress: {calculateProgress()}%
                  </div>
                )}
              </div>
              {formData.completedThisWeek.map((task, index) => {
                const taskDelay = formData.taskDelays[index] || { task: task, isCompleted: false, delayReasons: [] };
                const isCompleted = taskDelay.isCompleted || false;
                const delayReasons = taskDelay.delayReasons || [];
                
                return (
                  <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={task}
                        onChange={(e) => updateCompletedTask(index, e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        placeholder="Enter completed task or achievement"
                      />
                      {formData.completedThisWeek.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCompletedTask(index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    {/* Task completion checkbox */}
                    <div className="mb-3">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          onChange={(e) => updateTaskCompletion(index, e.target.checked)}
                          className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          ✓ Mark as completed
                        </span>
                      </label>
                    </div>

                    {/* Delay reason section (only show if task is not completed) */}
                    {!isCompleted && (
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Delay Reason (required if not completed):
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={delayReasons.includes("client")}
                              onChange={() => toggleTaskDelayReason(index, "client")}
                              className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Delayed by client</span>
                          </label>
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={delayReasons.includes("developer")}
                              onChange={() => toggleTaskDelayReason(index, "developer")}
                              className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Delayed by developer</span>
                          </label>
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={delayReasons.includes("other")}
                              onChange={() => toggleTaskDelayReason(index, "other")}
                              className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Other reason</span>
                          </label>
                          {delayReasons.includes("other") && (
                            <textarea
                              value={taskDelay.delayReasonText || ""}
                              onChange={(e) => updateTaskDelayReasonText(index, e.target.value)}
                              className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Please justify the reason for delay..."
                              rows={2}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={addCompletedTask}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                + Add Task
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Planned For Next Week
              </label>
              {formData.plannedForNextWeek.map((task, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={task}
                    onChange={(e) => updatePlannedTask(index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter planned task for next week"
                  />
                  {formData.plannedForNextWeek.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePlannedTask(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addPlannedTask}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                + Add Task
              </button>
            </div>

            <div className="mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.goalsAchieved}
                  onChange={(e) =>
                    setFormData({ ...formData, goalsAchieved: e.target.checked })
                  }
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Weekly goals achieved
                </span>
              </label>
            </div>

            <div className="mb-6">
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Additional Notes
              </label>
              <textarea
                id="notes"
                rows={4}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter any additional notes or observations"
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Progress Report"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}
