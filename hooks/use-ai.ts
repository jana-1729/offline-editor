"use client";

import { useCallback, useState } from "react";
import type { Editor } from "@tiptap/react";
import { toast } from "sonner";
import type { AiAction } from "@/lib/ai/gemini";

export interface AiController {
  open: boolean;
  setOpen: (o: boolean) => void;
  loading: boolean;
  output: string;
  action: AiAction;
  canWrite: boolean;
  run: (which: AiAction) => Promise<void>;
  apply: () => void;
}

/** Shared AI action logic used by both the toolbar menu and the bubble menu. */
export function useAi(
  editor: Editor | null,
  canWrite: boolean,
  onApplyTitle?: (title: string) => void,
): AiController {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [action, setAction] = useState<AiAction>("summarize");
  const [range, setRange] = useState<{ from: number; to: number } | null>(null);

  const run = useCallback(
    async (which: AiAction) => {
      if (!editor) return;
      const { from, to } = editor.state.selection;
      const selected =
        from !== to ? editor.state.doc.textBetween(from, to, "\n") : "";
      const text =
        which === "improve" ? selected || editor.getText() : editor.getText();
      if (!text.trim()) {
        toast.error("There's no text to work with yet.");
        return;
      }
      setAction(which);
      setRange(which === "improve" && selected ? { from, to } : null);
      setOutput("");
      setOpen(true);
      setLoading(true);
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: which, text: text.slice(0, 20_000) }),
        });
        if (res.status === 503) {
          const j = await res.json().catch(() => ({}));
          toast.error(j.error ?? "AI is not configured.");
          setOpen(false);
          return;
        }
        if (!res.ok || !res.body) {
          toast.error("AI request failed.");
          setOpen(false);
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setOutput(acc);
        }
        // A mid-stream model error (e.g. quota) ends the stream with no text.
        if (!acc.trim()) {
          toast.error(
            "AI couldn't generate a response — the model may be rate-limited. Try again shortly.",
          );
          setOpen(false);
        }
      } catch {
        toast.error("AI request failed.");
        setOpen(false);
      } finally {
        setLoading(false);
      }
    },
    [editor],
  );

  const apply = useCallback(() => {
    if (!editor) return;
    const text = output.trim();
    if (!text) return;
    if (action === "suggestTitle") {
      onApplyTitle?.(text);
      toast.success("Title applied");
    } else if (action === "improve") {
      if (range) {
        editor.chain().focus().insertContentAt(range, text).run();
      } else {
        editor.commands.setContent(text);
      }
      toast.success("Replaced with improved text");
    } else {
      editor
        .chain()
        .focus()
        .insertContentAt(editor.state.doc.content.size, `\n${text}`)
        .run();
      toast.success("Inserted summary");
    }
    setOpen(false);
  }, [editor, output, action, range, onApplyTitle]);

  return { open, setOpen, loading, output, action, canWrite, run, apply };
}
