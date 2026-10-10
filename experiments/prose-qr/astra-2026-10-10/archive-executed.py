"""Preserve exact run source/evidence bytes before repository formatting."""
from pathlib import Path
import gzip
import hashlib
import json
from datetime import datetime, timezone

root = Path('docs/research/prose-qr/astra-2026-10-10')
source = Path('experiments/prose-qr/astra-2026-10-10')
archive = root / 'executed-snapshots'
archive.mkdir(exist_ok=False)
entries = []
aliases = []
for base in (root, source):
    for path in sorted(base.rglob('*')):
        if not path.is_file() or archive in path.parents:
            continue
        if path.suffix not in ('.mjs', '.py', '.swift', '.json', '.md', '.html', '.svg', '.txt'):
            continue
        data = path.read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        target = archive / (digest + '.gz')
        if not target.exists():
            target.write_bytes(gzip.compress(data, mtime=0))
        entries.append({'path': str(path), 'sha256': digest, 'bytes': len(data), 'snapshot': str(target)})
        if path.suffix in ('.html', '.svg'):
            alias = Path(str(path) + '.txt')
            assert not alias.exists()
            path.rename(alias)
            aliases.append({'originalPath': str(path), 'retainedPath': str(alias), 'sha256': digest})
result = {'at': datetime.now(timezone.utc).isoformat(), 'purpose': 'Exact pre-format executed source and evidence; rendered HTML/SVG retained byte-for-byte as .txt to prevent formatter changes to native whitespace or layout.', 'entries': entries, 'aliases': aliases}
(root / 'source-archive.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'snapshots': len(entries), 'distinctSnapshots': len(list(archive.iterdir())), 'sourceAliases': len(aliases)}))
