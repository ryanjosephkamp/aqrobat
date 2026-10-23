# Phase 16 — uniform regular font density

Four native finder-only layouts completed with four exact repeats and passing
mechanical ink-bound gates. Uniform regular Impact and Arial Black at 20/24,
pitches 144/216. Impact/144 yields a nominal 25-module sampled symbol with all
twelve balanced rays, but each finder has one wrong cell (local x0/y2). It fails
the full structure gate. Impact/216 yields six incidental 65-module errors;
both Arial Black layouts yield none. All normal native payload profiles return
no payload, as expected for finder-only layouts. No phone candidates.

Producer v1 saved three configs/models then rejected the fourth source width.
Producer v2 stopped at an exclusive existing-file guard without overwriting.
Producer v3 generated only the revised fourth config/model. Four original
source layout proposals plus one revised proposal; four native captures.
See ERRATA-01.md for the correction of two mistaken manual error notes and
REPAIR-01.md. Those mistaken reports are retained, superseded, and do not count
as executed checker errors. Actual partial source/evidence is preserved.
Cap 10,000,000 logical bytes including source.
