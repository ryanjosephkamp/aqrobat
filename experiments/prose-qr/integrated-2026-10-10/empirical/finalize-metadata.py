import datetime
import hashlib
import json
from pathlib import Path

from fontTools.ttLib import TTCollection, TTFont

ROOT = Path('docs/research/prose-qr/integrated-2026-10-10/empirical')
SOURCE = Path('experiments/prose-qr/integrated-2026-10-10/empirical')


def read(path):
    return json.loads(path.read_text())


def save(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


now = datetime.datetime.now(datetime.timezone.utc).isoformat()
runtime = read(ROOT / 'runtime-provenance.json')
actual = set()
for path in sorted(ROOT.glob('resources-*/results.json')):
    for row in read(path)['rows']:
        actual.update(font['postScriptName'] for font in row['nativeFonts'])
for path in sorted(ROOT.glob('*/preregistration.json')):
    if path.parent.name.startswith(('layout-', 'payload-')):
        for spec in read(path)['specs']:
            actual.update(spec.get('expectedFonts', []))
paths = {item['path'] for item in runtime['fonts']}
paths.update([
    '/System/Library/Fonts/Avenir Next.ttc',
    '/System/Library/Fonts/Supplemental/Arial Black.ttf',
    '/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf',
    '/System/Library/Fonts/Supplemental/AmericanTypewriter.ttc',
    '/System/Library/Fonts/Supplemental/ChalkboardSE.ttc',
    '/System/Library/Fonts/Geneva.ttf',
    '/System/Library/Fonts/Supplemental/Impact.ttf',
    '/System/Library/Fonts/Supplemental/Phosphate.ttc',
    '/System/Library/Fonts/Supplemental/Verdana Bold.ttf',
])
fonts = []
for item in sorted(paths):
    path = Path(item)
    collection = TTCollection(item, lazy=True) if path.suffix == '.ttc' else None
    faces = collection.fonts if collection else [TTFont(item, lazy=True)]
    data = []
    for face in faces:
        entry = {}
        for key, name_id in [('postScriptNames', 6), ('familyNames', 1),
                             ('fullNames', 4), ('versions', 5), ('uniqueIDs', 3)]:
            entry[key] = sorted({record.toUnicode() for record in face['name'].names
                                 if record.nameID == name_id})
        data.append(entry)
    fonts.append({'path': item, 'fileSha256': digest(path),
                  'bytes': path.stat().st_size, 'faces': data})
    if collection:
        collection.close()
    else:
        faces[0].close()
runtime['fonts'] = fonts
runtime['atUtc'] = now
runtime['observedNativePostScriptNames'] = sorted(actual)
runtime['fontVersionCoverage'] = {
    'exactNamedFaces': sorted(actual.intersection({name for font in fonts
        for face in font['faces'] for name in face['postScriptNames']})),
    'variableDescriptorUnresolved': ['Skia-Regular_wght30000_wdth14000'],
    'note': 'All other actual captured PostScript names have exact installed name-table version/hash mapping. Skia maps only to installed variable-family file; descriptor mismatch remains unresolved.'
}
assert set(runtime['fontVersionCoverage']['exactNamedFaces']) == actual - {'Skia-Regular_wght30000_wdth14000'}
runtime['metadataBuilderSha256'] = digest(SOURCE / 'finalize-metadata.py')
save(ROOT / 'runtime-provenance.json', runtime)

analysis = {'schema': 'aqrobat.integrated.final-resource-analysis.v1',
            'atUtc': now, 'actor': 'integrated_empirical', 'newCaptures': 0,
            'newReaderCalls': 0, 'newAdaptiveBinarizerCalls': 0,
            'classification': 'Pure arithmetic from retained source diagnostic receipts; every fixed grid and denominator retained. No selected source diagnostic substitutes for ordinary first geometry.',
            'batches': []}
for name in ['resources-05', 'resources-06']:
    result = read(ROOT / name / 'results.json')
    rows = []
    for row in result['rows']:
        item = {'id': row['id'], 'font': row['font'], 'cssFontSize': row['size'],
                'outputPixels': [row['width'], row['height']], 'deviceScaleFactor': 1,
                'pngPath': row['pngPath'], 'pngSha256': row['pngSha256'],
                'visibleInk245': row['visibleInk'], 'contourInk128': row['contours']['inkBounds'],
                'models': [{key: model.get(key) for key in ['label', 'point', 'metric', 'literalMetric', 'runs', 'literalRuns']}
                           for model in row['models']]}
        if row['kind'] == 'continuous-resource':
            support = read(Path(row['dir']) / 'support.json')
            item.update({'gray': row['gray'], 'stroke': row['stroke'], 'shadow': row['shadow'],
                         'cssFontSize': 16, 'cssLineHeight': 1, 'nativeAdvance': 9.6328125,
                         'sourceRowStep': 19.265625,
                         'readabilityReceipt': read(Path(row['dir']) / 'visual-review.json'),
                         'grids': [{key: grid[key] for key in ['pitch', 'offset', 'classes', 'totalCells']}
                                   | {'actualRows': sorted({cell['row'] for cell in grid['cells']}),
                                      'coordinatePath': row['dir'] + '/support.json'}
                                   for grid in support['grids']]})
        rows.append(item)
    analysis['batches'].append({'id': name, 'preregistrationPath': str(ROOT / name / 'preregistration.json'),
                               'captures': result['captures'], 'unattempted': result['unattempted'],
                               'stop': result['stop'], 'rows': rows})
analysis['phaseBoundaryLimitation'] = 'Frozen loop tests (row+.5)*pitch < extent.height before applying offset. At pitch38.53125 and fixed57.796875 extent it retains only row0,13cells per offset; third native row is not measured in these grids. This denominator is retained, not silently replaced by a corrected loop or described as full alternate-row coverage.'
analysis['finalDecision'] = 'Gray228stroke.75 words inadequately faint at actual640x128PNG; worker rejected and parent independently inspected/agreed. Three remaining resources06 unattempted. Fullsize624px square four-axis RMS.383047 exceeds.35. No fourth native trial selected; parent stopped experimental work.'
save(ROOT / 'final-resource-analysis.json', analysis)
save(ROOT / 'final-stop.json', {'atUtc': now,
    'authority': 'Parent direct internal instruction after original640x128PNG inspection',
    'decision': 'Stop experimental work and finalize evidence; reject faint source under hard visible/readable prose requirement.',
    'parentObserved': 'Substantial word fragments barely visible; readability inadequate.',
    'stoppedBatch': 'resources-06', 'retainedCapturedResources': 2,
    'retainedUnattemptedResources': 3, 'finalNativeTrialSelected': False,
    'unusedExploratorySlots': 1, 'newCaptures': 0, 'newReaderCalls': 0})
print(json.dumps({'fontFiles': len(fonts), 'observedNames': len(actual),
                  'exactFontVersions': len(runtime['fontVersionCoverage']['exactNamedFaces']),
                  'resourceBatches': len(analysis['batches'])}))
