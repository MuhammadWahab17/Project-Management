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

    const milestone = await prisma.milestone.findUnique({
      where: { id: params.id },
      include: {
        project: true,
      },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    // Check access: manager can see all, others only their own project milestones
    const userRole = (session.user as any).role || "user";
    if (userRole !== "manager" && milestone.project.createdBy !== session.user.email) {
      return NextResponse.json(
        { error: "Access denied. You can only view milestones for your own projects." },
        { status: 403 }
      );
    }

    return NextResponse.json(milestone);
  } catch (error) {
    console.error("Error fetching milestone:", error);
    return NextResponse.json(
      { error: "Failed to fetch milestone" },
      { status: 500 }
    );
  }
}

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
    const { isCurrent, status } = body;

    const milestone = await prisma.milestone.findUnique({
      where: { id: params.id },
      include: {
        project: true,
      },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    // Check access: manager can update all, others only their own project milestones
    const userRole = (session.user as any).role || "user";
    if (userRole !== "manager" && milestone.project.createdBy !== session.user.email) {
      return NextResponse.json(
        { error: "Access denied. You can only update milestones for your own projects." },
        { status: 403 }
      );
    }

    // If setting this milestone as current, check if we already have 2 current milestones
    // If so, unset the oldest one (by createdAt) to make room
    if (isCurrent) {
      const currentMilestones = await prisma.milestone.findMany({
        where: { 
          projectId: milestone.projectId,
          id: { not: params.id },
          isCurrent: true 
        },
        orderBy: { createdAt: 'asc' },
      });

      // If we already have 2 current milestones, unset the oldest one
      if (currentMilestones.length >= 2) {
        await prisma.milestone.update({
          where: { id: currentMilestones[0].id },
          data: { isCurrent: false },
        });
      }
    }

    const updated = await prisma.milestone.update({
      where: { id: params.id },
      data: {
        ...(isCurrent !== undefined && { isCurrent }),
        ...(status && { status }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating milestone:", error);
    return NextResponse.json(
      { error: "Failed to update milestone" },
      { status: 500 }
    );
  }
}
