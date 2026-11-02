// Quill 2 with the Snow theme and its default clipboard module.
// variant=code formats the first line as a code block before the paste.
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { host, register, variant } from "./common.js";

const mount = document.createElement("div");
host.append(mount);
const quill = new Quill(mount, { theme: "snow" });
if (variant === "code") quill.formatLine(0, 1, "code-block", true);
window.quill = quill;
register({
  kind: "quill",
  root: quill.root,
  focus() {
    quill.focus();
    quill.setSelection(0, 0);
  },
  modelText: () => ({
    ops: quill.getContents().ops.length,
    formats: [
      ...new Set(
        quill.getContents().ops.flatMap((o) => Object.keys(o.attributes || {})),
      ),
    ],
    text: quill.getText(),
  }),
});
