// GitHub-comment-like <textarea>: native plain-text paste, soft wrapping,
// height grown to fit the content after paste.
import { host, register } from "./common.js";

const ta = document.createElement("textarea");
ta.rows = 3;
ta.setAttribute("autocomplete", "off");
ta.style.cssText = "display:block;padding:8px;border:0;white-space:pre-wrap;";
host.append(ta);
const grow = () => {
  ta.style.height = "auto";
  ta.style.height = `${ta.scrollHeight}px`;
};
ta.addEventListener("input", grow);
register({
  kind: "textarea",
  root: ta,
  focus: () => ta.focus(),
  after: grow,
  modelText: () => ta.value,
});
