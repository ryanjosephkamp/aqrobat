// Slate with slate-react and slate-history, default element rendering and
// default paste handling (text/plain only unless a deserializer is added).
import React from "react";
import { createRoot } from "react-dom/client";
import { createEditor, Editor, Node, Transforms } from "slate";
import { Slate, Editable, withReact, ReactEditor } from "slate-react";
import { withHistory } from "slate-history";
import { host, register } from "./common.js";

const editor = withHistory(withReact(createEditor()));
const initialValue = [{ type: "paragraph", children: [{ text: "" }] }];
function App() {
  return (
    <Slate editor={editor} initialValue={initialValue}>
      <Editable id="slate-root" spellCheck={false} />
    </Slate>
  );
}
const mount = document.createElement("div");
host.append(mount);
createRoot(mount).render(<App />);
const wait = () =>
  new Promise((resolve) => {
    const tick = () => {
      const el = document.getElementById("slate-root");
      if (el) resolve(el);
      else requestAnimationFrame(tick);
    };
    tick();
  });
const root = await wait();
window.slateEditor = editor;
register({
  kind: "slate",
  root,
  focus() {
    ReactEditor.focus(editor);
    Transforms.select(editor, Editor.start(editor, []));
  },
  modelText: () => ({
    blocks: editor.children.length,
    text: editor.children.map((n) => Node.string(n)).join("\n"),
  }),
});
