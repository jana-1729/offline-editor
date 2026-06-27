import { streamText } from "ai";
import { currentUser } from "@/lib/api/guard";
import { json, unauthorized, invalid, readJson } from "@/lib/api/http";
import { aiActionSchema } from "@/lib/validation/ai";
import { aiAvailable, getModel, buildPrompt } from "@/lib/ai/gemini";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();

  if (!aiAvailable()) {
    return json(
      { error: "AI is not configured. Add GOOGLE_API_KEY to enable it." },
      503,
    );
  }

  const body = await readJson(req);
  const parsed = aiActionSchema.safeParse(body);
  if (!parsed.success) return invalid(parsed.error.flatten().fieldErrors);

  const result = streamText({
    model: getModel(),
    prompt: buildPrompt(parsed.data.action, parsed.data.text),
    onError: ({ error }) => {
      // Streaming errors (quota, invalid key, model errors) surface here.
      console.error("[ai] stream error:", error);
    },
  });

  return result.toTextStreamResponse();
}
