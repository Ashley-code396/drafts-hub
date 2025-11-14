"use client";
import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";

// Simple custom TipTap nodes for video and audio blocks
// Block-level, atom nodes so they behave as single units with native controls
import { Node, mergeAttributes } from "@tiptap/core";

const Video = Node.create({
  name: "video",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
      poster: { default: null },
      title: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "video" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "video",
      mergeAttributes({ controls: true }, HTMLAttributes),
    ];
  },
});

const Audio = Node.create({
  name: "audio",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
      title: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "audio" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "audio",
      mergeAttributes({ controls: true }, HTMLAttributes),
    ];
  },
});

// Extend Image with width and align attributes
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: 480 },
      align: { default: "left" as "left" | "center" | "right" },
    } as any;
  },
  renderHTML({ HTMLAttributes }) {
    const attrs = { ...HTMLAttributes } as any;
    const width = attrs.width ?? 480;
    const align = attrs.align ?? "left";
    let style = (attrs.style as string) || "";
    style += `;width:${typeof width === "number" ? width + "px" : width}`;
    if (align === "center") {
      style += ";display:block;margin-left:auto;margin-right:auto";
    } else if (align === "right") {
      style += ";display:block;margin-left:auto";
    }
    attrs.style = style;
    return ["img", attrs];
  },
});

function Toolbar({ editor, onBrowse }: { editor: any; onBrowse: () => void }) {
  const [, setRefresh] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const rerender = () => setRefresh((x) => x + 1);
    editor.on("selectionUpdate", rerender);
    editor.on("transaction", rerender);
    editor.on("update", rerender);
    return () => {
      editor.off("selectionUpdate", rerender);
      editor.off("transaction", rerender);
      editor.off("update", rerender);
    };
  }, [editor]);
  if (!editor) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-black/10 px-2 py-2 text-sm dark:border-white/10">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        aria-pressed={editor.isActive("bold")}
        className={`rounded-md px-2 py-1 ${editor.isActive("bold") ? "bg-zinc-200 dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-900"}`}
      >
        Bold
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        aria-pressed={editor.isActive("italic")}
        className={`rounded-md px-2 py-1 ${editor.isActive("italic") ? "bg-zinc-200 dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-900"}`}
      >
        Italic
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        aria-pressed={editor.isActive("strike")}
        className={`rounded-md px-2 py-1 ${editor.isActive("strike") ? "bg-zinc-200 dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-900"}`}
      >
        Strike
      </button>
      <div className="mx-2 h-5 w-px bg-black/10 dark:bg-white/10" />
      <button
        onClick={() => editor.chain().focus().setParagraph().run()}
        aria-pressed={editor.isActive("paragraph")}
        className={`rounded-md px-2 py-1 ${editor.isActive("paragraph") ? "bg-zinc-200 dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-900"}`}
      >
        Normal
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        aria-pressed={editor.isActive("heading", { level: 2 })}
        className={`rounded-md px-2 py-1 ${editor.isActive("heading", { level: 2 }) ? "bg-zinc-200 dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-900"}`}
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        aria-pressed={editor.isActive("heading", { level: 3 })}
        className={`rounded-md px-2 py-1 ${editor.isActive("heading", { level: 3 }) ? "bg-zinc-200 dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-900"}`}
      >
        H3
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        aria-pressed={editor.isActive("bulletList")}
        className={`rounded-md px-2 py-1 ${editor.isActive("bulletList") ? "bg-zinc-200 dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-900"}`}
      >
        Bullets
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        aria-pressed={editor.isActive("orderedList")}
        className={`rounded-md px-2 py-1 ${editor.isActive("orderedList") ? "bg-zinc-200 dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-900"}`}
      >
        1. List
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        aria-pressed={editor.isActive("codeBlock")}
        className={`rounded-md px-2 py-1 ${editor.isActive("codeBlock") ? "bg-zinc-200 dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-900"}`}
      >
        Code
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        aria-pressed={editor.isActive("underline")}
        className={`rounded-md px-2 py-1 ${editor.isActive("underline") ? "bg-zinc-200 dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-900"}`}
        aria-label="Underline"
      >
        U
      </button>
      <div className="mx-2 h-5 w-px bg-black/10 dark:bg-white/10" />
      <button
        onClick={onBrowse}
        className="rounded-md px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-900"
      >
        Insert media
      </button>
      <button
        onClick={() => editor.chain().focus().undo().run()}
        className="ml-auto rounded-md px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-900"
      >
        Undo
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        className="rounded-md px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-900"
      >
        Redo
      </button>
    </div>
  );
}

