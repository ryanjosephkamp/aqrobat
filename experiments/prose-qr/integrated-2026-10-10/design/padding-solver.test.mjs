import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalData,
  compareNative,
  construct,
  constructWithinRadius,
  fitCanonical,
  immutablePrefixBound,
  PAYLOAD,
  solve,
  verifyCanonical,
} from "./padding-solver.mjs";

function target(matrix, options = {}) {
  return {
    schema: "aqrobat.native-module-constraints.v1",
    payload: PAYLOAD,
    version: 2,
    ecc: "L",
    mask: 0,
    padding: "canonical",
    complete: true,
    groups: [],
    samples: matrix.flatMap((row, y) => row.map((base, x) => ({ x, y, base }))),
    ...options,
  };
}

test("canonical byte header, URL and every mask agree with unchanged pinned encoder", () => {
  for (const [version, ecc] of [
    [2, "L"],
    [2, "M"],
    [3, "Q"],
    [3, "H"],
    [7, "L"],
    [10, "L"],
    [10, "M"],
    [40, "L"],
  ])
    for (let mask = 0; mask < 8; mask++)
      assert(verifyCanonical(version, ecc, mask));
  assert.equal(canonicalData(2, "L").prefixBytes, 22);
  assert.equal(canonicalData(10, "L").prefixBytes, 23);
  assert.equal(canonicalData(10, "L").payloadUtf8Bytes, 20);
  assert.throws(() => canonicalData(1, "L"), /never shorten/);
});

test("all module and codeword ownership are complete, including alignment/version/remainder", () => {
  for (const [version, ecc] of [
    [2, "L"],
    [7, "M"],
    [10, "L"],
    [40, "L"],
  ]) {
    const built = construct(version, ecc, 0);
    const data = built.ownership.stream.filter((m) => m.kind === "data");
    assert.equal(
      new Set(data.map((m) => m.index)).size,
      built.canonical.capacity,
    );
    assert.equal(
      built.ownership.stream.length,
      built.code.interleavedCodewords.length,
    );
    for (const meta of data) {
      const position = built.ownership.stream.indexOf(meta);
      assert.equal(
        built.code.interleavedCodewords[position],
        built.canonical.data[meta.index],
      );
    }
    const map = built.map.flat();
    assert.equal(
      map.filter((m) => m.kind === "data" || m.kind === "ecc").length,
      built.code.interleavedCodewords.length * 8,
    );
    assert(map.some((m) => m.role === "alignment"));
    assert.equal(
      map.some((m) => m.role === "version"),
      version >= 7,
    );
  }
});

test("canonical full synthetic target is satisfied with no style or padding freedom", () => {
  const result = solve(target(construct(2, "L", 0).matrix));
  assert.equal(result.status, "satisfied");
  assert.equal(result.alteredPaddingBytes, 0);
  assert.equal(result.variableCount, 0);
});

test("wrong immutable function module returns a verified contradiction, not candidate output", () => {
  const input = target(construct(2, "L", 0).matrix, {
    padding: "post-terminator-affine",
  });
  input.samples[0].base ^= 1;
  const result = solve(input);
  assert.equal(result.status, "inconsistent");
  assert.equal(result.certificateVerified, true);
  assert.equal(result.contradiction.length, 1);
  assert.equal(result.contradiction[0].role, "finder-or-separator");
  assert.equal(result.matrix, undefined);
});

test("complete altered-padding targets recover exact data and parity across unequal blocks", () => {
  for (const [version, ecc, mask] of [
    [2, "L", 3],
    [7, "M", 6],
    [10, "L", 1],
  ]) {
    const canonical = canonicalData(version, ecc);
    const data = canonical.data.map((b, i) =>
      i < canonical.prefixBytes ? b : b ^ ((i * 137 + 19) & 255),
    );
    const expected = construct(version, ecc, mask, data);
    const input = target(expected.matrix, {
      version,
      ecc,
      mask,
      padding: "post-terminator-affine",
    });
    const actual = solve(input);
    assert.equal(actual.status, "satisfied");
    assert.equal(actual.prefixUnchanged, true);
    assert.deepEqual(actual.dataCodewords, data);
    assert.deepEqual(
      actual.interleavedCodewords,
      expected.code.interleavedCodewords,
    );
    assert.deepEqual(actual.matrix, expected.matrix);
    assert.equal(actual.reconstructedConstraintParity, true);
    assert.equal(actual.canonicalPadding, false);
  }
});

