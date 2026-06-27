"use client";

import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import Collaboration from "@tiptap/extension-collaboration";
import { CollaborationCaret } from "@tiptap/extension-collaboration-caret";
import type * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";
import { DOC_FIELD } from "@/lib/sync/reconcile";
import { useAi } from "@/hooks/use-ai";
import { Toolbar } from "./toolbar";
import { EditorBubbleMenu } from "./editor-bubble-menu";
import { AiResultDialog } from "./ai-result-dialog";

export function TiptapEditor({
  doc,
  awareness,
  editable,
  user,
  onApplyTitle,
}: {
  doc: Y.Doc;
  awareness: Awareness;
  editable: boolean;
  user: { name: string; color: string };
  onApplyTitle?: (title: string) => void;
}) {
  const editor = useEditor(
    {
      immediatelyRender: false,
      editable,
      extensions: [
        // History is provided by Yjs; Link + Underline ship inside StarterKit.
        StarterKit.configure({
          undoRedo: false,
          link: {
            openOnClick: false,
            autolink: true,
            HTMLAttributes: { class: "text-primary underline" },
          },
        }),
        Highlight,
        Placeholder.configure({
          placeholder:
            "Start writing… changes save locally and sync automatically.",
        }),
        Collaboration.configure({ document: doc, field: DOC_FIELD }),
        CollaborationCaret.configure({
          provider: { awareness },
          user: { name: user.name, color: user.color },
        }),
      ],
      editorProps: {
        attributes: {
          class: "min-h-[60vh] focus:outline-none",
          role: "textbox",
          "aria-multiline": "true",
          "aria-label": "Document body",
        },
      },
    },
    [doc],
  );

  const ai = useAi(editor, editable, onApplyTitle);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  return (
    <div className="space-y-3">
      {editable && editor && <Toolbar editor={editor} ai={ai} />}
      {editable && editor && <EditorBubbleMenu editor={editor} ai={ai} />}
      <div className="rounded-xl border border-border/60 bg-card px-6 py-5 shadow-sm sm:px-10 sm:py-8">
        <EditorContent editor={editor} />
      </div>
      <AiResultDialog ai={ai} />
    </div>
  );
}
