import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  try {
    const entries = await prisma.entry.findMany({
      where:
        from && to
          ? { date: { gte: new Date(from), lte: new Date(to) } }
          : undefined,
      include: {
        project: true,
      },
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
    });
    return NextResponse.json(entries);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch entries" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { date, startTime, endTime, durationSeconds, comment, projectId } =
      await request.json();

    const entry = await prisma.entry.create({
      data: {
        date: new Date(date),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        durationSeconds,
        comment,
        projectId: projectId || null,
      },
      include: {
        project: true,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create entry" },
      { status: 500 }
    );
  }
}
