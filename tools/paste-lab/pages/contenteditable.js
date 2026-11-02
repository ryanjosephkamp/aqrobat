// Bare contenteditable div: Chrome's built-in paste handling, no editor code.
import { host, register } from "./common.js";

const el = document.createElement("div");
el.contentEditable = "true";
host.append(el);
register({
  kind: "contenteditable",
  root: el,
  focus: () => el.focus(),
});
