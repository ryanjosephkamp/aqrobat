# Phase51 — complete passive-log profile after setup API error

The phase50 script queried cv2.getLogLevel before any detector call. That API is
not exposed by this installed Python binding. All four slots failed in setup:
zero detector calls, four unknown slots, four retained identical exceptions.
Keep those sources, stdout/stderr, slot records and denominator unchanged.

Preregister the complete same four-input profile in fresh run-01, correcting
only that unsupported metadata query. Record OPENCV_LOG_LEVEL from the process
environment instead. No request, reader options, pixel, geometry, threshold,
corner or extraction changes. One OpenCV implementation, another passive logging
profile. Compare returned text/corners with prior ordinary baselines. Retain
stock debug logs if present; absent internal logs leave the internal stage unknown.
Do not claim a source-model hypothesis is an actual internal failure trace.

Four planned slots: conventional control, saved phase45 native full URL, both
phase49 finder-only images, unchanged order.90-second per-input resource bound,
all outputs/errors/unknowns retained. No retry in this phase or further logging
profile if logs are stripped. One decoder process at a time, no new image copies
or generation. Cap200,000 logical bytes including source/custody. Existing phases,
product/downloads/prototypes/repos/profiles/tasks/jobs preserved; npmprivate,
PR1 OPENdraft; no agents/chats/host/migration/merge/release/store/messages. No new
phone/print tests, full-QR source or phone candidate. Goal remains unsolved.
