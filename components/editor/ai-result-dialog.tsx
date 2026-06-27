"use client";

import { useState } from "react";
import { Sparkles, Loader2, Copy, Check, CornerDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AiController } from "@/hooks/use-ai";

const TITLES = {
  summarize: "Summary",
  improve: "Improved text",
  suggestTitle: "Suggested title",
} as const;

const APPLY_LABEL = {
  summarize: "Insert",
  improve: "Replace",
  suggestTitle: "Use title",
} as const;

export function AiResultDialog({ ai }: { ai: AiController }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(ai.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const canApply = ai.canWrite || ai.action === "suggestTitle";

  return (
    <Dialog open={ai.open} onOpenChange={ai.setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> {TITLES[ai.action]}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-[8rem] max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/40 p-3 text-sm leading-relaxed">
          {ai.output || (
            <span className="text-muted-foreground">
              {ai.loading ? "Thinking…" : ""}
            </span>
          )}
          {ai.loading && (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-primary align-middle" />
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copy}
            disabled={!ai.output}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            Copy
          </Button>
          {canApply && (
            <Button
              size="sm"
              onClick={ai.apply}
              disabled={!ai.output || ai.loading}
            >
              {ai.loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CornerDownLeft className="size-4" />
              )}
              {APPLY_LABEL[ai.action]}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
