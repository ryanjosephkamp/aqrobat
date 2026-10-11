const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);

// Merge only adjacent equal visible styles. Letter order and row breaks are exact.
export function coalescedRuns(row) {
  const out = [];
  for (const c of row) {
    const last = out.at(-1);
    if (last && last.color === c.color && last.weight === c.weight) last.text += c.text;
    else out.push({text:c.text,color:c.color,weight:c.weight});
  }
  return out;
}

export function compactClipboardHtml(layout, {table = false} = {}) {
  const s=layout.spec, points=s.fontSize*0.75, lead=layout.leading*0.75;
  const body=layout.runs.map((row)=>coalescedRuns(row).map((r)=>`<span style="color:rgb(${r.color},${r.color},${r.color});font-weight:${r.weight}">${esc(r.text)}</span>`).join("")).join("<br>");
  const paragraph=`<p style="font-family:'${s.font}';font-size:${points}pt;line-height:${lead}pt;mso-line-height-rule:exactly;text-align:justify;text-align-last:justify;margin:0;width:${s.field*0.75}pt;font-kerning:none;font-variant-ligatures:none">${body}</p>`;
  const content=table?`<table border="0" cellpadding="0" cellspacing="0" width="${s.field}" style="border-collapse:collapse;table-layout:fixed;width:${s.field*0.75}pt"><tbody><tr><td width="${s.field}" style="width:${s.field*0.75}pt;padding:0">${paragraph}</td></tr></tbody></table>`:paragraph;
  return `<!doctype html><html><head><meta charset="utf-8"></head><body>${content}</body></html>`;
}
