import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Navigation from "@/components/Navigation";
import Link from "next/link";
import { getCurrentWeekSunday, getCurrentWeekSaturday, getWeekNumber, formatDate, getWeekSinceProjectStart, getISOWeek } from "@/lib/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import ActionButtons from "./ActionButtons";
import MilestoneActions from "./MilestoneActions";
import WeeklyProgressItem from "./WeeklyProgressItem";
import WeeklyProgressLink from "./WeeklyProgressLink";

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect("/login");
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      milestones: {
        include: {
          weeklyProgress: {
            orderBy: { weekStartDate: "desc" },
          },
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  // Check access: manager can see all, others only their own
  const userRole = (session.user as any).role || "user";
  const projectCreatedBy = project.createdBy;
  const canEditProject: boolean = userRole === "manager" || (projectCreatedBy !== null && projectCreatedBy === session.user.email);
  
  if (!canEditProject && !projectCreatedBy) {
    // Legacy project with no creator - only manager can see
    if (userRole !== "manager") {
      redirect("/projects");
    }
  } else if (!canEditProject) {
    redirect("/projects");
  }

  // Sort milestones: current first, then by targetDate or createdAt
  const sortedMilestones = [...project.milestones].sort((a, b) => {
    // Current milestone first
    if (a.isCurrent && !b.isCurrent) return -1;
    if (!a.isCurrent && b.isCurrent) return 1;
    
    // Then by targetDate if available
    if (a.targetDate && b.targetDate) {
      return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
    }
    if (a.targetDate) return -1;
    if (b.targetDate) return 1;
    
    // Finally by createdAt
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Get all current milestones (up to 2)
  const currentMilestones = project.milestones.filter((m) => m.isCurrent);
  const isSunday = new Date().getDay() === 0;

  // Get all weekly progress for all current milestones
  const allWeeklyProgress = currentMilestones.flatMap((m) => m.weeklyProgress || []);

  // Calculate stats
  const totalMilestones = project.milestones.length;
  const completedMilestones = project.milestones.filter(m => m.status === "completed").length;
  const totalProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link
              href="/projects"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
          Projects
            </Link>
          </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Header */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="px-6 py-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <h1 className="text-4xl font-bold text-gray-900">{project.name}</h1>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      project.status === "active"
                      ? "bg-green-100 text-green-800"
                        : project.status === "completed"
                      ? "bg-gray-100 text-gray-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {project.status.toUpperCase()}
                  </span>
                </div>
                {project.description && (
                  <p className="text-lg text-gray-600 mb-6">{project.description}</p>
                )}
                
                {/* Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <div className="text-sm text-gray-600 mb-1">Total Milestones</div>
                    <div className="text-3xl font-bold text-gray-900">{totalMilestones}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <div className="text-sm text-gray-600 mb-1">Completed</div>
                    <div className="text-3xl font-bold text-green-600">{completedMilestones}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <div className="text-sm text-gray-600 mb-1">Progress</div>
                    <div className="text-3xl font-bold text-blue-600">{totalProgress}%</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <ActionButtons
                projectId={project.id}
                projectName={project.name}
                projectDescription={project.description}
                projectMajorGoal={project.majorGoal}
                projectStatus={project.status}
                canEdit={canEditProject}
              />
            </div>

            {/* Major Goal Section */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-900">Major Goal</h2>
              </div>
              <p className="text-xl text-gray-700 leading-relaxed">{project.majorGoal}</p>
            </div>
            </div>
          </div>

        {/* Sunday Banner */}
        {isSunday && currentMilestones.length > 0 && (
          <div className="bg-blue-600 rounded-lg p-6 mb-6 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-xl font-semibold">It's Sunday!</h3>
                </div>
                <p className="text-blue-100">
                  Time to track your weekly progress. {currentMilestones.length > 1 && `You have ${currentMilestones.length} active milestones.`}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {currentMilestones.map((milestone) => (
                  <WeeklyProgressLink
                    key={milestone.id}
                    href={`/weekly-progress/new?milestoneId=${milestone.id}`}
                    variant="button"
                    className="w-full sm:w-auto justify-center bg-white text-blue-600 hover:bg-blue-50 transform hover:scale-105 font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>{currentMilestones.length > 1 ? milestone.title : "Create Report"}</span>
                  </WeeklyProgressLink>
                ))}
              </div>
              </div>
            </div>
          )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Milestones Section - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-5 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Milestones</h2>
                      <p className="text-sm text-gray-500">{sortedMilestones.length} milestone{sortedMilestones.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
            {sortedMilestones.length === 0 ? (
              <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 font-medium mb-1">No milestones yet</p>
                    <p className="text-sm text-gray-500">Create your first milestone to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedMilestones.map((milestone) => {
                  const progressCount = milestone.weeklyProgress.length;
                  return (
                    <div
                      key={milestone.id}
                          className={`rounded-lg border-2 p-5 transition-all ${
                        milestone.isCurrent
                              ? "border-blue-300 bg-blue-50"
                              : "border-gray-200 bg-white"
                      }`}
                    >
                          {/* Milestone Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">{milestone.title}</h3>
                            {milestone.isCurrent && (
                                  <span className="px-2 py-1 text-xs font-semibold bg-blue-600 text-white rounded-full">
                                    CURRENT
                              </span>
                            )}
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                milestone.status === "completed"
                                    ? "bg-green-100 text-green-800"
                                  : milestone.status === "in-progress"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}>
                              {milestone.status}
                            </span>
                          </div>
                          {milestone.description && (
                                <p className="text-gray-600 mb-3">{milestone.description}</p>
                          )}
                          {milestone.targetDate && (
                                <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Target: {formatDate(milestone.targetDate)}
                            </div>
                          )}
                        </div>
                            {canEditProject && (
                              <MilestoneActions
                                milestoneId={milestone.id}
                                currentStatus={milestone.status}
                                isCurrent={milestone.isCurrent}
                                canEdit={canEditProject}
                              />
                            )}
                      </div>

                          {/* Weekly Progress Preview */}
                          {milestone.isCurrent && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                  </svg>
                                  <span className="text-sm font-medium text-gray-700">Weekly Progress</span>
                                </div>
                                {canEditProject && (
                                  <WeeklyProgressLink
                                    href={`/weekly-progress/new?milestoneId=${milestone.id}`}
                                    variant="button"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span>Add Progress</span>
                                  </WeeklyProgressLink>
                                )}
                                      </div>
                              {milestone.weeklyProgress.length > 0 ? (
                                <>
                                  <div className="text-xs text-gray-500 mb-3">{progressCount} report{progressCount !== 1 ? 's' : ''}</div>
                                  <div className="space-y-2">
                                    {milestone.weeklyProgress.slice(0, 2).map((progress) => (
                                      <WeeklyProgressItem
                                        key={progress.id}
                                        progress={{
                                          ...progress,
                                          taskDelays: (progress as any).taskDelays || null,
                                        }}
                                        canEdit={canEditProject}
                                        projectStartDate={project.createdAt}
                                      />
                                    ))}
                                  </div>
                                </>
                              ) : (
                                <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
                                  <p className="text-sm text-gray-600 mb-2">No progress reports yet</p>
                                  {canEditProject && (
                                    <WeeklyProgressLink
                                      href={`/weekly-progress/new?milestoneId=${milestone.id}`}
                                      variant="link"
                                    >
                                      Create First Report
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </WeeklyProgressLink>
                                  )}
                                </div>
                              )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
              </div>
            </div>
          </div>

          {/* Sidebar - Weekly Progress History */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 sticky top-6">
              <div className="px-6 py-5 border-b border-gray-200">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                    </div>
                        <div>
                      <h2 className="text-xl font-semibold text-gray-900">Progress History</h2>
                      <p className="text-sm text-gray-500">{allWeeklyProgress.length} report{allWeeklyProgress.length !== 1 ? 's' : ''}</p>
                          </div>
                          </div>
                        </div>
                {currentMilestones.length > 0 && (
                  <div className="space-y-2">
                    {currentMilestones.length === 1 ? (
                      <WeeklyProgressLink
                        href={`/weekly-progress/new?milestoneId=${currentMilestones[0].id}`}
                        variant="button"
                        className="w-full justify-center bg-blue-600 text-white hover:bg-blue-700 text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Add Weekly Progress</span>
                      </WeeklyProgressLink>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-xs text-gray-500 font-medium">Add Progress For:</div>
                        {currentMilestones.map((milestone) => (
                          <WeeklyProgressLink
                            key={milestone.id}
                            href={`/weekly-progress/new?milestoneId=${milestone.id}`}
                            variant="button"
                            className="block w-full text-center bg-blue-600 text-white hover:bg-blue-700 text-sm"
                          >
                            {milestone.title}
                          </WeeklyProgressLink>
                              ))}
                          </div>
                        )}
                          </div>
                        )}
                      </div>
                      
              <div className="p-6">
                {allWeeklyProgress.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">No progress reports yet</p>
                    {currentMilestones.length > 0 && (
                      <WeeklyProgressLink
                        href={`/weekly-progress/new?milestoneId=${currentMilestones[0].id}`}
                        variant="link"
                      >
                        Create First Report
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </WeeklyProgressLink>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto">
                    {allWeeklyProgress.map((progress) => (
                      <WeeklyProgressItem
                        key={progress.id}
                        progress={{
                          ...progress,
                          taskDelays: (progress as any).taskDelays || null,
                        }}
                        canEdit={canEditProject}
                        projectStartDate={project.createdAt}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            </div>
        </div>
      </div>
    </div>
  );
}
