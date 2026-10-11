import assert from "node:assert/strict";
import qrcodegen from "../../../../vendor/qrcodegen.mjs";

export const PAYLOAD = "https://example.com/";
export const LEVELS = {
  L: qrcodegen.QrCode.Ecc.LOW,
  M: qrcodegen.QrCode.Ecc.MEDIUM,
  Q: qrcodegen.QrCode.Ecc.QUARTILE,
  H: qrcodegen.QrCode.Ecc.HIGH,
};

// Subclass only for observation. The pinned source and encoding methods are intact.
class ObservedQr extends qrcodegen.QrCode {
  drawFunctionPatterns() {
    super.drawFunctionPatterns();
    this.functionGrid = this.isFunction.map((row) => row.slice());
  }
  addEccAndInterleave(data) {
    this.dataCodewords = data.slice();
    const result = super.addEccAndInterleave(data);
    this.interleavedCodewords = result.slice();
    return result;
  }
}

function append(bits, value, length) {
  for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
}

export function canonicalData(version, ecc) {
  assert(Number.isInteger(version) && version >= 1 && version <= 40);
  assert(LEVELS[ecc]);
  const bytes = [...new TextEncoder().encode(PAYLOAD)];
  const bits = [];
  append(bits, 4, 4); // Byte mode; this URL contains lowercase letters.
  append(bits, bytes.length, version <= 9 ? 8 : 16);
  for (const byte of bytes) append(bits, byte, 8);
  const payloadEndBit = bits.length;
  const capacity = qrcodegen.QrCode.getNumDataCodewords(version, LEVELS[ecc]);
  assert(
    bits.length <= capacity * 8,
    "Exact URL does not fit; never shorten it",
  );
  const terminatorBits = Math.min(4, capacity * 8 - bits.length);
  append(bits, 0, terminatorBits);
  const alignmentBits = (8 - (bits.length % 8)) % 8;
  append(bits, 0, alignmentBits);
  const prefixBytes = bits.length / 8;
  for (let byte = 0xec; bits.length < capacity * 8; byte ^= 0xec ^ 0x11)
    append(bits, byte, 8);
  const data = Array(capacity).fill(0);
  bits.forEach((bit, i) => (data[i >>> 3] |= bit << (7 - (i & 7))));
  return {
    data,
    capacity,
    prefixBytes,
    payloadEndBit,
    terminatorBits,
    alignmentBits,
    paddingBytes: capacity - prefixBytes,
    payloadUtf8Bytes: bytes.length,
  };
}

function interleaveOwnership(version, ecc, dataLength) {
  const ecl = LEVELS[ecc];
  const count =
    qrcodegen.QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][version];
  const eccLength =
    qrcodegen.QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][version];
  const raw = Math.floor(qrcodegen.QrCode.getNumRawDataModules(version) / 8);
  const shortCount = count - (raw % count);
  const shortLength = Math.floor(raw / count);
  const shortDataLength = shortLength - eccLength;
  let offset = 0;
  const blocks = Array.from({ length: count }, (_, block) => {
    const length = shortDataLength + (block < shortCount ? 0 : 1);
    const result = { block, offset, dataLength: length, eccLength };
    offset += length;
    return result;
  });
  assert.equal(offset, dataLength);
  const stream = [];
  for (let i = 0; i <= shortLength; i++)
    for (const block of blocks) {
      if (i === shortDataLength && block.block < shortCount) continue;
      if (i < block.dataLength)
        stream.push({
          kind: "data",
          block: block.block,
          index: block.offset + i,
          blockIndex: i,
        });
      else {
        const index = i - block.dataLength - (block.block < shortCount ? 1 : 0);
        assert(index >= 0 && index < eccLength);
        stream.push({ kind: "ecc", block: block.block, index });
      }
    }
  assert.equal(stream.length, raw);
  return { blocks, stream, rawCodewords: raw, eccLength };
}

