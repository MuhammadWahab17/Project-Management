import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;
    const userRole = (session.user as any).role || "user";

    // Build project filter: manager sees all, others only their own projects
    let projectFilter: any = {};
    if (userRole !== "manager") {
      projectFilter.createdBy = userEmail;
    }

    const reminders = await prisma.emailReminder.findMany({
      where: {
        project: projectFilter,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        reminderDate: "asc",
      },
    });
    return NextResponse.json(reminders);
  } catch (error) {
    console.error("Error fetching reminders:", error);
    return NextResponse.json(
      { error: "Failed to fetch reminders" },
      { status: 500 }
    );
  }
}

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
    const { projectId, subject, message, recipientEmail, reminderDate } = body;

    if (!projectId || !subject || !message || !recipientEmail || !reminderDate) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Verify user has access to the project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const userRole = (session.user as any).role || "user";
    if (userRole !== "manager" && project.createdBy !== session.user.email) {
      return NextResponse.json(
        { error: "Access denied. You can only create reminders for your own projects." },
        { status: 403 }
      );
    }

    const reminder = await prisma.emailReminder.create({
      data: {
        projectId,
        subject,
        message,
        recipientEmail,
        reminderDate: new Date(reminderDate),
        status: "scheduled",
      },
    });

    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    console.error("Error creating reminder:", error);
    return NextResponse.json(
      { error: "Failed to create reminder" },
      { status: 500 }
    );
  }
}
