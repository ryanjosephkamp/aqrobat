// Tiptap with StarterKit. variant=code pastes into a code block.
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { host, register, variant } from "./common.js";

const editor = new Editor({
  element: host,
  extensions: [StarterKit],
  content: variant === "code" ? "<pre><code></code></pre>" : "<p></p>",
});
window.tiptap = editor;
register({
  kind: "tiptap",
  root: editor.view.dom,
  focus() {
    editor.commands.focus("start");
  },
  modelText: () => {
    const doc = editor.state.doc;
    return {
      blocks: doc.childCount,
      types: [...new Set(doc.content.content.map((n) => n.type.name))],
      text: doc.textBetween(0, doc.content.size, "\n", "\n"),
    };
  },
});
