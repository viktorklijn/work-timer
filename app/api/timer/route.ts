import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const timer = await prisma.activeTimer.findUnique({
      where: { id: "main" },
    });
    return NextResponse.json(timer);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch active timer" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.sessionStart || !data.checkpointStart) {
      return NextResponse.json({ error: "Missing time fields" }, { status: 400 });
    }

    const timer = await prisma.activeTimer.upsert({
      where: { id: "main" },
      update: {
        sessionStart: new Date(data.sessionStart),
        checkpointStart: new Date(data.checkpointStart),
        comment: data.comment || "",
        projectId: data.projectId || null,
      },
      create: {
        id: "main",
        sessionStart: new Date(data.sessionStart),
        checkpointStart: new Date(data.checkpointStart),
        comment: data.comment || "",
        projectId: data.projectId || null,
      },
    });

    return NextResponse.json(timer);
  } catch (error) {
    console.error("Failed to update active timer:", error);
    return NextResponse.json(
      { error: "Failed to update active timer" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await prisma.activeTimer.deleteMany({
      where: { id: "main" },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete active timer" },
      { status: 500 }
    );
  }
}
