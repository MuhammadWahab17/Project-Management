import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transporter } from "@/lib/mailer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { config } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    console.log("=== REMINDER SEND REQUEST ===");
    
    const session = await getServerSession(authOptions);
    console.log("Session:", session?.user?.email);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log("Request body:", body);
    const { reminderId } = body;

    if (!reminderId) {
      return NextResponse.json(
        { error: "Reminder ID is required" },
        { status: 400 }
      );
    }

    console.log("Fetching reminder with ID:", reminderId);
    const reminder = await prisma.emailReminder.findUnique({
      where: { id: reminderId },
      include: {
        project: true,
      },
    });

    if (!reminder) {
      console.error("Reminder not found:", reminderId);
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    console.log("Reminder found:", {
      id: reminder.id,
      subject: reminder.subject,
      status: reminder.status,
      projectId: reminder.projectId,
      projectName: reminder.project?.name,
      projectCreatedBy: reminder.project?.createdBy,
    });

    // Check access: manager can send all, others only their own project reminders
    const userRole = (session.user as any).role || "user";
    const projectCreatedBy = reminder.project?.createdBy;
    
    console.log("User role:", userRole);
    console.log("Project created by:", projectCreatedBy);
    console.log("Session user email:", session.user.email);
    
    // If project has no creator (null), only manager can send
    if (userRole !== "manager") {
      if (!projectCreatedBy || projectCreatedBy !== session.user.email) {
        return NextResponse.json(
          { error: "Access denied. You can only send reminders for your own projects." },
          { status: 403 }
        );
      }
    }

    if (reminder.status === "sent") {
      return NextResponse.json({ error: "Reminder already sent" }, { status: 400 });
    }

    console.log("Access check passed, proceeding to send email...");

    // Send email
    try {
      const smtpUser = config.smtp.user;
      const appUrl = config.appUrl;
      const companyName = config.companyName;
      console.log("Attempting to send reminder email...");
      console.log("From:", smtpUser);
      console.log("To:", reminder.recipientEmail);
      console.log("Subject:", reminder.subject);

      await transporter.sendMail({
        from: `"${companyName}" <${smtpUser}>`,
        to: reminder.recipientEmail,
        subject: reminder.subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">${reminder.subject}</h2>
            <p><strong>Project:</strong> ${reminder.project.name}</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              ${reminder.message.replace(/\n/g, '<br>')}
            </div>
            <p style="color: #6b7280; font-size: 12px;">This is an automated reminder from <a href="${appUrl}" style="color: #2563eb; text-decoration: none;">${companyName}</a>.</p>
          </div>
        `,
        text: `
${reminder.subject}

Project: ${reminder.project.name}

${reminder.message}

---
This is an automated reminder from ${companyName} (${appUrl}).
        `,
      });

      console.log("Email sent successfully");

      // Update reminder status
      await prisma.emailReminder.update({
        where: { id: reminderId },
        data: { status: "sent" },
      });

      return NextResponse.json({ message: "Reminder sent successfully" });
    } catch (emailError: any) {
      console.error("Error sending email:", emailError);
      console.error("Email error details:", JSON.stringify(emailError, null, 2));
      if (emailError instanceof Error) {
        console.error("Email error message:", emailError.message);
        console.error("Email error code:", (emailError as any).code);
      }
      return NextResponse.json(
        { 
          error: "Failed to send email. Check your SMTP configuration.",
          details: emailError instanceof Error ? emailError.message : String(emailError)
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("=== ERROR PROCESSING REMINDER ===");
    console.error("Error:", error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      return NextResponse.json(
        { 
          error: "Failed to process reminder", 
          details: error.message,
          name: error.name 
        },
        { status: 500 }
      );
    }
    console.error("Non-Error object:", JSON.stringify(error, null, 2));
    return NextResponse.json(
      { 
        error: "Failed to process reminder", 
        details: String(error) 
      },
      { status: 500 }
    );
  }
}

// Endpoint to process all due reminders (for cron jobs)
export async function GET() {
  try {
    const now = new Date();
    
    // Find all scheduled reminders that are due
    const dueReminders = await prisma.emailReminder.findMany({
      where: {
        status: "scheduled",
        reminderDate: {
          lte: now,
        },
      },
      include: {
        project: true,
      },
    });

    const results = [];

    const appUrl = config.appUrl;
    const companyName = config.companyName;
    const smtpUser = config.smtp.user;

    for (const reminder of dueReminders) {
      try {
        await transporter.sendMail({
          from: `"${companyName}" <${smtpUser}>`,
          to: reminder.recipientEmail,
          subject: reminder.subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">${reminder.subject}</h2>
              <p><strong>Project:</strong> ${reminder.project.name}</p>
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                ${reminder.message.replace(/\n/g, '<br>')}
              </div>
              <p style="color: #6b7280; font-size: 12px;">This is an automated reminder from <a href="${appUrl}" style="color: #2563eb; text-decoration: none;">${companyName}</a>.</p>
            </div>
          `,
          text: `
${reminder.subject}

Project: ${reminder.project.name}

${reminder.message}

---
This is an automated reminder from ${companyName} (${appUrl}).
          `,
        });

        await prisma.emailReminder.update({
          where: { id: reminder.id },
          data: { status: "sent" },
        });

        results.push({ id: reminder.id, status: "sent" });
      } catch (error) {
        console.error(`Error sending reminder ${reminder.id}:`, error);
        results.push({ id: reminder.id, status: "error", error: String(error) });
      }
    }

    return NextResponse.json({
      message: `Processed ${dueReminders.length} reminders`,
      results,
    });
  } catch (error) {
    console.error("Error processing reminders:", error);
    return NextResponse.json(
      { error: "Failed to process reminders" },
      { status: 500 }
    );
  }
}

