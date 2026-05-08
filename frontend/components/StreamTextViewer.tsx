import React, { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { sseEventsFromRaw } from "../utils/sseParse";
import { JsonDisplay } from "./JsonDisplay";

export type StreamTextViewerProps = {
  text: string;
  contentType?: string;
  className?: string;
};

function tryParseJson(s: string): unknown | null {
  const t = s.trim();
  if (!t) return null;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return null;
  }
}

/** NDJSON: ทุกบรรทัดเป็น JSON — คืน null ถ้ามีบรรทัดที่ parse ไม่ได้ */
function tryParseNdjsonLines(text: string): unknown[] | null {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const out: unknown[] = [];
  for (const line of lines) {
    try {
      out.push(JSON.parse(line) as unknown);
    } catch {
      return null;
    }
  }
  return out;
}

/**
 * สร้างค่าให้ JsonDisplay: SSE = อาเรย์ของวัตถุที่ parse จากแต่ละ data:
 * ข้อความอื่นที่เป็นสตรีม = NDJSON หรือ JSON ก้อนเดียว
 */
function streamTextToJsonPayload(
  text: string,
  contentType: string
): { data: unknown; fallbackText: string | null } {
  const isSse = contentType.includes("text/event-stream");

  if (isSse) {
    const events = sseEventsFromRaw(text);
    const items = events.map((ev) => {
      const parsed = tryParseJson(ev.data);
      if (parsed !== null) return parsed;
      return { _unparsed: ev.data };
    });
    if (items.length === 0 && text.trim().length > 0) {
      return { data: null, fallbackText: text };
    }
    return { data: items, fallbackText: null };
  }

  const nd = tryParseNdjsonLines(text);
  if (nd !== null && nd.length > 0) {
    return nd.length === 1 ? { data: nd[0]!, fallbackText: null } : { data: nd, fallbackText: null };
  }

  const whole = tryParseJson(text);
  if (whole !== null) {
    return { data: whole, fallbackText: null };
  }

  return { data: null, fallbackText: text };
}

const BOTTOM_THRESHOLD = 96;

export const StreamTextViewer: React.FC<StreamTextViewerProps> = ({
  text,
  contentType = "",
  className = "",
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(0);
  const [stickToBottom, setStickToBottom] = useState(true);
  const stickToBottomRef = useRef(true);
  const suppressScrollDetachRef = useRef(false);
  const rafScroll = useRef(0);

  const { data, fallbackText } = useMemo(
    () => streamTextToJsonPayload(text, contentType),
    [text, contentType]
  );

  stickToBottomRef.current = stickToBottom;

  /** เลื่อนลงจริง ๆ หลัง layout (รองรับสตรีมเร็ว + JsonDisplay เปลี่ยนสูง) */
  const applyStickyScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !stickToBottomRef.current) return;

    suppressScrollDetachRef.current = true;
    const run = () => {
      el.scrollTop = el.scrollHeight;
    };
    /** ซ้อน rAF เพื่อรอ scrollHeight อัปเดตจาก paint ครั้งถัดไป */
    requestAnimationFrame(() => {
      run();
      requestAnimationFrame(() => {
        run();
        requestAnimationFrame(() => {
          suppressScrollDetachRef.current = false;
        });
      });
    });
  }, []);

  useEffect(() => {
    const prev = prevLenRef.current;
    if (prev > 200 && text.length < prev * 0.4) {
      setStickToBottom(true);
    }
    prevLenRef.current = text.length;
  }, [text]);

  useEffect(() => {
    if (!stickToBottom) return;
    applyStickyScroll();
  }, [text, stickToBottom, data, fallbackText, applyStickyScroll]);

  /** ความสูงภายในเปลี่ยนต่อเนื่องระหว่างสตรีม → เกาะขอบล่าง */
  useEffect(() => {
    const outer = scrollRef.current;
    const inner = contentRef.current;
    if (!outer || !inner) return;

    let roRaf = 0;
    const onResize = () => {
      if (!stickToBottomRef.current) return;
      cancelAnimationFrame(roRaf);
      roRaf = requestAnimationFrame(() => applyStickyScroll());
    };

    const ro = new ResizeObserver(onResize);
    ro.observe(inner);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(roRaf);
    };
  }, [applyStickyScroll]);

  const handleScroll = useCallback(() => {
    if (suppressScrollDetachRef.current) return;
    if (rafScroll.current) return;
    rafScroll.current = requestAnimationFrame(() => {
      rafScroll.current = 0;
      const el = scrollRef.current;
      if (!el) return;
      const nearBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD;
      setStickToBottom((s) => (s !== nearBottom ? nearBottom : s));
    });
  }, []);

  const scrollToBottom = useCallback(() => {
    setStickToBottom(true);
    stickToBottomRef.current = true;
    applyStickyScroll();
  }, [applyStickyScroll]);

  const isEmpty = !text.trim();

  return (
    <div className={`relative min-h-0 flex flex-col flex-1 ${className}`}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar pb-14"
      >
        <div ref={contentRef} className="p-4 min-h-full">
          {isEmpty ? (
            <p className="text-xs text-zinc-500 animate-pulse font-mono">
              กำลังรับสตรีม…
            </p>
          ) : fallbackText !== null ? (
            <pre className="whitespace-pre-wrap wrap-break-word font-mono text-xs text-zinc-800 dark:text-zinc-200">
              {fallbackText}
            </pre>
          ) : (
            <JsonDisplay data={data} />
          )}
        </div>
      </div>

      {!stickToBottom && text.length > 0 && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium shadow-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <ChevronDown size={14} className="opacity-70" />
          เลื่อนลงล่าง
        </button>
      )}
    </div>
  );
};
