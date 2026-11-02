// Lexical (vanilla). Default: registerRichText with HeadingNode and QuoteNode.
// variant=plain: registerPlainText.
import { createEditor, $getRoot, $createParagraphNode } from "lexical";
import { registerRichText, HeadingNode, QuoteNode } from "@lexical/rich-text";
import { registerPlainText } from "@lexical/plain-text";
import { host, register, variant } from "./common.js";

const plain = variant === "plain";
const el = document.createElement("div");
el.contentEditable = "true";
host.append(el);
const errors = [];
const editor = createEditor({
  namespace: "paste-lab",
  nodes: plain ? [] : [HeadingNode, QuoteNode],
  theme: {},
  onError: (e) => {
    errors.push(String(e?.message || e));
    console.error(e);
  },
});
editor.setRootElement(el);
if (plain) registerPlainText(editor);
else registerRichText(editor);
editor.update(
  () => {
    const root = $getRoot();
    if (!root.getFirstChild()) root.append($createParagraphNode());
  },
  { discrete: true },
);
window.lexical = editor;
register({
  kind: plain ? "lexical-plain" : "lexical",
  root: el,
  focus() {
    el.focus();
    editor.update(() => $getRoot().selectStart(), { discrete: true });
  },
  modelText: () =>
    editor.getEditorState().read(() => {
      const root = $getRoot();
      return {
        blocks: root.getChildrenSize(),
        types: [...new Set(root.getChildren().map((n) => n.getType()))],
        text: root.getTextContent(),
        errors,
      };
    }),
});
