// safe parser for a value that's supposed to be a number but stored as a bigint in the code
export function tryParseBigInt(
  raw: unknown,
): { ok: true; value: bigint } | { ok: false } {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: false };
  }
  try {
    const result = BigInt(raw as string | number | bigint);
    return { ok: true, value: result };
  } catch (err: any) {
    return { ok: false };
  }
}
