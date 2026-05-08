/** One logical SSE event (after blank-line delimiter). */
export type ParsedSseEvent = {
  event?: string;
  /** Joined data: lines with \n between chunks (per SSE spec). */
  data: string;
};

type BuildEvent = { event?: string; dataParts: string[] };

/**
 * Parse partial SSE buffer into complete events (terminated by empty line) and trailing incomplete event.
 */
export function parseSseBuffer(raw: string): {
  complete: ParsedSseEvent[];
  incomplete: ParsedSseEvent | null;
} {
  const lines = raw.split(/\r?\n/);
  const complete: ParsedSseEvent[] = [];
  let cur: BuildEvent = { dataParts: [] };
  let eventName: string | undefined;

  const pushComplete = () => {
    if (cur.dataParts.length === 0 && !eventName) return;
    complete.push({
      event: eventName,
      data: cur.dataParts.join("\n"),
    });
    cur = { dataParts: [] };
    eventName = undefined;
  };

  for (const line of lines) {
    if (line === "") {
      pushComplete();
      continue;
    }
    if (line.startsWith("data:")) {
      cur.dataParts.push(line.slice(5).trimStart());
      continue;
    }
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
      continue;
    }
    if (line.startsWith(":")) continue;
    if (line.startsWith("id:") || line.startsWith("retry:")) continue;
  }

  const incomplete: ParsedSseEvent | null =
    cur.dataParts.length || eventName
      ? { event: eventName, data: cur.dataParts.join("\n") }
      : null;

  return { complete, incomplete };
}

/** When server emits one `data: {...}` per line without `\n\n` between events */
export function parseDataLineFallback(raw: string): ParsedSseEvent[] {
  return raw
    .split(/\r?\n/)
    .filter((l) => l.startsWith("data:"))
    .map((l) => ({ data: l.slice(5).trimStart() }));
}

/**
 * Events for rendering: prefers blank-line SSE framing when present; otherwise
 * treats each `data:` line as one message (common for simple streams).
 */
export function sseEventsFromRaw(raw: string): ParsedSseEvent[] {
  if (!raw.trim()) return [];
  if (/\r?\n\r?\n/.test(raw)) {
    const { complete, incomplete } = parseSseBuffer(raw);
    const out = [...complete];
    if (incomplete?.data.trim().length || incomplete?.event) {
      out.push({
        event: incomplete.event,
        data: incomplete.data,
      });
    }
    return out;
  }
  return parseDataLineFallback(raw).filter((e) => e.data.length > 0);
}