function AIBubble({ editor }: { editor: any }) {
  const [mode, setMode] = useState<"idle" | "loading" | "preview">("idle");
  const [original, setOriginal] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = async (action: "clarity" | "grammar" | "tone", tone?: string) => {
    const { from, to } = editor.state.selection;
    const sel = editor.state.doc.textBetween(from, to, " ");
    if (!sel) return;
    setOriginal(sel);
    setError(null);
    setMode("loading");
    try {
      const res = await fetch("/api/ai/transform", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: sel, action, tone }),
      });
      if (!res.ok) throw new Error("AI request failed");
      const data = await res.json();
      setResult(data.transformedText || sel);
      setMode("preview");
      editor.commands.focus();
    } catch {
      setError("Couldn’t transform text. Try again.");
      setMode("idle");
    }
  };

  const apply = () => {
    const { from, to } = editor.state.selection;
    editor.chain().focus().insertContentAt({ from, to }, result).run();
    setMode("idle");
    setResult("");
  };

  const cancel = () => {
    setMode("idle");
    setResult("");
  };

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor }) => {
        const { from, to } = editor.state.selection;
        // Keep menu visible while loading/preview so users see feedback
        return mode !== "idle" || from !== to;
      }}
      options={{ placement: 'bottom', offset: 8 }}
      className="rounded-md border border-black/10 bg-white p-2 shadow-lg dark:border-white/10 dark:bg-zinc-900"
    >
      {mode === "preview" ? (
        <div className="w-80 text-sm">
          <div className="mb-2 grid grid-cols-2 gap-2">
            <div className="rounded-md border border-black/10 p-2 text-zinc-600 dark:border-white/10">{original}</div>
            <div className="rounded-md border border-black/10 p-2 font-medium dark:border-white/10">{result}</div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={cancel} className="rounded-md px-2 py-1 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800">Revert</button>
            <button onClick={apply} className="rounded-md bg-black px-2 py-1 text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">Apply</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm">
          <button disabled={mode === "loading"} onClick={() => run("clarity")} className="rounded-md px-2 py-1 hover:bg-zinc-100 disabled:opacity-60 dark:hover:bg-zinc-800">Improve clarity</button>
          <button disabled={mode === "loading"} onClick={() => run("grammar")} className="rounded-md px-2 py-1 hover:bg-zinc-100 disabled:opacity-60 dark:hover:bg-zinc-800">Fix grammar</button>
          <button disabled={mode === "loading"} onClick={() => run("tone", "friendly")} className="rounded-md px-2 py-1 hover:bg-zinc-100 disabled:opacity-60 dark:hover:bg-zinc-800">Rewrite tone</button>
          {mode === "loading" && <span className="ml-2 animate-pulse text-xs text-zinc-500">Thinking…</span>}
          {error && mode === "idle" && <span className="ml-2 text-xs text-red-500">{error}</span>}
        </div>
      )}
    </BubbleMenu>
  );
}

function ImageControls({ editor }: { editor: any }) {
  const [tempWidth, setTempWidth] = useState<number | null>(null);
  // Only show for image selection
  return (
    <BubbleMenu
      editor={editor}
      shouldShow={() => editor.isActive('image')}
      options={{ placement: 'top', offset: 8 }}
      className="rounded-md border border-black/10 bg-white p-2 shadow-lg text-sm dark:border-white/10 dark:bg-zinc-900"
    >
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">Image</span>
        <div className="mx-2 h-5 w-px bg-black/10 dark:bg-white/10" />
        <button onClick={() => editor.chain().focus().updateAttributes('image', { align: 'left' }).run()} className="rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Align left">Left</button>
        <button onClick={() => editor.chain().focus().updateAttributes('image', { align: 'center' }).run()} className="rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Align center">Center</button>
        <button onClick={() => editor.chain().focus().updateAttributes('image', { align: 'right' }).run()} className="rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Align right">Right</button>
        <div className="mx-2 h-5 w-px bg-black/10 dark:bg-white/10" />
        {[320, 480, 720].map(w => (
          <button key={w} onClick={() => editor.chain().focus().updateAttributes('image', { width: w }).run()} className="rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800">{w}px</button>
        ))}
        <button onClick={() => editor.chain().focus().updateAttributes('image', { width: '100%' }).run()} className="rounded px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800">Fit</button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="range"
          min={160}
          max={1024}
          step={10}
          value={tempWidth ?? 480}
          onChange={(e) => setTempWidth(parseInt(e.target.value))}
          onMouseUp={() => { if (tempWidth) editor.chain().focus().updateAttributes('image', { width: tempWidth }).run(); }}
          aria-label="Image width"
        />
        <span className="w-12 text-right text-xs text-zinc-600">{tempWidth ?? 480}px</span>
      </div>
    </BubbleMenu>
  );
}

