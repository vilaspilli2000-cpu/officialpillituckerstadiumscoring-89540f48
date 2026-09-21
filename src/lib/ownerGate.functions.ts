import { createHash, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";

type OwnerGateSession = { unlocked?: boolean };

function sessionConfig() {
  return {
    password: process.env["PTS_OWNER_SESSION_SECRET"]!,
    name: "pts-owner-gate",
    maxAge: 60 * 60 * 24 * 7,
    cookie: {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

function matchesSecret(input: string, expected: string): boolean {
  const inputHash = createHash("sha256").update(input, "utf8").digest();
  const expectedHash = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(inputHash, expectedHash);
}

export const getOwnerAccess = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<OwnerGateSession>(sessionConfig());
  return { unlocked: session.data.unlocked === true };
});

export const unlockOwnerAccess = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const expectedUsername = process.env["PTS_OWNER_USERNAME"];
    const expectedPassword = process.env["PTS_OWNER_PASSWORD"];
    if (!expectedUsername || !expectedPassword) {
      throw new Error("Owner access is unavailable");
    }

    const valid =
      matchesSecret(data.username, expectedUsername) &&
      matchesSecret(data.password, expectedPassword);
    if (!valid) return { ok: false as const };

    const session = await useSession<OwnerGateSession>(sessionConfig());
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const lockOwnerAccess = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<OwnerGateSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});