import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        milestones: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check access: manager can see all, others only their own
    const userRole = (session.user as any).role || "user";
    if (userRole !== "manager" && project.createdBy !== session.user.email) {
      return NextResponse.json(
        { error: "Access denied. You can only view your own projects." },
        { status: 403 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if project exists and user has access
    const existingProject = await prisma.project.findUnique({
      where: { id: params.id },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check access: manager can edit all, others only their own
    const userRole = (session.user as any).role || "user";
    const projectCreatedBy = existingProject.createdBy;
    
    // If project has no creator (null), only manager can edit
    if (userRole !== "manager") {
      if (!projectCreatedBy || projectCreatedBy !== session.user.email) {
        return NextResponse.json(
          { error: "Access denied. You can only edit your own projects." },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { name, description, majorGoal, status } = body;

    if (!name || !majorGoal) {
      return NextResponse.json(
        { error: "Name and major goal are required" },
        { status: 400 }
      );
    }

    const project = await prisma.project.update({
      where: { id: params.id },
      data: {
        name,
        description: description || null,
        majorGoal,
        status: status || "active",
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if project exists and user has access
    const existingProject = await prisma.project.findUnique({
      where: { id: params.id },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check access: manager can delete all, others only their own
    const userRole = (session.user as any).role || "user";
    const projectCreatedBy = existingProject.createdBy;
    
    // If project has no creator (null), only manager can delete
    if (userRole !== "manager") {
      if (!projectCreatedBy || projectCreatedBy !== session.user.email) {
        return NextResponse.json(
          { error: "Access denied. You can only delete your own projects." },
          { status: 403 }
        );
      }
    }

    console.log("Deleting project:", params.id);
    
    // Delete related records first (cascade delete)
    // Delete email reminders
    await prisma.emailReminder.deleteMany({
      where: { projectId: params.id },
    });
    console.log("Deleted email reminders");

    // Delete weekly progress through milestones
    const milestones = await prisma.milestone.findMany({
      where: { projectId: params.id },
      select: { id: true },
    });
    const milestoneIds = milestones.map((m) => m.id);
    
    if (milestoneIds.length > 0) {
      await prisma.weeklyProgress.deleteMany({
        where: { milestoneId: { in: milestoneIds } },
      });
      console.log("Deleted weekly progress records");
    }

    // Delete milestones
    await prisma.milestone.deleteMany({
      where: { projectId: params.id },
    });
    console.log("Deleted milestones");

    // Finally delete the project
    await prisma.project.delete({
      where: { id: params.id },
    });
    console.log("Project deleted successfully");

    return NextResponse.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("=== ERROR DELETING PROJECT ===");
    console.error("Error:", error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      return NextResponse.json(
        { error: "Failed to delete project", details: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete project", details: String(error) },
      { status: 500 }
    );
  }
}
