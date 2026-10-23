from pathlib import Path
import hashlib,json
s=Path('experiments/prose-qr/integrated-2026-10-10/empirical');d=Path('docs/research/prose-qr/integrated-2026-10-10/empirical')
items={'common.mjs':'experiments/prose-qr/control-panel-2026-10-10/common.mjs','metrics.mjs':'experiments/prose-qr/control-panel-2026-10-10/metrics.mjs','passive.mjs':'experiments/prose-qr/control-panel-2026-10-10/passive.mjs','ordinary.py':'experiments/prose-qr/control-panel-2026-10-10/ordinary.py','diagnostic.mjs':'experiments/prose-qr/glyph-geometry/diagnostic.mjs','holes.py':'experiments/prose-qr/outline-counter-appendages/holes.py'}
r={}
for name,src in items.items():
 b=Path(src).read_bytes();(s/name).write_bytes(b);r[src]={'sha256':hashlib.sha256(b).hexdigest(),'copy':str(s/name),'unchanged':True}
(d/'import-provenance.json').write_text(json.dumps(r,indent=2)+'\n')
