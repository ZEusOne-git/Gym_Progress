import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clearLoginThrottle, createSession, getLoginThrottle, recordFailedLogin, verifyLoginPassword } from "@/lib/auth";

const loginInput = z.object({
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  password: z.string().min(1).max(1024),
});

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
    }

    const parsed = loginInput.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Inserisci un indirizzo email valido e la password." }, { status: 400 });
    const { email, password } = parsed.data;

    const retryAfter = await getLoginThrottle(email);
    if (retryAfter) {
      return NextResponse.json(
        { error: "Troppi tentativi. Riprova tra qualche minuto." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!verifyLoginPassword(password, user?.passwordHash ?? null) || !user) {
      const blockedFor = await recordFailedLogin(email);
      if (blockedFor) {
        return NextResponse.json(
          { error: "Troppi tentativi. Riprova tra qualche minuto." },
          { status: 429, headers: { "Retry-After": String(blockedFor) } },
        );
      }
      return NextResponse.json({ error: "Email o password non corretti." }, { status: 401 });
    }

    await clearLoginThrottle(email);
    await createSession(user.id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Impossibile effettuare il login." }, { status: 500 });
  }
}
