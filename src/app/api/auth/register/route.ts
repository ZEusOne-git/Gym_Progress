import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";

const registrationInput = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  password: z.string().min(8).max(1024),
});

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
    }
    const parsed = registrationInput.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Controlla nome, email e password (almeno 8 caratteri)." }, { status: 400 });
    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Esiste già un account con questa email." }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(password),
        profile: { create: { firstName: name } },
        notificationPrefs: { create: {} },
      },
    });

    await createSession(user.id);
    return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Impossibile creare l'account." }, { status: 500 });
  }
}
