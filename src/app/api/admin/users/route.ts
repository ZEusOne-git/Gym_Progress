import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return null;
  return user;
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const users = await prisma.user.findMany({
    where: { role: "USER" },
    orderBy: [{ profile: { firstName: "asc" } }, { email: "asc" }],
    select: { id: true, email: true, profile: { select: { firstName: true } } },
  });
  return NextResponse.json(users);
}
