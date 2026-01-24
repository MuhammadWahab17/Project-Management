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
    const { status } = body;

    const reminder = await prisma.emailReminder.findUnique({
      where: { id: params.id },
      include: {
        project: true,
      },
    });

    if (!reminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    // Check access: manager can modify all, others only their own project reminders
    const userRole = (session.user as any).role || "user";
    if (userRole !== "manager" && reminder.project.createdBy !== session.user.email) {
      return NextResponse.json(
        { error: "Access denied. You can only modify reminders for your own projects." },
        { status: 403 }
      );
    }

    const updated = await prisma.emailReminder.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating reminder:", error);
    return NextResponse.json(
      { error: "Failed to update reminder" },
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

    const reminder = await prisma.emailReminder.findUnique({
      where: { id: params.id },
      include: {
        project: true,
      },
    });

    if (!reminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    // Check access: manager can delete all, others only their own project reminders
    const userRole = (session.user as any).role || "user";
    if (userRole !== "manager" && reminder.project.createdBy !== session.user.email) {
      return NextResponse.json(
        { error: "Access denied. You can only delete reminders for your own projects." },
        { status: 403 }
      );
    }

    await prisma.emailReminder.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Reminder deleted" });
  } catch (error) {
    console.error("Error deleting reminder:", error);
    return NextResponse.json(
      { error: "Failed to delete reminder" },
      { status: 500 }
    );
  }
}
