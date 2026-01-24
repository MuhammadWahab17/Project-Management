"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { useSession } from "next-auth/react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  majorGoal: string;
  status: string;
  createdBy: string | null;
  milestones: Array<{ id: string; title: string }>;
}

export default function ProjectsPage() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [creatorFilter, setCreatorFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Check if user is manager
  const isManager = (session?.user as any)?.role === "manager";
  const currentUserEmail = session?.user?.email || "";

  // Get display name for project creator
  const getCreatorName = (email: string | null) => {
    if (!email) return "Unknown";
    if (email === "manager@softechinc.ai") return "Manager";
    if (email === "nazish@softechinc.ai") return "Nazish";
    if (email === "soban@softechinc.ai") return "Soban";
    return email;
  };

  // Get color for creator badge
  const getCreatorBadgeColor = (email: string | null) => {
    if (!email) return "bg-gray-100 text-gray-700 border-gray-200";
    if (email === "manager@softechinc.ai") return "bg-blue-100 text-blue-700 border-blue-200";
    if (email === "nazish@softechinc.ai") return "bg-purple-100 text-purple-700 border-purple-200";
    if (email === "soban@softechinc.ai") return "bg-green-100 text-green-700 border-green-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    let filtered = projects;

    // Apply creator filter (for managers only)
    if (isManager && creatorFilter !== "all") {
      filtered = filtered.filter((project) => {
        // Handle exact match, null cases, and trim whitespace
        const projectCreatedBy = project.createdBy?.trim().toLowerCase();
        const filterValue = creatorFilter?.trim().toLowerCase();
        
        // If filtering for manager's own projects and project has null createdBy, include it (legacy projects)
        if (creatorFilter === currentUserEmail && !project.createdBy) {
          return true;
        }
        
        return projectCreatedBy === filterValue;
      });
    }

    // Apply search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (project) =>
          project.name.toLowerCase().includes(query) ||
          project.description?.toLowerCase().includes(query) ||
          project.majorGoal.toLowerCase().includes(query) ||
          project.status.toLowerCase().includes(query)
      );
    }

    setFilteredProjects(filtered);
  }, [searchQuery, creatorFilter, projects, isManager]);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const data = await response.json();
        console.log("Fetched projects:", data);
        console.log("Projects with createdBy:", data.map((p: Project) => ({ name: p.name, createdBy: p.createdBy })));
        setProjects(data);
        setFilteredProjects(data);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Projects</h1>
              <p className="text-gray-600">Manage all your projects and track their progress</p>
            </div>
            <Link
              href="/projects/new"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 font-semibold flex items-center whitespace-nowrap"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </Link>
          </div>

          {/* Filters */}
          <div className="mb-6 space-y-3">
            {/* Creator Filter (for managers only) */}
            {isManager && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Creator
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm text-left flex items-center justify-between hover:border-gray-400 transition-colors text-gray-900"
                  >
                    <span className="text-gray-900">
                      {creatorFilter === "all" && "All Projects"}
                      {creatorFilter === currentUserEmail && "My Projects"}
                      {creatorFilter === "nazish@softechinc.ai" && "Nazish's Projects"}
                      {creatorFilter === "soban@softechinc.ai" && "Soban's Projects"}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${dropdownOpen ? "transform rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {dropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setDropdownOpen(false)}
                      ></div>
                      <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-xl shadow-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            setCreatorFilter("all");
                            setDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors ${
                            creatorFilter === "all" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-900"
                          }`}
                        >
                          All Projects
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCreatorFilter(currentUserEmail);
                            setDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors ${
                            creatorFilter === currentUserEmail ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-900"
                          }`}
                        >
                          My Projects
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCreatorFilter("nazish@softechinc.ai");
                            setDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors ${
                            creatorFilter === "nazish@softechinc.ai" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-900"
                          }`}
                        >
                          Nazish's Projects
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCreatorFilter("soban@softechinc.ai");
                            setDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors ${
                            creatorFilter === "soban@softechinc.ai" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-900"
                          }`}
                        >
                          Soban's Projects
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            
            {/* Search Filter */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-10 pr-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <svg
                className="w-5 h-5 text-gray-400 absolute left-3 top-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {(searchQuery || (isManager && creatorFilter !== "all")) && (
              <p className="text-sm text-gray-600">
                Found {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {filteredProjects.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center border border-gray-100">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-gray-600 text-lg mb-4">
                {searchQuery ? "No projects found matching your search." : "No projects yet."}
              </p>
              {!searchQuery && (
                <Link
                  href="/projects/new"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Create your first project
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-4 sm:p-6 border border-gray-100 transform hover:-translate-y-1 sm:hover:-translate-y-2 group cursor-pointer block"
                >
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate flex-1 min-w-0">
                      {project.name}
                    </h2>
                    <span
                      className={`px-2 sm:px-3 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${
                        project.status === "active"
                          ? "bg-green-100 text-green-800 border border-green-200"
                          : project.status === "completed"
                          ? "bg-gray-100 text-gray-800 border border-gray-200"
                          : "bg-yellow-100 text-yellow-800 border border-yellow-200"
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>
                  {/* Show creator badge for managers */}
                  {isManager && project.createdBy && (
                    <div className="mb-3">
                      <span
                        className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getCreatorBadgeColor(project.createdBy)}`}
                      >
                        Created by: {getCreatorName(project.createdBy)}
                      </span>
                    </div>
                  )}
                  {/* Show "My Project" badge for non-managers */}
                  {!isManager && project.createdBy === currentUserEmail && (
                    <div className="mb-3">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full border bg-blue-100 text-blue-700 border-blue-200">
                        My Project
                      </span>
                    </div>
                  )}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
                    {project.description || "No description"}
                  </p>
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Major Goal</p>
                    <p className="text-sm text-gray-800 font-medium leading-relaxed line-clamp-2">
                      {project.majorGoal}
                    </p>
                  </div>
                  {project.milestones.length > 0 && (
                    <div className="flex items-center text-sm mb-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      <span className="text-blue-600 font-medium">Current: {project.milestones[0].title}</span>
                    </div>
                  )}
                  {project.milestones.length === 0 && (
                    <div className="flex items-center text-sm text-gray-400 mb-2">
                      <span>No current milestone</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

