import ast
import base64
import csv
import datetime
import gzip
import hashlib
import json
import subprocess
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path('docs/research/prose-qr/integrated-2026-10-10/empirical')
SOURCE = Path('experiments/prose-qr/integrated-2026-10-10/empirical')
PRETTIER = ['node', 'node_modules/prettier/bin/prettier.cjs']
checks = []
processes = []


def sha(data):
    return hashlib.sha256(data).hexdigest()


def load(path):
    return json.loads(path.read_text())


def save(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')


def check(name, passed, evidence=None):
    checks.append({'name': name, 'passed': bool(passed), 'evidence': evidence})
    assert passed, name


def run(args, timeout=30):
    result = subprocess.run(args, capture_output=True, timeout=timeout)
    row = {'args': args, 'returncode': result.returncode,
           'stdout': result.stdout.decode(), 'stderr': result.stderr.decode()}
    processes.append(row)
    return row


def format_closing(paths):
    result = run(PRETTIER + ['--write'] + [str(path) for path in paths])
    assert result['returncode'] == 0


now = datetime.datetime.now(datetime.timezone.utc).isoformat()
checkout = [run(args) for args in [
    ['git', 'rev-parse', '--show-toplevel'], ['git', 'remote', '-v'],
    ['git', 'rev-parse', '--abbrev-ref', 'HEAD'], ['git', 'rev-parse', 'HEAD'],
    ['git', 'diff', '--name-only'], ['git', 'diff', '--cached', '--name-only'],
    ['git', 'status', '--short'], ['git', 'diff', '--check']]]
check('Exact cwd/remote/branch/HEAD and no tracked mutation',
      all(row['returncode'] == 0 for row in checkout)
      and checkout[0]['stdout'].strip() == '/Users/noir/Documents/aqrobat'
      and 'https://github.com/ryanjosephkamp/aqrobat.git' in checkout[1]['stdout']
      and checkout[2]['stdout'].strip() == 'codex/aqrobat-foundation'
      and checkout[3]['stdout'].strip() == 'a5cd4c2cbc6a285b7922e7d4c031eef750eb4222'
      and checkout[4]['stdout'] == checkout[5]['stdout'] == '', checkout)
encoder = Path('vendor/qrcodegen.mjs').read_bytes()
baseline = subprocess.run(['git', 'show', 'HEAD:vendor/qrcodegen.mjs'],
                          capture_output=True, timeout=15)
check('Pinned encoder and inline MIT license exact baseline',
      baseline.returncode == 0 and encoder == baseline.stdout
      and b'MIT License' in encoder, sha(encoder))
check('Package remains private', load(Path('package.json'))['private'] is True)
syntax = []
for path in sorted(SOURCE.iterdir()):
    if path.suffix == '.mjs':
        row = run(['node', '--check', str(path)])
        syntax.append({'path': str(path), **row})
        check('JavaScript syntax: ' + path.name, row['returncode'] == 0)
    elif path.suffix == '.py':
        ast.parse(path.read_text())
        syntax.append({'path': str(path), 'status': 0, 'method': 'Python ast.parse; no caches'})
        check('Python syntax: ' + path.name, True)
static_path = ROOT / 'static-checks-03.json'
save(static_path, {'atUtc': now, 'checkout': checkout,
                  'pinnedEncoderBaselineExact': True,
                  'pinnedEncoderSha256': sha(encoder),
                  'license': 'Original inline MIT license exact baseline bytes',
                  'syntax': syntax, 'newCaptures': 0, 'newReaders': 0})
format_closing([static_path])
source_format = run(PRETTIER + ['--list-different', str(SOURCE)])
(ROOT / 'format-all-source-final.stdout.txt').write_text(source_format['stdout'])
(ROOT / 'format-all-source-final.stderr.txt').write_text(source_format['stderr'])
locked = [Path(line) for line in source_format['stdout'].splitlines() if line.strip()]
old_locked = {row['path'] for row in load(ROOT / 'format-locked-02.json')['exceptions']}
check('Only16 preserved locked source formatting exceptions',
      source_format['returncode'] == 1 and {str(path) for path in locked} == old_locked
      and len(locked) == 16, [str(path) for path in locked])
save(ROOT / 'format-locked-final.json', {
    'atUtc': now, 'expectedNonzero': True, 'exceptionCount': len(locked),
    'exceptions': [{'path': str(path), 'sha256': sha(path.read_bytes()),
                    'frozenEvidence': True, 'liveBytesPreserved': True} for path in locked],
    'policy': 'No formatter writes to executed/preregistered source or evidence.'})
closing_docs = [ROOT / name for name in [
    'REPORT.html', 'RUNNING.md', 'handoff.json', 'progress.json', 'progress.html',
    'runtime-provenance.json', 'reader-accounting.json', 'final-resource-analysis.json',
    'final-stop.json', 'batch-summary.json', 'static-checks-03.json', 'format-locked-final.json']]
format_closing(closing_docs)
doc_format = run(PRETTIER + ['--list-different', str(ROOT)], timeout=45)
(ROOT / 'format-docs-final.stdout.txt').write_text(doc_format['stdout'])
(ROOT / 'format-docs-final.stderr.txt').write_text(doc_format['stderr'])
doc_locked = [Path(line) for line in doc_format['stdout'].splitlines() if line.strip()]
check('All document formatting warnings are preserved evidence, no closing report warning',
      doc_format['returncode'] == 1 and not set(doc_locked).intersection(closing_docs),
      len(doc_locked))
save(ROOT / 'format-docs-final.json', {
    'atUtc': now, 'expectedNonzero': True, 'exceptionCount': len(doc_locked),
    'exceptions': [{'path': str(path), 'sha256': sha(path.read_bytes()),
                    'frozenEvidence': True, 'liveBytesPreserved': True} for path in doc_locked],
    'policy': 'Retain executed/preregistered JSON and earlier verification receipts byte-for-byte. Closing documents checked separately.'})
format_closing([ROOT / 'format-docs-final.json'])
fresh_format = run(PRETTIER + ['--check'] + [str(path) for path in closing_docs]
                   + [str(ROOT / 'format-docs-final.json')])
(ROOT / 'format-closing-final.stdout.txt').write_text(fresh_format['stdout'])
(ROOT / 'format-closing-final.stderr.txt').write_text(fresh_format['stderr'])
check('Fresh closing documents format clean', fresh_format['returncode'] == 0)

custody = run(['node', str(SOURCE / 'custody.mjs')])
(ROOT / 'custody-final.stdout.txt').write_text(custody['stdout'])
(ROOT / 'custody-final.stderr.txt').write_text(custody['stderr'])
check('Source snapshots and original strict exact-byte check generated', custody['returncode'] == 0)
manifest = load(ROOT / 'source-custody/manifest.json')
for row in manifest['sourceSnapshots']:
    data = Path(row['path']).read_bytes()
    snapshot = Path(row['gzipSnapshot']).read_bytes()
    check('Exact live source and lossless snapshot: ' + row['path'],
          sha(data) == row['sha256'] and gzip.decompress(snapshot) == data
          and sha(snapshot) == row['gzipSha256'])
check('Strict gate original exact bytes retained', manifest['strictGateExactBytes'])

v = load(ROOT / 'verification-04.json')
summary = load(ROOT / 'batch-summary.json')
handoff = load(ROOT / 'handoff.json')
accounting = load(ROOT / 'reader-accounting.json')
check('688 retained evidence checks pass', v['passed'] and len(v['checks']) == 688
      and all(row['passed'] for row in v['checks']))
check('Final actual counts exact', v['totals']['glyphResources'] == 87
      and v['totals']['nativeCaptures'] == 9 and v['totals']['controlCaptures'] == 8
      and v['totals']['ordinaryCalls'] == 37 and v['totals']['profiles'] == 11
      and v['totals']['payloadTrials'] == 3 and v['totals']['repeats'] == 17
      and v['totals']['exactRepeats'] == 16, v['totals'])
check('No native strict or payload acceptance', v['totals']['nativeStrictPasses'] == 0
      and v['totals']['nativeExactRecoveries'] == 0 and handoff['goalAchieved'] is False
      and handoff['nativeCandidateToOwner'] is None)
check('Actor-inclusive conservative reader accounting75',
      accounting['primaryOrdinaryApiCalls'] == 37
      and accounting['instrumentedPassiveApiCalls'] == 11
      and accounting['additionalStockParityApiCalls'] == 0
      and accounting['nestedMatrixDecoderInvocationsInsidePassive'] == 27
      and accounting['conservativeInclusiveSum'] == 75
      and summary['accounting']['conservativeInclusiveSum'] == 75)
check('107resource slots:87captured19unattempted1failedsetup',
      sum(row['planned']['resources'] for row in summary['rows'] if row['kind'] == 'resources') == 107
      and v['totals']['unattemptedResources'] == 19
      and v['totals']['failedResourceSetupBeforeCapture'] == 1)
check('23fullcapture and60ordinary-slot denominators preserved',
      v['totals']['unattemptedFullCaptures'] + 17 == 23
      and v['totals']['unattemptedReaderSlots'] + 37 == 60)
for row in summary['rows']:
    check('Batch result custody: ' + row['id'],
          sha(Path(row['resultsPath']).read_bytes()) == row['resultsSha256'])
    if row.get('preregistrationPath'):
        check('Batch preregistration custody: ' + row['id'],
              sha(Path(row['preregistrationPath']).read_bytes()) == row['preregistrationSha256'])
with (ROOT / 'batch-summary.csv').open(newline='') as handle:
    csv_rows = list(csv.DictReader(handle))
check('All24batches/setup failures present in JSON and CSV',
      len(summary['rows']) == len(csv_rows) == 24
      and [row['id'] for row in summary['rows']] == [row['id'] for row in csv_rows])
check('Summary builder exact source hash', summary['builderSha256'] == sha((SOURCE / 'summarize-v4.mjs').read_bytes()))
final_resources = load(ROOT / 'resources-06/results.json')
check('Final failed readable source and3unattempted remain',
      final_resources['captures'] == 2 and len(final_resources['unattempted']) == 3
      and final_resources['stop']['current'] == 'cutoff-gray-228-stroke-0p75')
review = load(ROOT / 'resources-06/cutoff-gray-228-stroke-0p75/visual-review.json')
check('Readability rejected rather than hidden', review['readable'] is False
      and load(ROOT / 'final-stop.json')['finalNativeTrialSelected'] is False)
runtime = load(ROOT / 'runtime-provenance.json')
for font in runtime['fonts']:
    check('Installed font file hash: ' + font['path'], sha(Path(font['path']).read_bytes()) == font['fileSha256'])
check('All21static native font names covered, Skia unresolved',
      len(runtime['fontVersionCoverage']['exactNamedFaces']) == 21
      and runtime['fontVersionCoverage']['variableDescriptorUnresolved'] == ['Skia-Regular_wght30000_wdth14000'])
check('Metadata builder exact source hash', runtime['metadataBuilderSha256'] == sha((SOURCE / 'finalize-metadata.py').read_bytes()))


class ReportParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.images = []
        self.originals = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'a':
            target = attrs.get('href', '')
            self.links.append(target)
            if target.endswith('/input.png'):
                self.originals.append(target)
        if tag == 'img':
            self.images.append(attrs['src'])


parser = ReportParser()
parser.feed((ROOT / 'REPORT.html').read_text())
check('Report has matching illustrated originals', len(parser.images) == len(parser.originals) and len(parser.images) >= 8)
for image, original in zip(parser.images, parser.originals):
    check('Report embeds exact PNG: ' + original,
          image.startswith('data:image/png;base64,')
          and base64.b64decode(image.split(',', 1)[1]) == (ROOT / original).read_bytes())
for target in parser.links:
    if target and not target.startswith(('#', 'http:', 'https:')):
        check('Report local link exists: ' + target, (ROOT / target).is_file())
for row in locked:
    expected = next(item['sha256'] for item in load(ROOT / 'format-locked-final.json')['exceptions'] if item['path'] == str(row))
    check('Locked source bytes unchanged after checks: ' + str(row), sha(row.read_bytes()) == expected)
for row in doc_locked:
    expected = next(item['sha256'] for item in load(ROOT / 'format-docs-final.json')['exceptions'] if item['path'] == str(row))
    check('Locked document bytes unchanged after checks: ' + str(row), sha(row.read_bytes()) == expected)
check('All fresh owned browser contexts closed in evidence',
      all(load(path)['ownedBrowserClosed'] for path in ROOT.glob('resources-*/results.json'))
      and all(load(path)['browserClosed'] for path in ROOT.glob('*/run-results.json')))

handoff['checks'].update(finalClosingChecks=len(checks), finalClosingPassed=True,
                         syntax=len(syntax), sourceFormattingExceptions=len(locked),
                         documentFormattingExceptions=len(doc_locked))
handoff['paths']['running'] = str(ROOT / 'RUNNING.md')
handoff['paths']['formatSourceExceptions'] = str(ROOT / 'format-locked-final.json')
handoff['paths']['formatEvidenceExceptions'] = str(ROOT / 'format-docs-final.json')
handoff['allocation']['remaining']['artifactBytes'] = None
final_path = ROOT / 'final-checks.json'
result = {'schema': 'aqrobat.integrated.empirical-final-checks.v1', 'atUtc': now,
          'checkerSha256': sha((SOURCE / 'closing-checks.py').read_bytes()),
          'passed': True, 'checkCount': len(checks), 'checks': checks,
          'retainedMainEvidenceChecks': 688, 'sourceFiles': len(syntax),
          'lockedSourceFormattingExceptions': len(locked),
          'lockedEvidenceFormattingExceptions': len(doc_locked),
          'newCaptures': 0, 'newOrdinaryReaders': 0, 'newPassiveProfiles': 0,
          'newAdaptiveBinarizerCalls': 0, 'processes': processes,
          'artifactBytesAfterClosing': 0, 'closingHashes': {}}
previous = None
for attempt in range(6):
    save(ROOT / 'handoff.json', handoff)
    save(final_path, result)
    format_closing([ROOT / 'handoff.json', final_path])
    total_bytes = sum(path.stat().st_size for tree in [ROOT, SOURCE]
                      for path in tree.rglob('*') if path.is_file())
    assert total_bytes < 48000000
    if total_bytes == previous:
        break
    previous = total_bytes
    handoff['checks']['finalArtifactBytes'] = total_bytes
    handoff['allocation']['remaining']['artifactBytes'] = 48000000 - total_bytes
    result['artifactBytesAfterClosing'] = total_bytes
    result['closingHashes'] = {str(path): sha(path.read_bytes()) for path in [
        ROOT / 'REPORT.html', ROOT / 'handoff.json', ROOT / 'batch-summary.json',
        ROOT / 'runtime-provenance.json', ROOT / 'reader-accounting.json',
        ROOT / 'verification-04.json', ROOT / 'source-custody/manifest.json']}
else:
    raise AssertionError('Closing byte reconciliation did not stabilize')
# Include the final handback hash after the last formatting write, without changing field length.
result['closingHashes'][str(ROOT / 'handoff.json')] = sha((ROOT / 'handoff.json').read_bytes())
save(final_path, result)
format_closing([final_path])
final_bytes = sum(path.stat().st_size for tree in [ROOT, SOURCE]
                  for path in tree.rglob('*') if path.is_file())
assert final_bytes == result['artifactBytesAfterClosing']
print(json.dumps({'passed': True, 'closingChecks': len(checks),
                  'mainEvidenceChecks': 688, 'syntax': len(syntax),
                  'sourceExceptions': len(locked), 'evidenceExceptions': len(doc_locked),
                  'artifactBytes': final_bytes, 'newCaptures': 0, 'newReaders': 0}))