function functionRole(code, x, y) {
  const n = code.size;
  if ((x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8))
    return "finder-or-separator";
  const positions = code.getAlignmentPatternPositions();
  for (let i = 0; i < positions.length; i++)
    for (let j = 0; j < positions.length; j++) {
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === positions.length - 1) ||
        (i === positions.length - 1 && j === 0)
      )
        continue;
      if (Math.abs(x - positions[i]) <= 2 && Math.abs(y - positions[j]) <= 2)
        return "alignment";
    }
  if (
    code.version >= 7 &&
    ((x >= n - 11 && x <= n - 9 && y < 6) ||
      (y >= n - 11 && y <= n - 9 && x < 6))
  )
    return "version";
  if (x === 6 || y === 6) return "timing";
  if (x === 8 && y === n - 8) return "fixed-dark";
  return "format";
}

export function construct(version, ecc, mask, dataOverride) {
  assert(Number.isInteger(mask) && mask >= 0 && mask < 8);
  const canonical = canonicalData(version, ecc);
  const data = dataOverride ?? canonical.data;
  assert.equal(data.length, canonical.capacity);
  data.forEach((b) => assert(Number.isInteger(b) && b >= 0 && b <= 255));
  const code = new ObservedQr(version, LEVELS[ecc], data, mask);
  const ownership = interleaveOwnership(version, ecc, data.length);
  const map = code.modules.map((row, y) =>
    row.map((_, x) =>
      code.functionGrid[y][x]
        ? { kind: "function", role: functionRole(code, x, y) }
        : null,
    ),
  );
  let index = 0;
  for (let right = code.size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < code.size; vert++)
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const y = ((right + 1) & 2) === 0 ? code.size - 1 - vert : vert;
        if (code.functionGrid[y][x]) continue;
        map[y][x] =
          index < ownership.rawCodewords * 8
            ? {
                ...ownership.stream[index >>> 3],
                streamByte: index >>> 3,
                bit: index & 7,
              }
            : { kind: "remainder" };
        index++;
      }
  }
  assert.equal(index, qrcodegen.QrCode.getNumRawDataModules(version));
  return {
    code,
    canonical,
    ownership,
    map,
    matrix: code.modules.map((row) => row.map(Number)),
  };
}

