import { createGoogleGenerativeAI } from "@ai-sdk/google";

export type AiAction = "summarize" | "improve" | "suggestTitle";

/** AI features degrade gracefully: the whole app works without a key. */
export function aiAvailable(): boolean {
  return Boolean(process.env.GOOGLE_API_KEY);
}

export function getModel() {
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY,
  });
  return google(process.env.GEMINI_MODEL ?? "gemini-2.5-flash");
}

export function buildPrompt(action: AiAction, text: string): string {
  switch (action) {
    case "summarize":
      return `Summarize the following document in 3-5 concise bullet points. Return only the bullet points.\n\n${text}`;
    case "improve":
      return `Improve the writing of the following text. Preserve the meaning; fix grammar, clarity and flow. Return only the improved text, with no preamble.\n\n${text}`;
    case "suggestTitle":
      return `Suggest a single concise, descriptive title (max 8 words) for the following document. Return only the title, with no quotes or punctuation around it.\n\n${text}`;
  }
}
