import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const todos = await prisma.todo.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(todos);
}

export async function POST(request: Request) {
  const { text } = await request.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }
  const todo = await prisma.todo.create({
    data: { text: text.trim() },
  });
  return NextResponse.json(todo);
}

export async function PATCH(request: Request) {
  const { id, completed } = await request.json();
  const todo = await prisma.todo.update({
    where: { id },
    data: { completed },
  });
  return NextResponse.json(todo);
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  await prisma.todo.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
