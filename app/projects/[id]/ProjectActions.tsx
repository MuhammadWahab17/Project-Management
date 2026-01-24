"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Toast from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import EditProjectModal from "./EditProjectModal";

interface ProjectActionsProps {
  projectId: string;
  projectName: string;
  projectDescription: string | null;
  projectMajorGoal: string;
  projectStatus: string;
  canEdit: boolean;
}

export default function ProjectActions({
  projectId,
  projectName,
  projectDescription,
  projectMajorGoal,
  projectStatus,
  canEdit,
}: ProjectActionsProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info"; isVisible: boolean }>({
    message: "",
    type: "info",
    isVisible: false,
  });

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type, isVisible: true });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        showToast("Project deleted successfully!", "success");
        setTimeout(() => {
          router.push("/projects");
        }, 1000);
      } else {
        const error = await response.json();
        showToast(error.error || "Failed to delete project", "error");
        setShowDeleteModal(false);
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      showToast("Error deleting project", "error");
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  if (!canEdit) return null;

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowEditModal(true)}
          className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
          title="Edit Project"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="p-2.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-gray-200"
          title="Delete Project"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {showEditModal && (
        <EditProjectModal
          projectId={projectId}
          initialData={{
            name: projectName,
            description: projectDescription || "",
            majorGoal: projectMajorGoal,
            status: projectStatus,
          }}
          onClose={() => {
            setShowEditModal(false);
            router.refresh();
          }}
          onSuccess={(message) => {
            showToast(message, "success");
            router.refresh();
          }}
        />
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Project"
        message="Are you sure you want to delete this project? All milestones and related data will be deleted. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </>
  );
}
