"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Status = "loading" | "ready" | "error";
const FINISH_PROMPT_CLOSE_DELAY_MS = 180;

// Reader text size is a global preference (not per-book), stored as a percentage
// applied via epub.js `themes.fontSize`. CFI-based progress is font-independent,
// so changing it never desyncs the progress bar.
const FONT_KEY = "epub-fontsize";
const FONT_MIN = 70;
const FONT_MAX = 180;
const FONT_STEP = 10;
function readStoredFont(): number {
  try {
    const v = Number(localStorage.getItem(FONT_KEY));
    return v >= FONT_MIN && v <= FONT_MAX ? v : 100;
  } catch {
    return 100;
  }
}

// epub.js theme defs shared by all three render layers.
const THEME_LIGHT = {
  body: { background: "#faf8f3 !important", color: "#1c1917 !important" },
  a: { color: "#8b5e34 !important" },
};
const THEME_DARK = {
  body: { background: "#1a1714 !important", color: "#d4ccc0 !important" },
  a: { color: "#b8895c !important" },
};

export function ReaderView({
  bookId,
  initialCfi,
}: {
  bookId: string;
  initialCfi: string | null;
}) {
  // Front = the page you're reading; back = the next page revealed under the
  // curl; mirror = a second copy of the front page, reflected across the fold to
  // become the curling page's backside (the reversed text, like Apple Books).
  const frontWrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const backContainerRef = useRef<HTMLDivElement>(null);
  const flapRef = useRef<HTMLDivElement>(null);
  const mirrorContainerRef = useRef<HTMLDivElement>(null);
  const foldShadowRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renditionRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backRenditionRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mirrorRenditionRef = useRef<any>(null);

  const turningRef = useRef(false);
  // True while the back layer is showing the previous page (staged for a
  // backward curl) instead of its usual next page.
  const prevStagedRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishPromptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [progress, setProgress] = useState(0);
  const [fontPct, setFontPct] = useState(100);
  const [showTextPanel, setShowTextPanel] = useState(false);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  const finishStateRef = useRef<"idle" | "done">("idle");
  const [showFinishPrompt, setShowFinishPrompt] = useState(false);
  const [finishPromptVisible, setFinishPromptVisible] = useState(false);

  useEffect(() => {
    if (!showFinishPrompt) return;
    const frame = requestAnimationFrame(() => setFinishPromptVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [showFinishPrompt]);

  useEffect(() => {
    return () => {
      if (finishPromptTimerRef.current) clearTimeout(finishPromptTimerRef.current);
    };
  }, []);

  const closeFinishPrompt = useCallback(() => {
    setFinishPromptVisible(false);
    if (finishPromptTimerRef.current) clearTimeout(finishPromptTimerRef.current);
    finishPromptTimerRef.current = setTimeout(() => {
      setShowFinishPrompt(false);
    }, FINISH_PROMPT_CLOSE_DELAY_MS);
  }, []);

  const maybePromptFinish = useCallback((pct: number) => {
    if (pct >= 0.99 && finishStateRef.current === "idle") {
      setShowFinishPrompt(true);
    }
  }, []);

  const confirmFinished = useCallback(() => {
    finishStateRef.current = "done";
    closeFinishPrompt();
    fetch(`/api/books/${bookId}/shelf`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "FINISHED" }),
    });
  }, [bookId, closeFinishPrompt]);

  const dismissFinished = useCallback(() => {
    finishStateRef.current = "done";
    closeFinishPrompt();
  }, [closeFinishPrompt]);

  const saveProgress = useCallback(
    (cfi: string, pct: number) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        fetch(`/api/books/${bookId}/progress`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cfi, progress: pct }),
        });
      }, 1500);
    },
    [bookId],
  );

  // Keep the hidden layers in step with the front page: mirror shows the same
  // page (it's the curl's backside), back shows the page after it.
  const syncLayers = useCallback(async () => {
    const front = renditionRef.current;
    const back = backRenditionRef.current;
    const mirror = mirrorRenditionRef.current;
    if (!front) return;
    try {
      const loc = await front.currentLocation();
      const startCfi = loc?.start?.cfi as string | undefined;
      if (!startCfi) return;
      if (mirror) await mirror.display(startCfi);
      if (back) {
        await back.display(startCfi);
        await back.next(); // advance the back layer one page past the front
      }
      prevStagedRef.current = false;
    } catch {
      /* a layer failed to sync — the curl just shows blank there, no crash */
    }
  }, []);

  // Stage the back layer to show the *previous* page, so a backward curl peels
  // the current page away to reveal it. The inverse of syncLayers' back = next.
  const stagePrev = useCallback(async () => {
    const front = renditionRef.current;
    const back = backRenditionRef.current;
    if (!front || !back) return;
    try {
      const loc = await front.currentLocation();
      const startCfi = loc?.start?.cfi as string | undefined;
      if (!startCfi) return;
      await back.display(startCfi);
      await back.prev(); // pull the back layer one page before the front
      prevStagedRef.current = true;
    } catch {
      /* a layer failed to sync — the curl just shows blank there, no crash */
    }
  }, []);

  // ---- the fold geometry ----
  // A vertical page lift (Apple Books style). `prog` runs 0 (flat) → 1 (fully
  // turned). A vertical crease sits at x = c; the lifted half of the page folds
  // over across the crease, showing its mirrored backside, and reveals the
  // adjacent page underneath. The whole figure is mirrored for a backward turn:
  //  - "next": crease sweeps right→left, current page lifts from its right edge
  //    and curls left, revealing the next page on the right.
  //  - "prev": crease sweeps left→right, current page lifts from its left edge
  //    and curls right, revealing the previous page on the left.
  const applyFold = useCallback(
    (prog: number, dir: "next" | "prev" = "next") => {
      const front = frontWrapRef.current;
      const flap = flapRef.current;
      const mirror = mirrorContainerRef.current;
      const shadow = foldShadowRef.current;
      if (!front || !flap || !mirror) return;
      const W = front.clientWidth || window.innerWidth;

      if (prog <= 0.003) {
        front.style.clipPath = "";
        flap.style.opacity = "0";
        flap.style.clipPath = "polygon(0 0, 0 0, 0 0)";
        if (shadow) {
          shadow.style.opacity = "0";
          shadow.style.transform = "";
        }
        return;
      }
      const p = Math.min(1, prog);

      if (dir === "next") {
        const c = W * (1 - p); // crease x, sweeps W → 0
        const grab = 2 * c - W; // where the folded right edge now lies
        // Current page: only the flat part left of the crease.
        front.style.clipPath = `polygon(0px 0%, ${c}px 0%, ${c}px 100%, 0px 100%)`;
        // Backside flap: the folded strip [grab..c], a copy of the page
        // reflected across the crease (x → 2c - x).
        flap.style.clipPath = `polygon(${grab}px 0%, ${c}px 0%, ${c}px 100%, ${grab}px 100%)`;
        mirror.style.transform = `matrix(-1, 0, 0, 1, ${2 * c}, 0)`;
        // Soft shadow the lifted page casts onto the next page, starting at the
        // crease and fading right (its own gradient spans this width).
        if (shadow) {
          shadow.style.left = `${c}px`;
          shadow.style.width = `${W * 0.16}px`;
          shadow.style.transform = "";
        }
      } else {
        const c = W * p; // crease x, sweeps 0 → W
        const grab = 2 * c; // where the folded left edge now lies
        // Current page: only the flat part right of the crease.
        front.style.clipPath = `polygon(${c}px 0%, ${W}px 0%, ${W}px 100%, ${c}px 100%)`;
        // Backside flap: the folded strip [c..grab], reflected across the crease.
        flap.style.clipPath = `polygon(${c}px 0%, ${grab}px 0%, ${grab}px 100%, ${c}px 100%)`;
        mirror.style.transform = `matrix(-1, 0, 0, 1, ${2 * c}, 0)`;
        // Shadow falls on the revealed previous page, left of the crease;
        // flip it so the dark edge sits at the crease and fades left.
        if (shadow) {
          shadow.style.left = `${c - W * 0.16}px`;
          shadow.style.width = `${W * 0.16}px`;
          shadow.style.transform = "scaleX(-1)";
        }
      }
      flap.style.opacity = "1";
      if (shadow) shadow.style.opacity = "1";
    },
    [],
  );

  const animateFold = useCallback(
    (from: number, to: number, ms: number, dir: "next" | "prev" = "next") =>
      new Promise<void>((resolve) => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        const start = performance.now();
        const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / ms);
          applyFold(from + (to - from) * ease(t), dir);
          if (t < 1) {
            rafRef.current = requestAnimationFrame(step);
          } else {
            rafRef.current = null;
            resolve();
          }
        };
        rafRef.current = requestAnimationFrame(step);
      }),
    [applyFold],
  );

  // Commit a forward turn: finish the curl, swap the front page, then re-sync the
  // hidden layers and lay the fold flat again.
  const commitNext = useCallback(
    async (fromProg = 0) => {
      const front = renditionRef.current;
      if (!front || turningRef.current) return;
      turningRef.current = true;
      try {
        const reduce = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        if (!reduce) await animateFold(fromProg, 1, 280);
        await front.next();
        applyFold(0); // new front page is live; drop the fold instantly
        await syncLayers();
      } catch (e) {
        console.error("Page turn failed:", e);
        applyFold(0);
      } finally {
        turningRef.current = false;
      }
    },
    [animateFold, applyFold, syncLayers],
  );

  const cancelFold = useCallback(
    (fromProg: number) => animateFold(fromProg, 0, 200),
    [animateFold],
  );

  // Spring a partial backward curl back to flat, then restore the back layer to
  // its usual next page (the prev curl had staged the previous page there).
  const cancelPrev = useCallback(
    async (fromProg: number) => {
      await animateFold(fromProg, 0, 200, "prev");
      await syncLayers();
    },
    [animateFold, syncLayers],
  );

  // Commit a backward turn: the exact mirror of commitNext. Stage the previous
  // page under the curl, finish the peel, swap the front page back one, then
  // re-sync the hidden layers and lay the fold flat again.
  const commitPrev = useCallback(
    async (fromProg = 0) => {
      const front = renditionRef.current;
      if (!front || turningRef.current) return;
      turningRef.current = true;
      try {
        const reduce = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        if (!prevStagedRef.current) await stagePrev();
        if (!reduce) await animateFold(fromProg, 1, 280, "prev");
        await front.prev();
        applyFold(0, "prev"); // new front page is live; drop the fold instantly
        await syncLayers();
      } catch (e) {
        console.error("Page turn failed:", e);
        applyFold(0, "prev");
        await syncLayers();
      } finally {
        turningRef.current = false;
      }
    },
    [animateFold, applyFold, stagePrev, syncLayers],
  );

  const goNext = useCallback(() => commitNext(0), [commitNext]);
  const goPrev = useCallback(() => commitPrev(0), [commitPrev]);

  // Apply a new text size to all three layers and re-anchor to the same CFI.
  const changeFont = useCallback(
    async (next: number) => {
      const clamped = Math.min(FONT_MAX, Math.max(FONT_MIN, next));
      setFontPct(clamped);
      try {
        localStorage.setItem(FONT_KEY, String(clamped));
      } catch {
        /* storage unavailable — size still applies in-memory */
      }
      const front = renditionRef.current;
      if (!front) return;
      for (const r of [
        front,
        backRenditionRef.current,
        mirrorRenditionRef.current,
      ]) {
        r?.themes.fontSize(`${clamped}%`);
      }
      try {
        const loc = await front.currentLocation();
        const cfi = loc?.start?.cfi as string | undefined;
        if (cfi) await front.display(cfi);
        await syncLayers();
      } catch {
        /* keep current view if re-anchor fails */
      }
    },
    [syncLayers],
  );

  // Reflect the stored size in the UI on mount (localStorage is client-only).
  useEffect(() => {
    setFontPct(readStoredFont());
  }, []);

  // Arrow keys turn pages.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  // Gesture: a transparent overlay captures the touch in the parent document.
  // Dragging curls the page open under your finger — left for the next page,
  // right for the previous — and releasing past a threshold completes the turn,
  // otherwise it springs back. There is no tap-to-turn.
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    let sx = 0;
    let sy = 0;
    let active = false;
    let decided = false;
    let horizontal = false;
    let dir: "next" | "prev" = "next";
    let staging = false;
    const SLOP = 8;

    // Drag distance → fold progress. Dragging ~70% of the page width completes a
    // full turn; magnitude is the same in both directions.
    const progFromDrag = (dx: number) => {
      const W = frontWrapRef.current?.clientWidth || window.innerWidth;
      return Math.max(0, Math.min(1, Math.abs(dx) / (W * 0.7)));
    };

    const onStart = (e: TouchEvent) => {
      if (turningRef.current || e.touches.length !== 1) return;
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      active = true;
      decided = false;
      horizontal = false;
      staging = false;
    };
    const onMove = (e: TouchEvent) => {
      if (!active) return;
      const dx = e.touches[0].clientX - sx;
      const dy = e.touches[0].clientY - sy;
      if (!decided) {
        if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
        decided = true;
        horizontal = Math.abs(dx) > Math.abs(dy);
        if (!horizontal) {
          active = false;
          return;
        }
        dir = dx < 0 ? "next" : "prev";
      }
      e.preventDefault();
      if (dir === "next") {
        applyFold(progFromDrag(dx), "next");
      } else {
        // Stage the previous page under the curl once, then track the finger.
        // Until the back layer is ready, hold the page flat to avoid a flash.
        if (!prevStagedRef.current && !staging) {
          staging = true;
          stagePrev().finally(() => {
            staging = false;
          });
        }
        if (prevStagedRef.current) applyFold(progFromDrag(dx), "prev");
      }
    };
    const onEnd = (e: TouchEvent) => {
      if (!active) return;
      active = false;
      const W = frontWrapRef.current?.clientWidth || window.innerWidth;

      // Taps no longer turn pages: only a committed horizontal drag does.
      if (!decided || !horizontal) return;

      const dx = (e.changedTouches[0]?.clientX ?? sx) - sx;
      const prog = progFromDrag(dx);
      // Past ~35% of a full turn (or a fast flick) commits; else spring back.
      const committed = prog > 0.35 || Math.abs(dx) > W * 0.45;
      if (dir === "prev") {
        if (committed) commitPrev(prog);
        else cancelPrev(prog);
      } else {
        if (committed) commitNext(prog);
        else cancelFold(prog);
      }
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [
    applyFold,
    cancelFold,
    cancelPrev,
    commitNext,
    commitPrev,
    stagePrev,
    status,
  ]);

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;
    let cleanupFn: (() => void) | undefined;

    async function init() {
      try {
        const Epub = (await import("epubjs")).default;
        if (destroyed || !containerRef.current) return;

        // Fetch the EPUB as a binary buffer — passing a URL would cause epub.js
        // to treat it as a directory and request individual files from it.
        const res = await fetch(`/api/books/${bookId}/epub`);
        if (!res.ok) throw new Error(`Failed to fetch EPUB: ${res.status}`);
        const arrayBuffer = await res.arrayBuffer();
        if (destroyed || !containerRef.current) return;

        const book = Epub(arrayBuffer as unknown as string);
        await book.ready;
        if (
          destroyed ||
          !containerRef.current ||
          !backContainerRef.current ||
          !mirrorContainerRef.current
        )
          return;

        const { clientWidth, clientHeight } = containerRef.current;
        const width = clientWidth || window.innerWidth;
        const height = clientHeight || window.innerHeight - 120;
        const opts = {
          width,
          height,
          spread: "none" as const,
          flow: "paginated" as const,
        };

        const darkMql = window.matchMedia("(prefers-color-scheme: dark)");
        const storedFont = readStoredFont();

        // Shared per-section setup: theming, saved font size, page-break rules,
        // and a hard scroll/zoom lock so our gestures own all touch.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const setup = (r: any) => {
          r.themes.register("light", THEME_LIGHT);
          r.themes.register("dark", THEME_DARK);
          r.themes.select(darkMql.matches ? "dark" : "light");
          r.themes.fontSize(`${storedFont}%`);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          r.hooks.content.register((contents: any) => {
            const doc: Document = contents.document;
            const style = doc.createElement("style");
            style.textContent =
              "h1, h2, h3 { break-before: column !important; column-break-before: always !important; }" +
              "html, body { overscroll-behavior: none !important; touch-action: none !important; -webkit-user-select: none !important; user-select: none !important; -webkit-tap-highlight-color: transparent; }";
            doc.head.appendChild(style);
          });
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rendition = book.renderTo(containerRef.current as any, opts);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const backRendition = book.renderTo(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          backContainerRef.current as any,
          opts,
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mirrorRendition = book.renderTo(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mirrorContainerRef.current as any,
          opts,
        );
        renditionRef.current = rendition;
        backRenditionRef.current = backRendition;
        mirrorRenditionRef.current = mirrorRendition;
        setup(rendition);
        setup(backRendition);
        setup(mirrorRendition);

        const applyTheme = () => {
          const t = darkMql.matches ? "dark" : "light";
          rendition.themes.select(t);
          backRendition.themes.select(t);
          mirrorRendition.themes.select(t);
        };
        darkMql.addEventListener("change", applyTheme);

        await rendition.display(initialCfi ?? undefined);
        if (destroyed) return;
        setStatus("ready");

        // Prime the hidden layers off the first page.
        syncLayers();

        const pctFromCfi = (cfi: string): number => {
          try {
            if (book.locations?.length?.()) {
              return (book.locations.percentageFromCfi(cfi) as number) ?? 0;
            }
          } catch {
            /* CFI not resolvable against the index yet */
          }
          return 0;
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rendition.on("relocated", (location: any) => {
          const cfi = location?.start?.cfi as string | undefined;
          if (!cfi) return;
          const pct = pctFromCfi(cfi);
          setProgress(pct);
          saveProgress(cfi, pct);
          maybePromptFinish(pct);
        });

        // Build the locations index in the background (parsing the whole book is
        // slow, so do it after first paint). Cache it in localStorage so reopens
        // are instant. Once ready, refresh % from the current position.
        const locationsKey = `epub-locations:${bookId}`;
        (async () => {
          try {
            const cached =
              typeof localStorage !== "undefined"
                ? localStorage.getItem(locationsKey)
                : null;
            if (cached) {
              book.locations.load(cached);
            } else {
              await book.locations.generate(1024);
              if (destroyed) return;
              try {
                localStorage.setItem(locationsKey, book.locations.save());
              } catch {
                /* storage full / unavailable — index still works in-memory */
              }
            }
            if (destroyed) return;
            const loc = await rendition.currentLocation();
            const cfi = (loc as { start?: { cfi?: string } })?.start?.cfi;
            if (cfi) {
              const pct = pctFromCfi(cfi);
              setProgress(pct);
              saveProgress(cfi, pct);
              maybePromptFinish(pct);
            }
          } catch (e) {
            console.error("Failed to build locations index:", e);
          }
        })();

        cleanupFn = () => {
          darkMql.removeEventListener("change", applyTheme);
          rendition.destroy();
          backRendition.destroy();
          mirrorRendition.destroy();
          book.destroy();
        };
      } catch (err) {
        if (!destroyed) {
          console.error("Reader failed to load:", err);
          setError((err as Error).message ?? "Failed to load book.");
          setStatus("error");
        }
      }
    }

    init();

    return () => {
      destroyed = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      cleanupFn?.();
    };
  }, [bookId, initialCfi, saveProgress, maybePromptFinish, syncLayers]);

  // Reading-session timer. Accumulates "active" seconds — counted only while the
  // tab is visible and the reader has seen interaction recently (page turns,
  // taps, keys) — and flushes them to the server as ReadingSession rows. Idle
  // time (walked away with the book open) past IDLE_MS stops counting.
  useEffect(() => {
    const IDLE_MS = 180_000; // 3 min without interaction → assume away
    const FLUSH_MS = 30_000;
    let active = 0; // seconds accumulated since the last flush
    let lastActivity = Date.now();
    const markActivity = () => {
      lastActivity = Date.now();
    };

    const tick = setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastActivity < IDLE_MS
      ) {
        active += 1;
      }
    }, 1000);

    const flush = (useBeacon = false) => {
      const seconds = active;
      if (seconds < 1) return;
      active = 0;
      const url = `/api/books/${bookId}/session`;
      const body = JSON.stringify({ seconds });
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      } else {
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
      }
    };

    const flushTimer = setInterval(() => flush(false), FLUSH_MS);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush(true);
      else markActivity();
    };
    const onPageHide = () => flush(true);

    document.addEventListener("pointerdown", markActivity);
    document.addEventListener("keydown", markActivity);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      clearInterval(tick);
      clearInterval(flushTimer);
      document.removeEventListener("pointerdown", markActivity);
      document.removeEventListener("keydown", markActivity);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      flush(true);
    };
  }, [bookId]);

  return (
    <div className="flex h-full flex-col bg-paper">
      {/* Progress bar */}
      <div className="h-0.5 shrink-0 bg-accent/10">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Reader area */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* Layer 0: the next page, revealed in the peeled corner. */}
        <div ref={backContainerRef} className="absolute inset-0" />

        {/* Layer 1: the current page, clipped along the fold while curling. */}
        <div
          ref={frontWrapRef}
          className="absolute inset-0 [will-change:clip-path,opacity]"
        >
          <div ref={containerRef} className="absolute inset-0" />
        </div>

        {/* Layer 2: the curling page's backside — a reflected copy of the current
            page (reversed text) plus a paper sheen/shadow, clipped to the fold. */}
        <div
          ref={flapRef}
          className="pointer-events-none absolute inset-0 opacity-0 [will-change:clip-path,opacity]"
        >
          <div
            ref={mirrorContainerRef}
            className="absolute inset-0 origin-top-left"
          />
          {/* Paper tint dims the reversed text so it reads like the back of a
              sheet; the gradient shades it darker toward the grabbed edge and
              adds a sheen highlight along the crease. */}
          <div className="absolute inset-0 bg-paper/45" />
          <div className="absolute inset-0 bg-gradient-to-l from-white/20 via-black/10 to-black/30" />
        </div>

        {/* Soft shadow the lifted page casts onto the next page, anchored at the
            crease (left/width set in applyFold) and fading right. */}
        <div
          ref={foldShadowRef}
          className="pointer-events-none absolute bottom-0 left-0 top-0 w-0 bg-gradient-to-r from-black/35 to-transparent opacity-0"
        />

        {/* Transparent gesture layer — captures swipes/taps in the parent
            document and stops the browser from scrolling/zooming. */}
        {status === "ready" && (
          <div ref={overlayRef} className="absolute inset-0 z-10 touch-none" />
        )}

        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-ink/40">
            Loading…
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="text-sm font-medium text-red-600">Failed to load book</p>
            <p className="text-xs text-ink/50">{error}</p>
          </div>
        )}

        {/* Finished-confirmation prompt — appears once near the end of the book */}
        {showFinishPrompt && (
          <div
            className={`absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-3 border-t border-accent/20 bg-paper/95 px-6 py-5 text-center shadow-lg backdrop-blur transition-[opacity,transform] duration-200 ease-out ${
              finishPromptVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <p className="text-sm font-medium text-ink/80">
              Looks like you reached the end. Mark this book as finished?
            </p>
            <div className="flex gap-3">
              <button
                onClick={dismissFinished}
                className="rounded-lg border border-accent/20 px-4 py-2 text-sm text-ink/70 transition-colors hover:border-accent"
              >
                Not yet
              </button>
              <button
                onClick={confirmFinished}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
              >
                Mark finished
              </button>
            </div>
          </div>
        )}

        {/* Text-size control */}
        {status === "ready" && (
          <div className="absolute right-3 top-3 z-20">
            <button
              type="button"
              onClick={() => setShowTextPanel((s) => !s)}
              aria-label="Text size"
              aria-expanded={showTextPanel}
              className="flex h-9 w-9 items-end justify-center gap-px rounded-full border border-accent/20 bg-paper/85 pb-2 text-ink/70 shadow-sm backdrop-blur transition-colors hover:border-accent active:bg-accent/10"
            >
              <span className="text-[10px] font-bold leading-none">A</span>
              <span className="text-base font-bold leading-none">A</span>
            </button>

            {showTextPanel && (
              <div className="absolute right-0 top-11 flex items-center gap-1 rounded-xl border border-accent/20 bg-paper/95 p-1 shadow-lg backdrop-blur">
                <button
                  type="button"
                  onClick={() => changeFont(fontPct - FONT_STEP)}
                  disabled={fontPct <= FONT_MIN}
                  aria-label="Decrease text size"
                  className="flex h-9 w-10 items-baseline justify-center rounded-lg text-ink/70 transition-colors hover:bg-accent/10 disabled:opacity-30"
                >
                  <span className="text-sm font-semibold">A</span>
                  <span className="text-[11px]">−</span>
                </button>
                <span className="w-11 text-center text-xs tabular-nums text-ink/60">
                  {fontPct}%
                </span>
                <button
                  type="button"
                  onClick={() => changeFont(fontPct + FONT_STEP)}
                  disabled={fontPct >= FONT_MAX}
                  aria-label="Increase text size"
                  className="flex h-9 w-10 items-baseline justify-center rounded-lg text-ink/70 transition-colors hover:bg-accent/10 disabled:opacity-30"
                >
                  <span className="text-base font-semibold">A</span>
                  <span className="text-[11px]">+</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="flex shrink-0 items-center justify-between border-t border-accent/10 px-4 py-3">
        <button
          onClick={goPrev}
          disabled={status !== "ready"}
          className="rounded-lg border border-accent/20 px-4 py-2 text-sm text-ink/70 transition-colors hover:border-accent disabled:opacity-40"
        >
          ← Prev
        </button>
        <span className="text-xs text-ink/40">{Math.round(progress * 100)}%</span>
        <button
          onClick={goNext}
          disabled={status !== "ready"}
          className="rounded-lg border border-accent/20 px-4 py-2 text-sm text-ink/70 transition-colors hover:border-accent disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