test("style state is coupled across all samples of the same real glyph group", () => {
  const input = target(construct(2, "L", 0).matrix, {
    groups: [
      {
        id: "p1:0",
        character: "O",
        state0: "native regular",
        state1: "native bold",
      },
    ],
  });
  for (const index of [0, 2, 25, 51])
    Object.assign(input.samples[index], {
      base: input.samples[index].base ^ 1,
      toggle: true,
      group: "p1:0",
    });
  const result = solve(input);
  assert.equal(result.status, "satisfied");
  assert.deepEqual(result.nativeStyles, [{ id: "p1:0", state: 1 }]);
  input.samples[0].base ^= 1;
  const contradiction = solve(input);
  assert.equal(contradiction.status, "inconsistent");
  assert(contradiction.contradiction.length >= 2);
});

test("bad ownership, missing cells and changed payload are rejected; quiet conflict stays explicit", () => {
  const input = target(construct(2, "L", 0).matrix);
  assert.throws(
    () => solve({ ...input, payload: "https://example.com" }),
    /Exact URL/,
  );
  assert.throws(
    () => solve({ ...input, samples: input.samples.slice(1) }),
    /All module centers/,
  );
  assert.throws(
    () => solve({ ...input, samples: [...input.samples, input.samples[0]] }),
    /duplicate/,
  );
  assert.equal(
    solve({ ...input, quietSamples: [{ logical: 1 }] }).quietRing.status,
    "measured-dark-samples-present",
  );
  assert.throws(
    () => solve({ ...input, quietSamples: [{ logical: "unknown" }] }),
    /Quiet samples/,
  );
  const partial = solve({
    ...input,
    complete: false,
    samples: input.samples.slice(0, 2),
  });
  assert.equal(partial.status, "satisfied");
  assert.match(partial.claim, /Partial/);
});

test("canonical whole-glyph least-mismatch choice preserves coupled source states", () => {
  const built = construct(2, "L", 0);
  const input = target(built.matrix, {
    groups: [{ id: "p1:2", character: "c" }],
  });
  for (const index of [0, 1, 2])
    Object.assign(input.samples[index], {
      toggle: true,
      group: "p1:2",
      base: input.samples[index].base ^ 1,
    });
  const result = fitCanonical(input);
  assert.deepEqual(result.nativeStyles, [{ id: "p1:2", state: 1 }]);
  assert.equal(result.residual.totalMismatch, 0);
  assert(result.residual.allBlocksWithinIdealRadius);
});

test("radius construction retains function defects and bounds real symbol mismatch count", () => {
  const built = construct(2, "L", 0);
  const input = target(built.matrix);
  input.samples[0].base ^= 1;
  const point = input.samples.find((s) => built.map[s.y][s.x].kind === "ecc");
  point.base ^= 1;
  const result = constructWithinRadius(input);
  assert.equal(result.status, "ideal-data-radius-met");
  assert.equal(result.residual.functionMismatch["finder-or-separator"], 1);
  assert.equal(result.residual.blocks[0].symbolErrors, 1);
  assert.equal(result.allowedErrorCodewords.length, 1);
  assert.equal(result.residual.allBlocksWithinIdealRadius, true);
  assert.equal(
    compareNative(
      input,
      result.encodedTarget.matrix,
      result.encodedTarget.nativeStyles,
    ).totalMismatch,
    2,
  );
});

test("radius route exhaustion remains a limited failure, not an impossibility result", () => {
  const built = construct(2, "L", 0);
  const input = target(built.matrix);
  const changed = new Set();
  for (const sample of input.samples) {
    const meta = built.map[sample.y][sample.x];
    if (
      meta.kind !== "ecc" ||
      changed.has(meta.streamByte) ||
      changed.size >= 6
    )
      continue;
    changed.add(meta.streamByte);
    sample.base ^= 1;
  }
  const result = constructWithinRadius(input);
  assert.equal(result.status, "greedy-route-exhausted");
  assert.match(result.claim, /not a proof/);
  assert.equal(result.allowedErrorCodewords.length, 5);
});

test("immutable exact-URL words alone can falsify a declared ideal symbol radius", () => {
  const built = construct(2, "L", 0);
  const input = target(built.matrix, { padding: "post-terminator-affine" });
  const changed = new Set();
  for (const sample of input.samples) {
    const meta = built.map[sample.y][sample.x];
    if (
      meta.kind !== "data" ||
      meta.index >= built.canonical.prefixBytes ||
      changed.has(meta.streamByte) ||
      changed.size >= 6
    )
      continue;
    changed.add(meta.streamByte);
    sample.base ^= 1;
  }
  const bound = immutablePrefixBound(input);
  assert.equal(bound.exceedsDeclaredRadius, true);
  assert.equal(bound.blocks[0].unavoidablePrefixSymbolErrors, 6);
  assert(bound.blocks[0].words.every((word) => word.proof.length === 1));
  assert.equal(
    constructWithinRadius(input).status,
    "immutable-prefix-radius-failure",
  );
});
