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
    
    // Debug: Log session details
    console.log("=== FETCHING PROJECTS ===");
    console.log("Session user:", {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: (session.user as any).role,
    });
    console.log("User email:", userEmail);
    console.log("User role:", userRole);
    console.log("Role check (userRole === 'manager'):", userRole === "manager");
    console.log("Role check (userRole !== 'manager'):", userRole !== "manager");

    // Build where clause based on role
    // Manager can see all projects (no filter = empty object)
    // Users can only see their own projects
    let whereClause: any = {};
    
    if (userRole !== "manager") {
      whereClause.createdBy = userEmail;
      console.log("Non-manager: Filtering by createdBy =", userEmail);
    } else {
      console.log("Manager: No filter - will fetch ALL projects");
    }

    console.log("Final whereClause:", JSON.stringify(whereClause, null, 2));

    // Build query - handle null createdBy values
    let queryWhere: any;
    
    if (userRole !== "manager") {
      // Non-manager: filter by their email (createdBy must match)
      queryWhere = { createdBy: userEmail };
    } else {
      // Manager: see all projects (no filter)
      // Use empty object to fetch all
      queryWhere = {};
    }

    console.log("Query where clause:", JSON.stringify(queryWhere));

    // Use raw MongoDB query as a fallback if Prisma has issues
  try {
    const projects = await prisma.project.findMany({
        where: queryWhere,
      include: {
        milestones: {
          where: { isCurrent: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
      
      console.log("=== RESULTS ===");
      console.log("Found projects:", projects.length, "for user:", userEmail, "with role:", userRole);
      if (projects.length > 0) {
        console.log("Projects list:", projects.map(p => ({ id: p.id, name: p.name, createdBy: p.createdBy })));
      } else {
        console.log("No projects found!");
      }
      
      console.log("=== RESULTS ===");
      console.log("Found projects:", projects.length, "for user:", userEmail, "with role:", userRole);
      if (projects.length > 0) {
        console.log("Projects list:", projects.map(p => ({ id: p.id, name: p.name, createdBy: p.createdBy })));
      } else {
        console.log("No projects found!");
      }
      
    return NextResponse.json(projects);
    } catch (prismaError: any) {
      // If Prisma error is about null values, try using MongoDB directly
      if (prismaError.message && prismaError.message.includes("null")) {
        console.error("Prisma null value error detected, trying alternative query...");
        // For now, just throw the error so we can see it
        throw prismaError;
      }
      throw prismaError;
    }
  } catch (error) {
    console.error("=== ERROR FETCHING PROJECTS ===");
    console.error("Error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      return NextResponse.json(
        { error: "Failed to fetch projects", details: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch projects", details: String(error) },
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
    const { name, description, majorGoal, status } = body;

    if (!name || !majorGoal) {
      return NextResponse.json(
        { error: "Name and major goal are required" },
        { status: 400 }
      );
    }

    const createdByEmail = session.user.email;
    console.log("Creating project for user:", createdByEmail);

    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        majorGoal,
        status: status || "active",
        createdBy: createdByEmail, // Associate project with current user
      },
    });

    console.log("Project created with ID:", project.id, "createdBy:", project.createdBy);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
