"use client";

import { type Editor, useEditorState } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Highlighter,
  Undo2,
  Redo2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AiController } from "@/hooks/use-ai";

function ToolbarButton({
  active,
  onClick,
  label,
  disabled,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "size-8 transition-colors",
        active && "bg-accent text-accent-foreground",
      )}
    >
      {children}
    </Button>
  );
}

export function Toolbar({ editor, ai }: { editor: Editor; ai: AiController }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      highlight: e.isActive("highlight"),
      link: e.isActive("link"),
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
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
    <div className="sticky top-16 z-20 flex flex-wrap items-center gap-0.5 rounded-xl border border-border/70 bg-background/80 p-1 shadow-sm backdrop-blur">
      <ToolbarButton label="Bold" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Italic" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Underline" active={state.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Strikethrough" active={state.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Highlight" active={state.highlight} onClick={() => editor.chain().focus().toggleHighlight().run()}>
        <Highlighter className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Inline code" active={state.code} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Link" active={state.link} onClick={setLink}>
        <LinkIcon className="size-4" />
      </ToolbarButton>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ToolbarButton label="Heading 1" active={state.h1} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Heading 2" active={state.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Bullet list" active={state.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Numbered list" active={state.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Quote" active={state.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="size-4" />
      </ToolbarButton>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ToolbarButton label="Undo" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Redo" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 className="size-4" />
      </ToolbarButton>

      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-primary">
              <Sparkles className="size-4" /> AI
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => ai.run("summarize")}>
              <Sparkles className="size-4" /> Summarize document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => ai.run("improve")}>
              <Sparkles className="size-4" /> Improve selection
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => ai.run("suggestTitle")}>
              <Sparkles className="size-4" /> Suggest a title
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
