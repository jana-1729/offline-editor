import { z } from "zod";

export const aiActionSchema = z.object({
  action: z.enum(["summarize", "improve", "suggestTitle"]),
  // Cap input size to bound token usage and protect the endpoint.
  text: z.string().min(1).max(20_000),
});

export type AiActionInput = z.infer<typeof aiActionSchema>;
