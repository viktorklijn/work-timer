import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(projects);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, color } = await request.json();

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        color: color || null,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002") {
        return NextResponse.json({ error: "Project with this name already exists" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
