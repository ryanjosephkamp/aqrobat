# Correction of interim manual error notes

The manually authored proposal-01/error.json, capture-launch-error.json and
REPAIR-01.md contain an incorrect reading of partial output. Preserve them as
superseded reports, not execution evidence. They are not additional executed
failures and must not enter the experiment denominator as actual events.

Verified saved state: producer v1 saved configurations and models 1, 2 and 3,
then rejected actual width while constructing **Arial Black / pitch 216**, the
fourth proposal. Its partial fourth DP rows were not saved. The subsequent
capture launch loaded existing config 1 successfully, rendered/repeated it
exactly, and completed all profiles. There was **no missing-config error**.
The run-01 manifest, capture, native image and reader receipts establish this.

Producer v2 reduced quantization to eighth pixels but attempted the original
config names. Its exclusive write guard stopped at existing run-01.json; no
existing file was overwritten. Preserve executed v2 and this genuine EEXIST
checker error under proposal-02. No native image was produced by that producer.

Revised authorization within the original four-layout objective: capture the
unchanged saved original proposals 2 and 3. Fresh proposal-03 constructs only
the previously rejected fourth layout, with eighth-pixel packing and the same
20 px reserve. It writes fresh config 4 and model 4. Do not regenerate configs
1–3. Total intended native layouts remains four; source width rejection and
EEXIST are retained separately. This correction supersedes, rather than erases,
the mistaken manual reports.
