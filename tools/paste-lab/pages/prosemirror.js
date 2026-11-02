// ProseMirror with prosemirror-example-setup and the basic schema plus lists.
// variant=code starts the document with a code_block and pastes into it.
import { EditorState, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema } from "prosemirror-model";
import { schema as basic } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";
import { exampleSetup } from "prosemirror-example-setup";
import "prosemirror-view/style/prosemirror.css";
import "prosemirror-menu/style/menu.css";
import "prosemirror-example-setup/style/style.css";
import { host, register, variant } from "./common.js";

const schema = new Schema({
  nodes: addListNodes(basic.spec.nodes, "paragraph block*", "block"),
  marks: basic.spec.marks,
});
const first =
  variant === "code" ? schema.node("code_block") : schema.node("paragraph");
const view = new EditorView(host, {
  state: EditorState.create({
    doc: schema.node("doc", null, [first]),
    plugins: exampleSetup({ schema }),
  }),
});
window.pmView = view;
register({
  kind: "prosemirror",
  root: view.dom,
  focus() {
    view.focus();
    view.dispatch(
      view.state.tr.setSelection(TextSelection.create(view.state.doc, 1)),
    );
  },
  modelText: () => {
    const doc = view.state.doc;
    return {
      blocks: doc.childCount,
      types: [...new Set(doc.content.content.map((n) => n.type.name))],
      text: doc.textBetween(0, doc.content.size, "\n", "\n"),
    };
  },
});
