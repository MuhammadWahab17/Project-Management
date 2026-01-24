import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      milestoneId,
      weekStartDate,
      weekEndDate,
      completedThisWeek,
      plannedForNextWeek,
      taskDelays,
      goalsAchieved,
      notes,
    } = body;

    if (!milestoneId || !weekStartDate || !weekEndDate) {
      return NextResponse.json(
        { error: "Milestone ID, week start, and week end dates are required" },
        { status: 400 }
      );
    }

    // Get the milestone and its project to verify access
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        project: true,
      },
    });

    if (!milestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }

    // Check access: manager can access all, others only their own projects
    const userRole = (session.user as any).role || "user";
    const projectCreatedBy = milestone.project.createdBy;
    
    if (userRole !== "manager") {
      if (!projectCreatedBy || projectCreatedBy !== session.user.email) {
        return NextResponse.json(
          { error: "Access denied. You can only add progress to your own projects." },
          { status: 403 }
        );
      }
    }

    // NOTE: taskDelays is temporarily commented out until Prisma client is regenerated
    // After running `npx prisma generate`, uncomment the taskDelays line below
    const weeklyProgress = await prisma.weeklyProgress.create({
      data: {
        milestoneId,
        weekStartDate: new Date(weekStartDate),
        weekEndDate: new Date(weekEndDate),
        completedThisWeek,
        plannedForNextWeek,
        // taskDelays: taskDelays || null, // Uncomment after running `npx prisma generate`
        goalsAchieved: goalsAchieved || false,
        notes: notes || null,
      },
      include: {
        milestone: {
          include: {
            project: true,
          },
        },
      },
    });

    return NextResponse.json({
      ...weeklyProgress,
      projectId: milestone.projectId,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating weekly progress:", error);
    return NextResponse.json(
      { error: "Failed to create weekly progress" },
      { status: 500 }
    );
  }
}
