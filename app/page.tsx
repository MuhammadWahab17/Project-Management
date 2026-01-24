import Link from "next/link";
import Navigation from "@/components/Navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

export const dynamic = 'force-dynamic';

async function getStats() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return { projectCount: 0, milestoneCount: 0, progressCount: 0, reminderCount: 0 };
    }

    const userEmail = session.user.email;
    const userRole = (session.user as any).role || "user";

    // Build filters: manager sees all, others only their own
    let projectFilter: any = {};
    if (userRole !== "manager") {
      projectFilter.createdBy = userEmail;
    }

    // Get user's projects for counting milestones and progress
    const userProjects = await prisma.project.findMany({
      where: projectFilter,
      select: { id: true },
    });
    const projectIds = userProjects.map((p) => p.id);

    const [projectCount, milestoneCount, progressCount, reminderCount] = await Promise.all([
      prisma.project.count({ where: projectFilter }),
      prisma.milestone.count({ where: { projectId: { in: projectIds } } }),
      prisma.weeklyProgress.count({
        where: { milestone: { projectId: { in: projectIds } } },
      }),
      prisma.emailReminder.count({
        where: {
          status: "scheduled",
          project: projectFilter,
        },
      }),
    ]);

    return { projectCount, milestoneCount, progressCount, reminderCount };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return { projectCount: 0, milestoneCount: 0, progressCount: 0, reminderCount: 0 };
  }
}

export default async function Home() {
  const stats = await getStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navigation />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16 animate-fadeIn">
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Welcome to Softech Inc
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Streamline your project management workflow with powerful tracking, milestones, and progress monitoring.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20 transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats.projectCount}</div>
              <div className="text-sm text-gray-600">Active Projects</div>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20 transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats.milestoneCount}</div>
              <div className="text-sm text-gray-600">Milestones</div>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20 transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats.progressCount}</div>
              <div className="text-sm text-gray-600">Progress Reports</div>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20 transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats.reminderCount}</div>
              <div className="text-sm text-gray-600">Scheduled Reminders</div>
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <Link
              href="/projects"
              className="group bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20 hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-200">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <svg className="w-6 h-6 text-gray-400 transform group-hover:translate-x-2 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Projects</h2>
              <p className="text-gray-600 mb-4">
                Create and manage your projects with clear major goals and track progress through milestones.
              </p>
              <div className="inline-flex items-center text-blue-600 font-semibold group-hover:text-blue-700">
                Manage Projects
                <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </Link>

            <Link
              href="/reminders"
              className="group bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20 hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-200">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <svg className="w-6 h-6 text-gray-400 transform group-hover:translate-x-2 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Email Reminders</h2>
              <p className="text-gray-600 mb-4">
                Schedule automated email reminders to stay on top of important follow-ups and project check-ins.
              </p>
              <div className="inline-flex items-center text-orange-600 font-semibold group-hover:text-orange-700">
                Manage Reminders
                <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </Link>
          </div>

          {/* Quick Start Guide */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-6">Quick Start Guide</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex flex-col">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-4 font-bold text-lg">1</div>
                <h4 className="font-semibold mb-2">Create Project</h4>
                <p className="text-sm text-blue-100">Start by creating a new project with a clear major goal.</p>
              </div>
              <div className="flex flex-col">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-4 font-bold text-lg">2</div>
                <h4 className="font-semibold mb-2">Add Milestones</h4>
                <p className="text-sm text-blue-100">Break down your project into manageable milestones.</p>
              </div>
              <div className="flex flex-col">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-4 font-bold text-lg">3</div>
                <h4 className="font-semibold mb-2">Track Progress</h4>
                <p className="text-sm text-blue-100">Set a current milestone and track weekly progress every Sunday.</p>
              </div>
              <div className="flex flex-col">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-4 font-bold text-lg">4</div>
                <h4 className="font-semibold mb-2">Set Reminders</h4>
                <p className="text-sm text-blue-100">Schedule email reminders for important follow-ups.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
