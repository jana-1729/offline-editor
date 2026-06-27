import { SignJWT, jwtVerify } from "jose";

/**
 * Short-lived tokens used to authenticate the browser to the realtime
 * WebSocket server. Signed with the same AUTH_SECRET as Auth.js, but minted on
 * demand so the httpOnly session cookie is never exposed to client JS.
 */
function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function signWsToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret());
}

/** Returns the userId if valid, otherwise null. Never throws. */
export async function verifyWsToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
