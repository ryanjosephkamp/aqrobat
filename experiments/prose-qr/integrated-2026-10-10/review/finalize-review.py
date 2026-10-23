"""Build the independent review handback from completed pure checks only."""

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

root = Path(__file__).resolve().parents[4]
run = Path("docs/research/prose-qr/integrated-2026-10-10")
out = root / run / "review"


def load(name):
    return json.loads((out / name).read_text())


def evidence(path, needle=None):
    b = (root / path).read_bytes()
    item = {"path": str(path), "sha256": hashlib.sha256(b).hexdigest(), "bytes": len(b)}
    if not str(path).endswith(".gz"):
        lines = b.decode().splitlines()
        item["line"] = next((i + 1 for i, s in enumerate(lines) if needle in s), 1) if needle else 1
        if needle:
            item["lineAnchor"] = needle
    return item


files = ["pure-checks.json", "arithmetic-checks.json", "report-checks.json", "supplementary-checks.json"]
checks = [load(f) for f in files]
assert all(c["passed"] for c in checks)
total_checks = sum(len(c["checks"]) for c in checks)
totals = checks[0]["totals"]
findings = [
    {
        "id": "R1",
        "severity": "high",
        "category": "objective-blocker",
        "status": "unresolved-documented",
        "title": "No qualifying native-prose scan candidate",
        "finding": "Three actually captured native payload trials each returned no result in OpenCV, ZXing and jsQR. None meets the required exact URL recovery in two independent ordinary implementations. No owner scan candidate or goal-completion claim is supported.",
        "evidence": [evidence(run / "empirical/handoff.json", '"goalAchieved": false'), evidence(run / "empirical/payload-04/ledger.json", '"id": "continuous-native"')],
    },
    {
        "id": "R2",
        "severity": "medium",
        "category": "reproducibility-limit",
        "status": "unresolved-documented",
        "title": "Some early successful diagnostic/test streams are unavailable",
        "finding": "Successful resources-01/02 contour stderr was not separately saved by execFileSync. Initial mechanism article-test failures retain exact source/test bytes and contemporaneous summaries, but not reconstructed raw stdout. Hashes and later checks cannot recover discarded streams. Reports disclose both limits and no rerun or silent reconstruction occurred.",
        "evidence": [evidence(run / "empirical/handoff.json", "successful resource contour stderr unavailable"), evidence(run / "mechanism/RESULTS.md", "contemporaneous summaries")],
    },
    {
        "id": "R3",
        "severity": "medium",
        "category": "scientific-claim-boundary",
        "status": "unresolved-assumptions-explicit",
        "title": "Arithmetic exclusions are conditional within-radius statements",
        "finding": "All 64 V10/V5 immutable-closure alternatives and all 24 fitting V2 fixed-alpha recoloring alternatives exceed the stated ideal unknown-symbol correction radii. The eight V2-H overflow rows remain rejected. These are sound necessary bounds in the frozen whole-glyph affine or unchanged-alpha literal-center models. Native color/raster invariance is unmeasured; adaptive thresholds, other grids/layouts, erasure decoding and ordinary recovery beyond the declared radius are outside the bounds. No universal prose or decoder impossibility follows.",
        "evidence": [evidence(run / "design/RESULTS.md", "necessary in the sampled affine model only"), evidence(run / "mechanism/MECHANISM.md", "color-dependent rasterization has not been measured"), evidence(run / "review/arithmetic-checks.json")],
    },
    {
        "id": "R4",
        "severity": "medium",
        "category": "acceptance-limit",
        "status": "unresolved-untested",
        "title": "Exact Selection and saved pixels do not establish transfer or owner acceptance",
        "finding": "Source-order paragraph characters, two-LF full-document Selection, native CDP faces and exact PNG/RGBA repeat custody are supported. Readability remains the empirical worker/parent's direct observation, not a new visual judgment by this source-only reviewer. Plain/styled paste, native apps, phone scans, physical print and owner readability/scan acceptance remain untested.",
        "evidence": [evidence(run / "empirical/handoff.json", "portable plain/styled paste"), evidence(run / "empirical/final-stop.json", '"parentObserved"'), evidence(run / "review/pure-checks.json")],
    },
    {
        "id": "R5",
        "severity": "low",
        "category": "reporting-precision",
        "status": "resolved-in-parent-draft",
        "title": "Strict-gate observation denominator is five captures, ten branches",
        "finding": "Five of nine native captures have passive strict observations and all ten executed branches fail. Layout-01 light-regular stopped on its empty-string wrong payload; layout-04 and layout-05's three native captures were capture-only. Their strict gates are unobserved. Parent acknowledged this precision and updated the draft; zero observed passes is supported.",
        "evidence": [evidence(run / "review/supplementary-checks.json", '"profiledCaptures": 5')],
    },
    {
        "id": "R6",
        "severity": "low",
        "category": "executed-source-provenance",
        "status": "resolved-by-exact-archive",
        "title": "Earlier closure execution bytes remain recoverable",
        "finding": "The closure module changed formatting between V10 and V5. Earlier archived bytes match preregistered hash 77a998ab70e0a91031a4a8aecdb72be7b01c81c73744b0a218aefc5ca09afaad. Formatting that archive to stdout in the review tree yields the current V5 module byte-for-byte. V5 separately preregistered current hash 1c223bf29e5eb0616cea2231ce7bdc8cc0078f386a3d62c456ece56d0f5df166. Original receipts/results were preserved.",
        "evidence": [evidence(run / "design/measured-03-closure/preregistration.json", "77a998"), evidence(run / "design/measured-03-closure/immutable-closure.frozen-source.mjs.txt"), evidence(run / "review/supplementary-checks.json", "formats exactly")],
    },
]

