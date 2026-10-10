"""Verify parent packaging and scope without executing research sources/readers."""

from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote
import ast
import base64
import hashlib
import json
import subprocess
from datetime import datetime, timezone

ROOT = Path('docs/research/prose-qr/integrated-2026-10-10')
EXP = Path('experiments/prose-qr/integrated-2026-10-10')
BASELINE = 'a5cd4c2cbc6a285b7922e7d4c031eef750eb4222'
checks = []


def git(*args):
    return subprocess.check_output(['git', *args], text=True).strip()


def check(name, passed, detail=None):
    checks.append({'name': name, 'passed': bool(passed), 'detail': detail})


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


check('cwd', str(Path.cwd()) == '/Users/noir/Documents/aqrobat', str(Path.cwd()))
check('branch', git('branch', '--show-current') == 'codex/aqrobat-foundation')
check('remote', git('remote', 'get-url', 'origin') == 'https://github.com/ryanjosephkamp/aqrobat.git')
check('precommit-head', git('rev-parse', 'HEAD') == BASELINE, git('rev-parse', 'HEAD'))
changed = git('diff', 'HEAD', '--name-only').splitlines()
check('no-prior-tracked-file-changes', all(x.startswith((str(ROOT) + '/', str(EXP) + '/')) for x in changed), {'newRunPathsInDiff': len(changed), 'unexpected': [x for x in changed if not x.startswith((str(ROOT) + '/', str(EXP) + '/'))]})
untracked = git('ls-files', '--others', '--exclude-standard').splitlines()
allowed = (str(ROOT) + '/', str(EXP) + '/')
check('all-untracked-in-owned-run-trees', all(x.startswith(allowed) for x in untracked), len(untracked))
check('npm-private', json.loads(Path('package.json').read_text())['private'] is True)

intake = json.loads((ROOT / 'intake-hashes.json').read_text())
for p, expected in intake.items():
    actual = sha(Path(p).read_bytes())
    check('intake-preserved:' + p, actual == expected, actual)
for p in ['vendor/qrcodegen.mjs', 'LICENSE', 'NOTICE.md']:
    before = subprocess.check_output(['git', 'show', BASELINE + ':' + p])
    check('pinned-license-preserved:' + p, Path(p).read_bytes() == before, sha(before))

for p in [EXP / 'render-progress.py', EXP / 'render-handback.py', EXP / 'verify-handback.py']:
    try:
        ast.parse(p.read_text())
        check('parent-python-syntax:' + str(p), True)
    except SyntaxError as exc:
        check('parent-python-syntax:' + str(p), False, str(exc))


class Document(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.images = []
        self.scripts = 0
        self.external = []
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:
            self.ids.add(a['id'])
        if tag == 'a':
            self.links.append(a.get('href', ''))
        if tag == 'img':
            self.images.append(a.get('src', ''))
        if tag == 'script':
            self.scripts += 1
        if tag in ['script', 'link', 'iframe', 'video', 'audio', 'source', 'img']:
            for key in ['src', 'href']:
                if key in a and a[key].startswith(('http:', 'https:', '//')):
                    self.external.append(a[key])


report = ROOT / 'handback.html'
doc = Document()
doc.feed(report.read_text())
missing = []
for target in doc.links:
    if target.startswith('#'):
        if target[1:] not in doc.ids:
            missing.append(target)
    elif not target.startswith(('http:', 'https:', 'data:')):
        if not (ROOT / unquote(target)).exists():
            missing.append(target)
check('all-report-links-resolve', not missing, {'links': len(doc.links), 'missing': missing})
check('self-contained-report-no-external-assets', not doc.external, doc.external)
check('report-does-not-execute-scripts', doc.scripts == 0, doc.scripts)
originals = [
    'empirical/payload-01/native-projection/input.png',
    'empirical/payload-02/native-projection/input.png',
    'empirical/payload-04/continuous-native/input.png',
    'empirical/resources-06/cutoff-gray-228-stroke-0p75/input.png',
]
check('all-four-evidence-images-embedded', len(doc.images) == len(originals), len(doc.images))
for original, embedded in zip(originals, doc.images):
    raw = base64.b64decode(embedded.split(',', 1)[1])
    check('embedded-png-identical:' + original, raw == (ROOT / original).read_bytes(), sha(raw))

handoff = json.loads((ROOT / 'empirical/handoff.json').read_text())
actual = handoff['actual']
for key, expected in {'glyphResources': 87, 'nativeCaptures': 9, 'controlCaptures': 8, 'ordinaryCalls': 37, 'profiles': 11, 'repeats': 17, 'payloadTrials': 3, 'exactRepeats': 16, 'nativeExactRecoveries': 0, 'nativeStrictPasses': 0}.items():
    check('final-worker-count:' + key, actual.get(key) == expected, actual.get(key))
check('no-owner-candidate-claimed', handoff.get('goalAchieved') is False and handoff.get('nativeCandidateToOwner') is None)
format_receipt = json.loads((ROOT / 'format-reconciliation.json').read_text())
check('all-preserved-format-warning-bytes-exact', all(sha(Path(x['path']).read_bytes()) == x['sha256'] for x in format_receipt['warnings']), len(format_receipt['warnings']))
summary = json.loads((ROOT / 'empirical/batch-summary.json').read_text())
check('all-empirical-batches-embedded', len(summary['rows']) == 24 and all(row['id'] in report.read_text() for row in summary['rows']), len(summary['rows']))
check('independent-review-present', (ROOT / 'review/review.json').is_file() and (ROOT / 'review/REVIEW.md').is_file())

inventory = []
for base in [ROOT, EXP]:
    for p in sorted(base.rglob('*')):
        if p.is_file():
            inventory.append({'path': str(p), 'bytes': p.stat().st_size})
byte_total = sum(x['bytes'] for x in inventory)
check('artifact-byte-cap', byte_total <= 64_000_000, byte_total)
result = {
    'schema': 'aqrobat.integrated.parent-packaging-verification.v1',
    'atUtc': datetime.now(timezone.utc).isoformat(),
    'scope': 'Parent packaging, prior-file preservation and report reconciliation; independent science/custody review is separate. No new captures, readers, source renders or experiments.',
    'checks': checks,
    'passed': all(x['passed'] for x in checks),
    'count': len(checks),
    'precommitBaseline': BASELINE,
    'artifactSnapshotBytes': byte_total,
    'artifactSnapshotFiles': len(inventory),
    'snapshotExcludesFutureEditsToMutableClosingReports': True,
}
(ROOT / 'parent-verification.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'passed': result['passed'], 'checks': len(checks), 'bytes': byte_total, 'failed': [x for x in checks if not x['passed']]}, indent=2))
raise SystemExit(0 if result['passed'] else 1)