export function EditorCanvas({
  registerSnapshotProvider,
}: {
  registerSnapshotProvider?: (fn: () => { text: string; doc: any; media: { type: string; src: string; title?: string }[] }) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editor = useEditor({
    extensions: [
      StarterKit,
      CustomImage,
      Video,
      Audio,
      Underline,
      Placeholder.configure({
        placeholder: "Write your idea, script, or caption…",
        emptyEditorClass: "is-editor-empty text-zinc-500",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-zinc max-w-none min-h-[260px] focus:outline-none dark:prose-invert",
      },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && !event.shiftKey) {
          if (event.key.toLowerCase() === "b") {
            editor?.chain().focus().toggleBold().run();
            return true;
          }
          if (event.key.toLowerCase() === "i") {
            editor?.chain().focus().toggleItalic().run();
            return true;
          }
          if (event.key.toLowerCase() === "u") {
            editor?.chain().focus().toggleUnderline().run();
            return true;
          }
        }
        return false;
      },
    },
    immediatelyRender: false,
  });

  // Expose a snapshot provider so the parent can capture versions on commit
  useEffect(() => {
    if (!editor || !registerSnapshotProvider) return;
    const provider = () => {
      const doc = editor.getJSON();
      // Collect media nodes
      const media: { type: string; src: string; title?: string }[] = [];
      const walk = (node: any) => {
        if (!node) return;
        if (node.type === "image" && node.attrs?.src) {
          media.push({ type: "image", src: node.attrs.src, title: node.attrs.alt });
        }
        if (node.type === "video" && node.attrs?.src) {
          media.push({ type: "video", src: node.attrs.src, title: node.attrs.title });
        }
        if (node.type === "audio" && node.attrs?.src) {
          media.push({ type: "audio", src: node.attrs.src, title: node.attrs.title });
        }
        node.content?.forEach(walk);
      };
      walk(doc);
      return { text: editor.getText(), doc, media };
    };
    registerSnapshotProvider(provider);
  }, [editor, registerSnapshotProvider]);

  const onFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      if (file.type.startsWith("image")) {
        editor?.chain().focus().insertContent({ type: "image", attrs: { src: url, alt: file.name, width: 480, align: 'left' } }).run();
      } else if (file.type.startsWith("video")) {
        editor?.chain().focus().insertContent({ type: "video", attrs: { src: url, title: file.name } }).run();
      } else if (file.type.startsWith("audio")) {
        editor?.chain().focus().insertContent({ type: "audio", attrs: { src: url, title: file.name } }).run();
      } else {
        // Fallback: insert as a link to the object URL
        editor?.chain().focus().insertContent(`<a href="${url}" target="_blank">${file.name}</a>`).run();
      }
    });
  }, [editor]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFiles(e.dataTransfer.files);
  }, [onFiles]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.files;
    if (items && items.length) onFiles(items);
  }, [onFiles]);

  const inputAccept = useMemo(() => "image/*,video/*,audio/*", []);

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Editor</div>
      <div
        className="rounded-lg border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onPaste={handlePaste}
      >
        <Toolbar editor={editor} onBrowse={() => fileInputRef.current?.click()} />
        <div className="min-h-[260px] px-4 py-3 relative">
          {editor && (
            <AIBubble editor={editor} />
          )}
          {editor && (
            <ImageControls editor={editor} />
          )}
          <EditorContent editor={editor} />
        </div>
        <div className="border-t border-black/10 px-4 py-3 text-center text-sm text-zinc-500 dark:border-white/10">
          Drag & drop images, video, or audio here, or
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="ml-1 font-medium text-zinc-800 underline dark:text-zinc-200"
          >
            browse
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={inputAccept}
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {["Improve clarity", "Fix grammar", "Rewrite in friendly tone", "Generate image for this idea"].map((label) => (
          <button
            key={label}
            className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
