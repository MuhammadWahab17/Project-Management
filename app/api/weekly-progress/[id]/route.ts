import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

export async function PATCH(
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

    const body = await request.json();
    const {
      completedThisWeek,
      plannedForNextWeek,
      taskDelays,
      goalsAchieved,
      notes,
    } = body;

    // Get the weekly progress and its milestone's project to verify access
    const weeklyProgress = await prisma.weeklyProgress.findUnique({
      where: { id: params.id },
      include: {
        milestone: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!weeklyProgress) {
      return NextResponse.json(
        { error: "Weekly progress not found" },
        { status: 404 }
      );
    }

    // Check access: manager can access all, others only their own projects
    const userRole = (session.user as any).role || "user";
    const projectCreatedBy = weeklyProgress.milestone.project.createdBy;
    
    if (userRole !== "manager") {
      if (!projectCreatedBy || projectCreatedBy !== session.user.email) {
        return NextResponse.json(
          { error: "Access denied. You can only edit progress for your own projects." },
          { status: 403 }
        );
      }
    }

    const updated = await prisma.weeklyProgress.update({
      where: { id: params.id },
      data: {
        ...(completedThisWeek !== undefined && { completedThisWeek }),
        ...(plannedForNextWeek !== undefined && { plannedForNextWeek }),
        ...(taskDelays !== undefined && { taskDelays }),
        ...(goalsAchieved !== undefined && { goalsAchieved }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        milestone: {
          include: {
            project: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating weekly progress:", error);
    return NextResponse.json(
      { error: "Failed to update weekly progress" },
      { status: 500 }
    );
  }
}

