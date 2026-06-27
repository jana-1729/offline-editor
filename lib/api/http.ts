import { NextResponse } from "next/server";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
export const unauthorized = () => json({ error: "Unauthorized" }, 401);
export const forbidden = () => json({ error: "Forbidden" }, 403);
export const notFound = (m = "Not found") => json({ error: m }, 404);
export const badRequest = (m = "Bad request") => json({ error: m }, 400);
export const invalid = (issues: unknown) =>
  json({ error: "Invalid input", issues }, 422);

/** Parse a JSON body, returning undefined on malformed input. */
export async function readJson(req: Request): Promise<unknown | undefined> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

export function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}
export function fromBase64(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}
