const SENSITIVE =
  /(password|senha|certificate|certificado|authorization|bearer|pfx|pem|private.?key)/i;

export function redact(value: unknown): unknown {
  if (typeof value === "string") {
    if (SENSITIVE.test(value) || value.includes("BEGIN ") || value.length > 5000) {
      return "[redacted]";
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE.test(k) ? "[redacted]" : redact(v);
    }
    return out;
  }
  return value;
}

export function safeErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return String(error);
  return error.message
    .replace(/\/[^\s]+\.pfx/gi, "[cert-path]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}