function popParity(value) {
  let result = 0;
  while (value) {
    let n = Number(value & 0xffffffffn) >>> 0;
    n -= (n >>> 1) & 0x55555555;
    n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
    result ^= ((((n + (n >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24) & 1;
    value >>= 32n;
  }
  return result;
}

function setIndices(value) {
  const indices = [];
  let index = 0;
  while (value) {
    if (value & 1n) indices.push(index);
    value >>= 1n;
    index++;
  }
  return indices;
}

function linearSolve(equations, variableCount, maxXors) {
  const basis = new Map();
  let xors = 0;
  for (const [index, equation] of equations.entries()) {
    let { coefficients, rhs } = equation;
    let proof = 1n << BigInt(index);
    while (coefficients) {
      const pivot = coefficients.toString(2).length - 1;
      const previous = basis.get(pivot);
      if (!previous) {
        basis.set(pivot, { coefficients, rhs, proof });
        break;
      }
      coefficients ^= previous.coefficients;
      rhs ^= previous.rhs;
      proof ^= previous.proof;
      if (++xors > maxXors)
        return {
          status: "resource-limited",
          processed: index + 1,
          rank: basis.size,
          xors,
        };
    }
    if (!coefficients && rhs) {
      const certificate = setIndices(proof);
      let check = 0n,
        checkRhs = 0;
      for (const i of certificate) {
        check ^= equations[i].coefficients;
        checkRhs ^= equations[i].rhs;
      }
      assert.equal(check, 0n);
      assert.equal(checkRhs, 1);
      return {
        status: "inconsistent",
        processed: index + 1,
        rank: basis.size,
        xors,
        certificate,
        certificateVerified: true,
      };
    }
  }
  let solution = 0n;
  for (const pivot of [...basis.keys()].sort((a, b) => a - b)) {
    const row = basis.get(pivot);
    if (row.rhs ^ popParity(row.coefficients & solution))
      solution |= 1n << BigInt(pivot);
  }
  assert(
    equations.every(
      (row) => popParity(row.coefficients & solution) === row.rhs,
    ),
  );
  return {
    status: "satisfied",
    processed: equations.length,
    rank: basis.size,
    freeVariables: variableCount - basis.size,
    xors,
    solution,
  };
}

function validate(input) {
  assert.equal(input.schema, "aqrobat.native-module-constraints.v1");
  assert.equal(input.payload, PAYLOAD, "Exact URL invariant");
  assert(["canonical", "post-terminator-affine"].includes(input.padding));
  assert(typeof input.complete === "boolean");
  assert(Array.isArray(input.samples));
  const n = 4 * input.version + 17;
  const groups = input.groups ?? [];
  const ids = new Set(groups.map((g) => g.id));
  assert.equal(ids.size, groups.length, "Unique native text style groups");
  const coordinates = new Set();
  for (const sample of input.samples) {
    assert(Number.isInteger(sample.x) && sample.x >= 0 && sample.x < n);
    assert(Number.isInteger(sample.y) && sample.y >= 0 && sample.y < n);
    assert(sample.base === 0 || sample.base === 1);
    assert(sample.toggle === undefined || typeof sample.toggle === "boolean");
    if (sample.toggle)
      assert(ids.has(sample.group), "Toggle requires declared real text group");
    const key = sample.y * n + sample.x;
    assert(!coordinates.has(key), "No duplicate module constraints");
    coordinates.add(key);
  }
  if (input.complete)
    assert.equal(input.samples.length, n * n, "All module centers required");
  if (input.quietSamples) {
    assert(
      input.quietSamples.every((s) => s.logical === 0 || s.logical === 1),
      "Quiet samples require actual logical binary values",
    );
  }
  return groups;
}

export function solve(input, options = {}) {
  const groups = validate(input);
  const built = construct(input.version, input.ecc, input.mask);
  const { canonical, ownership, map, matrix } = built;
  const freePadBits =
    input.padding === "post-terminator-affine" ? canonical.paddingBytes * 8 : 0;
  const activeIds = new Set(
    input.samples.filter((s) => s.toggle).map((s) => s.group),
  );
  const activeGroups = groups.filter((g) => activeIds.has(g.id));
  const groupIndex = new Map(
    activeGroups.map((g, i) => [g.id, freePadBits + i]),
  );
  const variableCount = freePadBits + activeGroups.length;
  const coeffCache = new Map();
  const rsCache = new Map();
  function qrCoefficients(meta) {
    if (!freePadBits || !["data", "ecc"].includes(meta.kind)) return 0n;
    if (meta.kind === "data")
      return meta.index < canonical.prefixBytes
        ? 0n
        : 1n << BigInt((meta.index - canonical.prefixBytes) * 8 + meta.bit);
    const key = meta.streamByte * 8 + meta.bit;
    if (coeffCache.has(key)) return coeffCache.get(key);
    const block = ownership.blocks[meta.block];
    const divisor = qrcodegen.QrCode.reedSolomonComputeDivisor(block.eccLength);
    let result = 0n;
    for (let position = 0; position < block.dataLength; position++) {
      const globalIndex = block.offset + position;
      if (globalIndex < canonical.prefixBytes) continue;
      const rsKey = `${block.dataLength}:${block.eccLength}:${position}`;
      let remainder = rsCache.get(rsKey);
      if (!remainder) {
        const basis = Array(block.dataLength).fill(0);
        basis[position] = 1;
        remainder = qrcodegen.QrCode.reedSolomonComputeRemainder(
          basis,
          divisor,
        );
        rsCache.set(rsKey, remainder);
      }
      const coefficient = remainder[meta.index];
      for (let bit = 0; bit < 8; bit++) {
        const contribution = qrcodegen.QrCode.reedSolomonMultiply(
          coefficient,
          1 << (7 - bit),
        );
        if ((contribution >>> (7 - meta.bit)) & 1)
          result |=
            1n << BigInt((globalIndex - canonical.prefixBytes) * 8 + bit);
      }
    }
    coeffCache.set(key, result);
    return result;
  }
  // Check function constraints first; no amount of post-terminator padding changes them.
  const ordered = input.samples
    .map((s, index) => ({ ...s, inputIndex: index }))
    .sort(
      (a, b) =>
        Number(map[b.y][b.x].kind === "function") -
          Number(map[a.y][a.x].kind === "function") ||
        a.inputIndex - b.inputIndex,
    );
  const equations = ordered.map((sample) => ({
    coefficients:
      qrCoefficients(map[sample.y][sample.x]) ^
      (sample.toggle ? 1n << BigInt(groupIndex.get(sample.group)) : 0n),
    rhs: matrix[sample.y][sample.x] ^ sample.base,
  }));
  const outcome = linearSolve(
    equations,
    variableCount,
    options.maxXors ?? 2000000,
  );
  const counts = {};
  for (const row of map)
    for (const meta of row) {
      const role = meta.role ?? meta.kind;
      counts[role] = (counts[role] ?? 0) + 1;
    }
  const result = {
    schema: "aqrobat.native-module-solution.v1",
    status: outcome.status,
    claim: input.complete
      ? "Complete ideal module-center affine constraint diagnostic only; no render, locator, reader or scanning result"
      : "Partial affine diagnostic only; unconstrained modules prevent complete native feasibility",
    payload: PAYLOAD,
    version: input.version,
    ecc: input.ecc,
    mask: input.mask,
    dimension: matrix.length,
    padding: input.padding,
    canonicalPadding: input.padding === "canonical",
    standardsConformance:
      "Not established; altered post-terminator padding is explicitly noncanonical",
    polarity: input.polarity ?? "unspecified",
    geometry: input.geometry ?? null,
    quietRing: quietStatus(input),
    complete: input.complete,
    suppliedConstraints: input.samples.length,
    moduleCounts: counts,
    prefix: { ...canonical, data: undefined },
    freePadBits,
    declaredStyleGroups: groups.length,
    nativeStyleVariables: activeGroups.length,
    variableCount,
    rank: outcome.rank,
    processedConstraints: outcome.processed,
    xors: outcome.xors,
    controlsRequiredBeforeNativeReader: [
      "Canonical matrix control at same geometry and reader defaults",
      "If padding changed, separate conventional control using these exact dataCodewords",
      "Native source visibility and exact text selection",
      "Full native repeat/source custody and unchanged strict gate reported separately",
    ],
  };
  if (outcome.status === "inconsistent") {
    result.certificateVerified = outcome.certificateVerified;
    result.contradiction = outcome.certificate.map((i) => ({
      inputIndex: ordered[i].inputIndex,
      x: ordered[i].x,
      y: ordered[i].y,
      role:
        map[ordered[i].y][ordered[i].x].role ??
        map[ordered[i].y][ordered[i].x].kind,
    }));
    return result;
  }
  if (outcome.status !== "satisfied") return result;
  const data = canonical.data.slice();
  for (let i = 0; i < freePadBits; i++)
    if ((outcome.solution >> BigInt(i)) & 1n)
      data[canonical.prefixBytes + (i >>> 3)] ^= 1 << (7 - (i & 7));
  assert.deepEqual(
    data.slice(0, canonical.prefixBytes),
    canonical.data.slice(0, canonical.prefixBytes),
  );
  const actual = construct(input.version, input.ecc, input.mask, data);
  const styles = groups.map((group) => ({
    id: group.id,
    state: groupIndex.has(group.id)
      ? Number((outcome.solution >> BigInt(groupIndex.get(group.id))) & 1n)
      : 0,
  }));
  const styleMap = new Map(styles.map((s) => [s.id, s.state]));
  assert(
    input.samples.every(
      (s) =>
        actual.matrix[s.y][s.x] ===
        (s.base ^ (s.toggle ? styleMap.get(s.group) : 0)),
    ),
  );
  result.freeVariables = outcome.freeVariables;
  result.dataCodewords = data;
  result.interleavedCodewords = actual.code.interleavedCodewords;
  result.blockOwnership = ownership.blocks;
  result.interleavedOwnership = ownership.stream;
  result.matrix = actual.matrix;
  result.nativeStyles = styles;
  result.prefixUnchanged = true;
  result.alteredPaddingBytes = data.reduce(
    (n, b, i) => n + Number(b !== canonical.data[i]),
    0,
  );
  result.canonicalPadding = result.alteredPaddingBytes === 0;
  result.reconstructedConstraintParity = true;
  return result;
}

export function verifyCanonical(version, ecc, mask) {
  const ours = construct(version, ecc, mask);
  const stock = qrcodegen.QrCode.encodeSegments(
    qrcodegen.QrSegment.makeSegments(PAYLOAD),
    LEVELS[ecc],
    version,
    version,
    mask,
    false,
  );
  assert.deepEqual(
    ours.matrix,
    stock.modules.map((row) => row.map(Number)),
  );
  return true;
}

export function compareNative(input, matrix, styles = []) {
  const built = construct(input.version, input.ecc, input.mask);
  const states = new Map(styles.map((s) => [s.id, s.state]));
  const functions = {},
    codewords = new Map();
  let totalMismatch = 0,
    remainderMismatch = 0;
  for (const sample of input.samples) {
    const native =
      sample.base ^ (sample.toggle ? (states.get(sample.group) ?? 0) : 0);
    if (native === matrix[sample.y][sample.x]) continue;
    totalMismatch++;
    const meta = built.map[sample.y][sample.x];
    if (meta.kind === "function")
      functions[meta.role] = (functions[meta.role] ?? 0) + 1;
    else if (meta.kind === "remainder") remainderMismatch++;
    else {
      const row = codewords.get(meta.streamByte) ?? {
        streamByte: meta.streamByte,
        kind: meta.kind,
        block: meta.block,
        index: meta.index,
        bitMismatches: 0,
      };
      row.bitMismatches++;
      codewords.set(meta.streamByte, row);
    }
  }
  const blocks = built.ownership.blocks.map((block) => {
    const errors = [...codewords.values()].filter(
      (word) => word.block === block.block,
    );
    return {
      ...block,
      symbolErrorRadius: Math.floor(block.eccLength / 2),
      symbolErrors: errors.length,
      withinIdealRadius: errors.length <= Math.floor(block.eccLength / 2),
      errors,
    };
  });
  return {
    totalMismatch,
    functionMismatch: functions,
    remainderMismatch,
    blocks,
    quietRing: quietStatus(input),
    allBlocksWithinIdealRadius:
      input.complete && blocks.every((b) => b.withinIdealRadius),
    claim:
      "Native source-space module-center arithmetic only. Ordinary locator, perspective extraction, binarization, strict native gate and reader recovery are unproved. Function/remainder mismatches are outside this Reed-Solomon symbol radius.",
  };
}

function quietStatus(input) {
  return input.quietSamples
    ? {
        status: input.quietSamples.some((s) => s.logical)
          ? "measured-dark-samples-present"
          : "supplied-samples-logical-white",
        samples: input.quietSamples.length,
        darkSamples: input.quietSamples.filter((s) => s.logical).length,
        completeness: input.quietComplete
          ? "Caller declares complete frozen ring sampling"
          : "Sampling completeness unknown; not a whole-pixel quiet-zone proof",
      }
    : { status: "unmeasured" };
}

export function fitCanonical(input) {
  const groups = validate(input);
  assert.equal(input.padding, "canonical");
  const built = construct(input.version, input.ecc, input.mask);
  const costs = new Map(groups.map((g) => [g.id, [0, 0]]));
  for (const sample of input.samples) {
    if (!sample.toggle) continue;
    const cost = costs.get(sample.group);
    const actual = built.matrix[sample.y][sample.x];
    cost[0] += Number(sample.base !== actual);
    cost[1] += Number((sample.base ^ 1) !== actual);
  }
  const nativeStyles = groups.map((g) => ({
    id: g.id,
    state: Number(costs.get(g.id)[1] < costs.get(g.id)[0]),
  }));
  return {
    schema: "aqrobat.canonical-native-fit.v1",
    payload: PAYLOAD,
    version: input.version,
    ecc: input.ecc,
    mask: input.mask,
    padding: "canonical",
    complete: input.complete,
    claim:
      "Deterministic least module-mismatch whole-glyph style proposal; target matrix remains canonical. Not a rendered native payload or reader result.",
    nativeStyles,
    matrix: built.matrix,
    dataCodewords: built.canonical.data,
    interleavedCodewords: built.code.interleavedCodewords,
    residual: compareNative(input, built.matrix, nativeStyles),
  };
}

export function constructWithinRadius(input, options = {}) {
  validate(input);
  assert(
    input.complete,
    "Radius diagnostic requires complete native sample ownership",
  );
  const built = construct(input.version, input.ecc, input.mask);
  const prefixBound = immutablePrefixBound(input);
  if (prefixBound.exceedsDeclaredRadius)
    return {
      schema: "aqrobat.native-radius-construction.v1",
      status: "immutable-prefix-radius-failure",
      claim:
        "For this measured affine native model, immutable URL/header/terminator codewords already exceed an RS block's declared ideal symbol radius for every padding choice. This does not prove ordinary-reader failure or general native-prose impossibility.",
      prefixBound,
      trace: [],
    };
  const ignored = new Set();
  const used = built.ownership.blocks.map(() => 0);
  const radius = built.ownership.blocks.map((b) => Math.floor(b.eccLength / 2));
  const maxRounds =
    options.maxRounds ?? Math.min(96, radius.reduce((a, b) => a + b, 0) + 1);
  const trace = [];
  const ignoredFunctionSamples = input.samples.filter(
    (s) => built.map[s.y][s.x].kind === "function",
  ).length;
  const ignoredRemainderSamples = input.samples.filter(
    (s) => built.map[s.y][s.x].kind === "remainder",
  ).length;
  for (let round = 0; round < maxRounds; round++) {
    const subset = input.samples.filter((s) => {
      const m = built.map[s.y][s.x];
      return (
        !["function", "remainder"].includes(m.kind) &&
        !ignored.has(m.streamByte)
      );
    });
    const result = solve(
      { ...input, complete: false, samples: subset },
      { maxXors: options.maxXors ?? 2000000 },
    );
    if (result.status === "satisfied") {
      const residual = compareNative(input, result.matrix, result.nativeStyles);
      assert(residual.allBlocksWithinIdealRadius);
      for (const block of residual.blocks)
        for (const error of block.errors) assert(ignored.has(error.streamByte));
      return {
        schema: "aqrobat.native-radius-construction.v1",
        status: "ideal-data-radius-met",
        payload: PAYLOAD,
        version: input.version,
        ecc: input.ecc,
        mask: input.mask,
        padding: input.padding,
        claim:
          "Limited construction hypothesis: complete measured native sample model fits encoded data within each block's ideal symbol error radius. All function/remainder mismatches remain explicit. No reader result or native gate pass.",
        ignoredFunctionSamples,
        ignoredRemainderSamples,
        prefixBound,
        allowedErrorCodewords: [...ignored].sort((a, b) => a - b),
        trace,
        residual,
        encodedTarget: result,
      };
    }
    if (result.status === "resource-limited")
      return {
        schema: "aqrobat.native-radius-construction.v1",
        status: "resource-limited",
        trace,
        round,
        result,
      };
    const candidates = new Map();
    for (const point of result.contradiction) {
      const m = built.map[point.y][point.x];
      if (used[m.block] >= radius[m.block]) continue;
      const count = candidates.get(m.streamByte) ?? { ...m, count: 0 };
      count.count++;
      candidates.set(m.streamByte, count);
    }
    const selected = [...candidates.values()].sort(
      (a, b) =>
        b.count - a.count ||
        Number(b.kind === "ecc") - Number(a.kind === "ecc") ||
        a.streamByte - b.streamByte,
    )[0];
    trace.push({
      round,
      status: result.status,
      rank: result.rank,
      xors: result.xors,
      contradictionModules: result.contradiction.length,
      selectedErrorCodeword: selected?.streamByte ?? null,
    });
    if (!selected)
      return {
        schema: "aqrobat.native-radius-construction.v1",
        status: "greedy-route-exhausted",
        claim:
          "This deterministic correction-radius relaxation failed; not a proof that no different padding/style/error allocation works.",
        ignoredFunctionSamples,
        ignoredRemainderSamples,
        allowedErrorCodewords: [...ignored],
        trace,
        finalContradiction: result.contradiction,
      };
    ignored.add(selected.streamByte);
    used[selected.block]++;
  }
  return {
    schema: "aqrobat.native-radius-construction.v1",
    status: "round-limit",
    ignoredFunctionSamples,
    ignoredRemainderSamples,
    allowedErrorCodewords: [...ignored],
    trace,
  };
}

export function immutablePrefixBound(input) {
  validate(input);
  const built = construct(input.version, input.ecc, input.mask);
  const words = new Map();
  for (const sample of input.samples) {
    const meta = built.map[sample.y][sample.x];
    if (meta.kind !== "data" || meta.index >= built.canonical.prefixBytes)
      continue;
    const points = words.get(meta.streamByte) ?? [];
    points.push({
      ...sample,
      required: built.matrix[sample.y][sample.x] ^ sample.base,
      dataIndex: meta.index,
      block: meta.block,
      streamByte: meta.streamByte,
    });
    words.set(meta.streamByte, points);
  }
  const unavoidable = [];
  for (const points of words.values()) {
    const requirements = new Map();
    let proof = null;
    for (const point of points) {
      if (!point.toggle && point.required) {
        proof = [point];
        break;
      }
      if (!point.toggle) continue;
      const earlier = requirements.get(point.group);
      if (earlier && earlier.required !== point.required) {
        proof = [earlier, point];
        break;
      }
      requirements.set(point.group, point);
    }
    if (proof)
      unavoidable.push({
        streamByte: points[0].streamByte,
        dataIndex: points[0].dataIndex,
        block: points[0].block,
        proof: proof.map(({ x, y, base, toggle, group, required }) => ({
          x,
          y,
          base,
          toggle: !!toggle,
          group: group ?? null,
          required,
        })),
      });
  }
  const blocks = built.ownership.blocks.map((block) => ({
    block: block.block,
    symbolRadius: Math.floor(block.eccLength / 2),
    unavoidablePrefixSymbolErrors: unavoidable.filter(
      (word) => word.block === block.block,
    ).length,
    words: unavoidable.filter((word) => word.block === block.block),
  }));
  const coordinates = [...words.values()].flat();
  return {
    schema: "aqrobat.immutable-prefix-bound.v1",
    payload: PAYLOAD,
    version: input.version,
    ecc: input.ecc,
    mask: input.mask,
    fixedPrefixBytes: built.canonical.prefixBytes,
    suppliedPrefixCodewords: words.size,
    suppliedPrefixSamples: coordinates.length,
    coordinateBounds: coordinates.length
      ? [
          Math.min(...coordinates.map((p) => p.x)),
          Math.min(...coordinates.map((p) => p.y)),
          Math.max(...coordinates.map((p) => p.x)),
          Math.max(...coordinates.map((p) => p.y)),
        ]
      : null,
    blocks,
    exceedsDeclaredRadius: blocks.some(
      (b) => b.unavoidablePrefixSymbolErrors > b.symbolRadius,
    ),
    claim:
      "Necessary local-symbol lower bound for this frozen affine native model. One fixed conflicting sample or two opposite requirements for the same whole-glyph state proves that prefix codeword must be erroneous. Cross-codeword coupling may add more errors; a low bound does not prove feasibility.",
  };
}