report = {
    "schema": "aqrobat.integrated.independent-review.v1",
    "atUtc": datetime.now(timezone.utc).isoformat(),
    "status": "bounded_evidence_review_complete_with_documented_limits",
    "integrityConclusion": "No material undisclosed inconsistency found in the reviewed frozen evidence. Pure checks pass. Scientific objective remains unfinished.",
    "goalAchieved": False,
    "ownerScanCandidate": None,
    "reviewer": {"role": "fourth/final independent worker", "modelRequested": "GPT-6.1 Sol Xhigh", "FastOrBillingVerified": False, "deadlineUtc": "2026-10-10T23:10:22Z"},
    "checkout": {"cwd": str(root), "branch": "codex/aqrobat-foundation", "baselineHEAD": "a5cd4c2cbc6a285b7922e7d4c031eef750eb4222", "remote": "https://github.com/ryanjosephkamp/aqrobat.git", "ownedDirtyState": "Only the two fresh integrated run trees untracked at review; tracked files unchanged. PR1 draft status inherited from recorded START; reviewer made no PR/Git mutations."},
    "operations": {"screenshots": 0, "captures": 0, "imageDisplays": 0, "renderers": 0, "browsers": 0, "nativeApps": 0, "readers": 0, "locators": 0, "binarizers": 0, "agentsSpawned": 0, "chatsStarted": 0, "peopleMessaged": 0, "productChanges": 0, "gitMutations": 0},
    "findings": findings,
    "counts": {**totals, "resourceSlots": 107, "resourceDiagnosticAdaptiveCalls": 87, "constructionAdaptiveSourceCalls": 10, "fullNativeAdaptiveSourceCalls": 1, "totalSourceAdaptiveDiagnosticCalls": 98, "frozenFullCaptureSlots": 23, "frozenOrdinarySlots": 60, "frozenPassiveProfiles": 20, "exploratoryTrialsAllowed": 4, "exploratoryTrialsUnused": 1, "reviewChecks": total_checks, "inputFilesHashed": checks[0]["inputFilesHashed"]},
    "callBoundary": "37 primary ordinary API calls plus 11 passive instrumented API calls plus 27 nested decoder invocations observed inside passive profiles gives 75 under the conservative inclusive accounting convention. Primary public APIs' uninstrumented internal loops are not separately counted or known. Source diagnostics are separate and contain no payload decoding.",
    "strictGate": checks[3]["nativeGate"],
    "checks": [{"path": str(run / "review" / f), "count": len(c["checks"]), "passed": c["passed"], "sha256": hashlib.sha256((out / f).read_bytes()).hexdigest()} for f, c in zip(files, checks)],
    "boundaries": [
        "No new render, display, reader, locator or binarizer. PNG decoding only reverses lossless byte filters for custody and reads already declared literal samples.",
        "All actual capture/source/ordinary/passive records were read; pure encoder/RS/bit-ownership arithmetic validates saved results without invoking QR decoders.",
        "HTML source, links and embedded PNG bytes were checked; rendered layout/readability/accessibility was not tested. Parent draft intentionally awaits CLOSURE.json and final packaging.",
        "Product tests/build/browser/text-browser/native extension checks were not run because no product files changed. Parent owns final global format/custody/Git/PR closure.",
        "Prior clocks, frozen source/evidence, original prototypes, owner profiles/clipboard/documents, other repositories and jobs were not mutated by this reviewer.",
        "Scoped hash manifest covers complete empirical/design/mechanism trees and selected authorization/baseline files; parent mutable coordination and draft report have separate revision hashes in report-checks.json.",
    ],
    "preservedLimitations": [
        "Invalid resources-01 canvas font shorthand measurements are explicitly rejected; PNG/CDP/Range remain separate.",
        "Skia variable descriptor mismatch remains unresolved, not proven substitution; 21 of 22 actual faces have exact named version mapping and18 installed font-file hashes were independently verified.",
        "Resources-03 nested font query failed before body capture; fresh query-root amendment retains original failure and five unattempted rows.",
        "Resources-05 grid supports row 0 / 13 centers only; no unmeasured row or scaled glyph transfer is inferred.",
        "The final 624 px square's RMS 0.383047 fails the unchanged 0.35 boundary; small 192 px RMS 0.342389 does not transfer.",
        "Gray228 resource readability rejection stops resources-06 at 2/5; gray232 remains untested and the final payload allowance unused.",
        "No hidden QR modules, graphics, duplicate source characters or remote/custom glyph substitution found in native sources. Uniform black V10/V5 article fields are single page backgrounds, not per-module patterns; V2 is uniform white.",
    ],
    "reviewHarnessHistory": [
        "Initial audit incorrectly treated every CSS @font-face declaration as custom. Preserved local aliases and actual CDP isCustomFont=false resolve the false positive; initial source/result retained as .txt.",
        "Initial static CSV check expected nullable fields as empty rather than literal null; source/trace and failed receipt retained. Final comparison normalizes only empty/null to JSON None.",
        "Arithmetic check source was formatted after its first pure-check execution; exact first source/stdout/result archived, then formatted current source rerun. No scientific worker bytes changed.",
    ],
    "reviewHashManifest": str(run / "review/review-scope-hashes.json"),
    "nextActionForParent": "Reconcile this review, generate final closure and self-contained handback, verify only authorized fresh trees, preserve reported frozen-format exceptions, and finish Git backup with PR1 draft. Do not claim objective achieved or begin another experiment/allowance.",
}
(out / "review.json").write_text(json.dumps(report, indent=2) + "\n")
markdown = f"""# Independent evidence review

The bounded evidence review is complete. No material undisclosed inconsistency was found in the frozen records. The native-prose objective remains unfinished: all three captured payload trials returned no result in all three ordinary readers, so no owner scan candidate was earned.

This reviewer used source inspection, hashes, lossless PNG/RGBA decompression and pure encoder/RS arithmetic. It created zero captures, screenshots, image displays, browser/native-app sessions, readers, locators or binarizers. Readability judgments remain the empirical worker and parent's observations; this review does not add visual or owner acceptance.

## Reconciled denominator

| Evidence | Attempted | Retained remainder / result |
| --- | ---: | --- |
| Small resources | 87 of 107 | 19 unattempted; 1 setup failure before capture; 87 declared combined source-diagnostic pipelines |
| Full captures | 17 of 23 | 9 native + 8 controls; 6 unattempted |
| Immediate repeats | 17 | 16 exact PNG/RGBA; 1 mismatch stopped its batch |
| Primary ordinary slots | 37 of 60 | 23 unattempted; native payload trials 0/3 exact each |
| Passive profiles | 11 of 20 | 9 unattempted; 27 nested matrix-decoder invocations inside those profiles |
| Exploratory payload trials | 3 of 4 | Final allowance unused |
| Native strict observations | 5 of 9 captures; 10 branches | All 10 observed branches false; 4 native captures unprofiled |

The conservative inclusive accounting convention is 37 primary API calls + 11 passive instrumented API calls + 27 instrumented nested decoder calls = 75, below 96. Primary APIs' uninstrumented internal loops are not separately known; 75 is not a claim about every internal function invocation. Resource diagnostics account for 87 adaptive source calls, plus 10 construction source calls and 1 actual full-native ledger call = 98 source adaptive diagnostics, separate from payload readers.

The wrong-payload stop in layout-01, mismatching control repeat in layout-02, original failed ownership maps, resources-03 pre-capture font-query failure, invalid payload-03 control and final resources-06 readability rejection remain preserved. Fresh amendments have distinct preregistrations, sources and denominators. No unchanged failed row was silently replaced or selectively retried.

## What passed

The [pure custody/source check](pure-checks.json) passes 1,223 checks across 1,493 hashed inputs. It verifies complete frozen worker trees; preregistered/executed source bytes; native source paragraph characters and two-LF full-document Selection; CDP native faces; original PNG/repeat/RGBA bytes; ordinary raw results/default options; passive saved-baseline parity/first-selection semantics; all slots and totals. Native sources contain one real source span per character and no QR images, hidden modules, hidden duplicates or remote/custom font replacement. Installed-face local aliases are supported by actual CDP provenance. V10/V5 have one uniform black article field, V2 one uniform white field.

The [arithmetic check](arithmetic-checks.json) passes 187 checks across all 64 V10/V5 immutable-closure alternatives and 32 V2 color/overflow rows. Pinned encoder matrices, all codeword-bit mappings and independently recomputed block parity agree. Whole fixed data blocks also fix their ECC words; their wrong-word lower bounds reproduce the stored exclusions. The actual V2 literal ledger reproduces 203 module / 65 function defects and 41 of 44 wrong words; saved adaptive bits reproduce 240/68 and 44 of 44, against radius 11. Both retain 0 of 464 dark quiet centers. Actual ordinary first selections remain dimension 165 normal and 37 inverted, with intended dimension 25 separate.

The [supplement](supplementary-checks.json) passes 33 checks: unchanged strict predicate, all 10 native branch results, closure-source provenance and 18 installed font-file hashes. The earlier closure source's hash matches its preregistration, and formatting its archived bytes to stdout yields the current V5 module exactly. V5 froze its separate current hash. The original receipts were not rewritten.

The [static report check](report-checks.json) passes 402 checks, including all 24 JSON/CSV rows, local evidence links and actual embedded PNG hashes. The parent draft's pending CLOSURE.json is explicitly exempted until packaging. HTML rendering and usability were not exercised.

## Open limits and resolved reporting precision

- **Objective blocker:** no qualifying native payload recovery; no owner scan candidate or completed-goal claim.
- **Stream custody:** successful early resource diagnostic stderr is missing, and initial mechanism article-test failures have summaries/exact source bytes rather than reconstructed raw stdout. These gaps remain visible and were not repaired by rerunning.
- **Conditional mathematics:** whole-glyph affine and fixed-alpha literal-center exclusions concern construction within a declared ideal unknown-symbol radius. The color bound assumes unchanged native raster/blur alpha when foreground RGB changes. Other layouts, grids, adaptive thresholds, erasure decoding and ordinary decoder behavior beyond that model remain outside the result.
- **Acceptance:** exact local Selection does not establish plain/styled paste, native-app transfer, phone scans, physical print or owner readability. All remain untested. This reviewer did not display the pixels.
- **Strict denominator clarified:** five profiled native captures / ten branches fail; four native captures have no passive strict observation. Parent acknowledged and updated the draft. “No native passed” is supported.
- **Source provenance resolved:** the formatted-between-batches closure module has exact original execution bytes and separately frozen V5 bytes.

The invalid resources-01 canvas metrics remain rejected. Skia's variable descriptor mismatch remains unresolved, not proven fallback. Resources-05 support is limited to row 0 / 13 centers. The 624 px square's RMS 0.383047 fails 0.35 despite a 192 px source pass; geometry transfer was not accepted. Actual gray 228 readability was rejected after 2 of 5 final resources; gray 232 and the remaining exploratory payload were not attempted.

The first reviewer CSS check produced a false positive for installed-face @font-face local aliases, and the first CSV check mishandled nullable fields. Their source/results/trace are preserved in this review tree; only the review harness was corrected. No scientific evidence was changed.

## Custody and handback boundary

The [structured review](review.json) lists severity, status, evidence hashes and line anchors. The [scope/hash receipt](review-scope-hashes.json) records reviewed worker and authorization/baseline files. Parent coordination and draft HTML are mutable and have separate revision hashes in the static report receipt. The final review artifact manifest records this lane's own bytes.

At review, cwd/remote/branch/HEAD matched the authorization and tracked files were unchanged; only the two fresh integrated run trees were dirty. The reviewer made no Git/PR/product mutations. Product suites were not run for this research-only work. Parent owns final global formatting, closure, report regeneration, preservation verification and Git backup. A passing bounded review does not complete the scientific goal or authorize another run.
"""
(out / "REVIEW.md").write_text(markdown)
print(json.dumps({"status": report["status"], "goalAchieved": False, "checks": total_checks, "findings": len(findings), "newCaptureReaderLocatorBinarizerCalls": 0}, indent=2))
