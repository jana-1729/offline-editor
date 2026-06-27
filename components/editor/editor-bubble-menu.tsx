"use client";

import { BubbleMenu } from "@tiptap/react/menus";
import { type Editor, useEditorState } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Highlighter,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AiController } from "@/hooks/use-ai";

function BubbleButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md transition-colors hover:bg-accent",
        active && "bg-accent text-accent-foreground",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Floating formatting toolbar that appears over the current text selection,
 * including a one-tap AI "Improve" action.
 */
export function EditorBubbleMenu({
  editor,
  ai,
}: {
  editor: Editor;
  ai: AiController;
}) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      link: e.isActive("link"),
      highlight: e.isActive("highlight"),
    }),
  });

  function setLink() {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <BubbleMenu
      editor={editor}
      className="flex items-center gap-0.5 rounded-xl border border-border/70 bg-popover/95 p-1 shadow-xl backdrop-blur"
    >
      <BubbleButton label="Bold" active={s.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="size-4" />
      </BubbleButton>
      <BubbleButton label="Italic" active={s.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="size-4" />
      </BubbleButton>
      <BubbleButton label="Underline" active={s.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon className="size-4" />
      </BubbleButton>
      <BubbleButton label="Strikethrough" active={s.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="size-4" />
      </BubbleButton>
      <BubbleButton label="Highlight" active={s.highlight} onClick={() => editor.chain().focus().toggleHighlight().run()}>
        <Highlighter className="size-4" />
      </BubbleButton>
      <BubbleButton label="Inline code" active={s.code} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code className="size-4" />
      </BubbleButton>
      <BubbleButton label="Link" active={s.link} onClick={setLink}>
        <LinkIcon className="size-4" />
      </BubbleButton>
      <div className="mx-0.5 h-5 w-px bg-border" />
      <button
        type="button"
        aria-label="Improve with AI"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => ai.run("improve")}
        className="flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
      >
        <Sparkles className="size-4" /> AI
      </button>
    </BubbleMenu>
  );
}
