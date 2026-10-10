# Reporting notes

The executed producer's final console line retains a stale `leading: 18` label.
Its actual algorithm, generated recipes and configuration use 19 px and 53 rows;
these were checked before capture. Preserve the executed source and console
limitation. Native CSS/metrics independently verify the actual leading. This is
a reporting-label error, not a parameter change or new rendering proposal.

Phase 10's initial staged whitespace check reported the raw OpenCV build-info
output's trailing spaces and final blank line. The shell continued and backed
up that raw output. Do not claim that initial staged check passed. Preserve the
raw bytes. A narrow local .gitattributes exception now identifies only those raw
build-info.txt files as exempt from whitespace lint; source and report checks
remain enabled. The same exception applies to future raw build-info here.
