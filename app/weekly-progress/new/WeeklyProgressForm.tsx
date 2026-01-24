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

    try {
      const response = await fetch("/api/weekly-progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          completedThisWeek: JSON.stringify(
            formData.completedThisWeek.filter((t) => t.trim() !== "")
          ),
          plannedForNextWeek: JSON.stringify(
            formData.plannedForNextWeek.filter((t) => t.trim() !== "")
          ),
          taskDelays: JSON.stringify(
            formData.taskDelays.filter((d, i) => formData.plannedForNextWeek[i]?.trim() !== "")
          ),
          weekStartDate: new Date(formData.weekStartDate),
          weekEndDate: new Date(formData.weekEndDate),
        }),
      });

      if (response.ok) {
        const progress = await response.json();
        setToast({ message: "Weekly progress created successfully!", type: "success", isVisible: true });
        setTimeout(() => {
          router.push(`/projects/${progress.projectId}`);
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Completed This Week *
              </label>
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
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          onChange={(e) => updateTaskCompletion(index, e.target.checked)}
                          className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Task completed
                        </span>
                      </label>
                    </div>

                    {/* Delay reason section (only show if task is not completed) */}
                    {!isCompleted && (
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Delay Reason (if not completed):
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
                Planned For Next Week *
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
