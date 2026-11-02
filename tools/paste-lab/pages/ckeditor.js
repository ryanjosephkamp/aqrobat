// CKEditor 5 classic editor (GPL license key) with a typical article plugin
// set. variant=code adds CodeBlock and pastes into a plain-text code block.
import {
  ClassicEditor,
  Essentials,
  Autoformat,
  Paragraph,
  Heading,
  Bold,
  Italic,
  Link,
  List,
  BlockQuote,
  Table,
  TableToolbar,
  PasteFromOffice,
  CodeBlock,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";
import { host, register, variant } from "./common.js";

const code = variant === "code";
const mount = document.createElement("div");
host.append(mount);
const plugins = [
  Essentials,
  Autoformat,
  Paragraph,
  Heading,
  Bold,
  Italic,
  Link,
  List,
  BlockQuote,
  Table,
  TableToolbar,
  PasteFromOffice,
];
if (code) plugins.push(CodeBlock);
const editor = await ClassicEditor.create(mount, {
  licenseKey: "GPL",
  plugins,
  toolbar: [
    "heading",
    "|",
    "bold",
    "italic",
    "link",
    "bulletedList",
    "numberedList",
    "blockQuote",
    "insertTable",
    ...(code ? ["codeBlock"] : []),
  ],
  ...(code
    ? {
        codeBlock: {
          languages: [{ language: "plaintext", label: "Plain text" }],
        },
      }
    : {}),
});
if (code) editor.execute("codeBlock", { language: "plaintext" });
window.ckeditor = editor;
const root = editor.ui.getEditableElement();
register({
  kind: "ckeditor",
  root,
  markRoot() {
    editor.editing.view.change((w) => {
      const viewRoot = editor.editing.view.document.getRoot();
      w.setAttribute("data-lab-root", "", viewRoot);
      w.setAttribute("spellcheck", "false", viewRoot);
    });
  },
  focus() {
    editor.editing.view.focus();
    editor.model.change((w) =>
      w.setSelection(editor.model.document.getRoot().getChild(0), 0),
    );
  },
  modelText: () => {
    const r = editor.model.document.getRoot();
    return {
      blocks: r.childCount,
      types: [...new Set([...r.getChildren()].map((n) => n.name))],
      data: editor.getData().slice(0, 400),
    };
  },
});
