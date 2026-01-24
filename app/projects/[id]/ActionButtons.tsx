"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ProjectActions from "./ProjectActions";

interface ActionButtonsProps {
  projectId: string;
  projectName: string;
  projectDescription: string | null;
  projectMajorGoal: string;
  projectStatus: string;
  canEdit: boolean;
}

export default function ActionButtons({
  projectId,
  projectName,
  projectDescription,
  projectMajorGoal,
  projectStatus,
  canEdit,
}: ActionButtonsProps) {
  const pathname = usePathname();
  const [loadingAddMilestone, setLoadingAddMilestone] = useState(false);

  useEffect(() => {
    // Clear loading state when pathname changes
    setLoadingAddMilestone(false);
  }, [pathname]);

  return (
    <div className="flex items-start gap-3 flex-shrink-0">
      {canEdit && (
        <ProjectActions
          projectId={projectId}
          projectName={projectName}
          projectDescription={projectDescription}
          projectMajorGoal={projectMajorGoal}
          projectStatus={projectStatus}
          canEdit={canEdit}
        />
      )}
      <Link
        href={`/projects/${projectId}/milestones/new`}
        onClick={() => setLoadingAddMilestone(true)}
        className={`inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium ${
          loadingAddMilestone ? "opacity-75 cursor-wait" : ""
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span>Add Milestone</span>
        {loadingAddMilestone && (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
      </Link>
    </div>
  );
}

