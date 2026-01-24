"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Toast from "@/components/Toast";

interface MilestoneActionsProps {
  milestoneId: string;
  currentStatus: string;
  isCurrent: boolean;
  canEdit: boolean;
}

export default function MilestoneActions({
  milestoneId,
  currentStatus,
  isCurrent,
  canEdit,
}: MilestoneActionsProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [updatingCurrent, setUpdatingCurrent] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info"; isVisible: boolean }>({
    message: "",
    type: "info",
    isVisible: false,
  });

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type, isVisible: true });
  };

  const handleMarkCompleted = async () => {
    if (currentStatus === "completed") {
      showToast("Milestone is already completed", "info");
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`/api/milestones/${milestoneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      if (response.ok) {
        showToast("Milestone marked as completed!", "success");
        router.refresh();
      } else {
        const error = await response.json();
        showToast(error.error || "Failed to update milestone", "error");
      }
    } catch (error) {
      console.error("Error updating milestone:", error);
      showToast("Error updating milestone", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleCurrent = async () => {
    setUpdatingCurrent(true);
    try {
      const response = await fetch(`/api/milestones/${milestoneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCurrent: !isCurrent }),
      });

      if (response.ok) {
        showToast(
          isCurrent 
            ? "Milestone removed from current milestones" 
            : "Milestone marked as current!",
          "success"
        );
        router.refresh();
      } else {
        const error = await response.json();
        showToast(error.error || "Failed to update milestone", "error");
      }
    } catch (error) {
      console.error("Error updating milestone:", error);
      showToast("Error updating milestone", "error");
    } finally {
      setUpdatingCurrent(false);
    }
  };

  if (!canEdit) return null;

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {currentStatus !== "completed" && (
          <button
            onClick={handleMarkCompleted}
            disabled={updating || updatingCurrent}
            className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
          >
            {updating ? "Updating..." : "Mark Complete"}
          </button>
        )}
        <button
          onClick={handleToggleCurrent}
          disabled={updating || updatingCurrent}
          className={`px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors whitespace-nowrap disabled:opacity-50 ${
            isCurrent
              ? "text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200"
              : "text-gray-700 bg-gray-50 hover:bg-gray-100 border-gray-200"
          }`}
        >
          {updatingCurrent ? "Updating..." : isCurrent ? "Remove Current" : "Set Current"}
        </button>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </>
  );
}
