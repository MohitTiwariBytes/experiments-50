import React, { useEffect, useRef, useState, Children } from "react";

/**
 * Props:
 *
 *  children        — any React nodes
 *  baseSpeed       — px/s (default 120)
 *  baseDirection   — "left" | "right" (default "left")
 *  curveBend       — arc depth in pixels
 *                    positive = U-shape down
 *                    negative = arch up (default 120)
 *  gap             — horizontal gap between items in px (default 48)
 *  bottomPadding   — extra bottom padding for positive curve, in px (default 40)
 *                    stacks on top of the auto-computed item-height guard
 *  negativeClipPad — extra px added above the auto clip-guard for negative curves (default 20)
 */
export default function CurveMarquee({
  children,
  baseSpeed = 120,
  baseDirection = "left",
  curveBend = 120,
  gap = 48,
  bottomPadding = 40,
  negativeClipPad = 20,
}) {
  const containerRef = useRef(null);
  const measureRef = useRef(null);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);
  const scrollRef = useRef(0);

  const dirMap = { left: -1, right: 1 };
  const baseDirVal = dirMap[baseDirection] ?? -1;
  const oppDirVal = baseDirVal * -1;
  const dirRef = useRef(baseDirVal);
  const lastScrollY = useRef(
    typeof window !== "undefined" ? window.scrollY : 0,
  );
  const isTouchDevice =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  // ─── Bezier arc math ────────────────────────────────────────────────────────

  function bzPt(t, W, bend) {
    const cx = W / 2,
      cy = bend;
    return {
      x: (1 - t) ** 2 * 0 + 2 * (1 - t) * t * cx + t ** 2 * W,
      y: (1 - t) ** 2 * 0 + 2 * (1 - t) * t * cy + t ** 2 * 0,
    };
  }

  function bzAngle(t, W, bend) {
    const cx = W / 2,
      cy = bend;
    const dx = 2 * (1 - t) * cx + 2 * t * (W - cx);
    const dy = 2 * (1 - t) * cy + 2 * t * (0 - cy);
    return Math.atan2(dy, dx);
  }

  function buildLUT(W, bend, samples = 800) {
    const lut = [{ s: 0, t: 0 }];
    let prev = bzPt(0, W, bend),
      cum = 0;
    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      const p = bzPt(t, W, bend);
      cum += Math.hypot(p.x - prev.x, p.y - prev.y);
      lut.push({ s: cum, t });
      prev = p;
    }
    return lut;
  }

  function sampleLUT(lut, s, W, bend, itemW = 0) {
    const total = lut[lut.length - 1].s;
    const OFFSCREEN = itemW + 200;

    if (s < 0) {
      const angle = bzAngle(0, W, bend);
      const origin = bzPt(0, W, bend);
      const x = origin.x + Math.cos(angle) * s;
      const y = origin.y + Math.sin(angle) * s;
      if (x < -OFFSCREEN) return null;
      return { x, y, angle };
    }

    if (s > total) {
      const angle = bzAngle(1, W, bend);
      const end = bzPt(1, W, bend);
      const excess = s - total;
      const x = end.x + Math.cos(angle) * excess;
      const y = end.y + Math.sin(angle) * excess;
      if (x > W + OFFSCREEN) return null;
      return { x, y, angle };
    }

    let lo = 0,
      hi = lut.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      lut[mid].s <= s ? (lo = mid) : (hi = mid);
    }
    const { s: sa, t: ta } = lut[lo];
    const { s: sb, t: tb } = lut[hi];
    const frac = sb === sa ? 0 : (s - sa) / (sb - sa);
    const t = ta + frac * (tb - ta);
    return { ...bzPt(t, W, bend), angle: bzAngle(t, W, bend) };
  }

  // ─── Refs ────────────────────────────────────────────────────────────────────

  const lutRef = useRef(null);
  const arcLenRef = useRef(0);
  const widthsRef = useRef([]);
  const heightsRef = useRef([]); // ← track item heights
  const groupWRef = useRef(0);
  const cWRef = useRef(0);
  const copiesRef = useRef(0);

  const [ready, setReady] = useState(false);
  const [renderTick, setRenderTick] = useState(0);

  // ─── Measure & init ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    function init() {
      if (cancelled) return;
      const measure = measureRef.current;
      const container = containerRef.current;
      if (!measure || !container) {
        requestAnimationFrame(init);
        return;
      }

      const els = Array.from(measure.children);
      const widths = els.map((el) => el.getBoundingClientRect().width);
      const heights = els.map((el) => el.getBoundingClientRect().height);

      if (!widths.length || widths.some((w) => w === 0)) {
        requestAnimationFrame(init);
        return;
      }

      const groupW = widths.reduce((a, b) => a + b, 0);
      widthsRef.current = widths;
      heightsRef.current = heights;
      groupWRef.current = groupW;

      const cW = container.offsetWidth || window.innerWidth;
      cWRef.current = cW;

      const lut = buildLUT(cW, curveBend);
      const arcLen = lut[lut.length - 1].s;
      lutRef.current = lut;
      arcLenRef.current = arcLen;

      copiesRef.current = Math.ceil(arcLen / groupW) + 2;

      setReady(true);
    }

    requestAnimationFrame(init);
    return () => {
      cancelled = true;
    };
  }, [curveBend]);

  // ─── Scroll boost ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isTouchDevice) return;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastScrollY.current;
      lastScrollY.current = y;
      if (!dy) return;
      dirRef.current = dy > 0 ? oppDirVal : baseDirVal;
      scrollRef.current += dirRef.current * Math.abs(dy) * 0.4;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [baseDirVal, oppDirVal, isTouchDevice]);

  // ─── Animation loop ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!ready) return;
    const step = (now) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;
      scrollRef.current += dirRef.current * baseSpeed * dt;
      setRenderTick((t) => (t + 1) & 0xffffff);
      rafRef.current = requestAnimationFrame(step);
    };
    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, baseSpeed]);

  // ─── Compute positions ───────────────────────────────────────────────────────

  const childArray = Children.toArray(children);

  const positions = (() => {
    if (!ready || !lutRef.current) return [];

    const lut = lutRef.current;
    const W = cWRef.current;
    const bend = curveBend;
    const widths = widthsRef.current;
    const groupW = groupWRef.current;
    const copies = copiesRef.current;

    const phase = ((scrollRef.current % groupW) + groupW) % groupW;
    const out = [];

    for (let copy = -1; copy <= copies; copy++) {
      let arcLeft = copy * groupW - phase;

      for (let ci = 0; ci < widths.length; ci++) {
        const w = widths[ci];
        const sMid = arcLeft + w / 2;
        const pt = sampleLUT(lut, sMid, W, bend, w);

        if (pt) {
          out.push({
            key: `${copy}-${ci}`,
            childIdx: ci,
            x: pt.x,
            y: pt.y,
            angle: pt.angle,
            w,
          });
        }

        arcLeft += w;
      }
    }

    return out;
  })();

  // ─── Container height & vertical offset ─────────────────────────────────────
  //
  //  Positive bend (U-shape down):
  //    • Arc peak is at y=0 (the ends), trough at y=curveBend (center).
  //    • Items sit ON the arc, so the bottom-most item edge is at
  //        curveBend + maxItemHeight.
  //    • We add a `bottomPadding` prop as a user-controlled breathing room.
  //
  //  Negative bend (arch up):
  //    • Arc peak is at y=curveBend (negative → above y=0).
  //    • We shift the whole canvas DOWN by |curveBend| so the peak doesn't
  //      clip above the container top (yOffset = |curveBend|).
  //    • The container must then be tall enough for:
  //        |curveBend|          — the downward shift
  //      + maxItemHeight        — tallest item at the arch tip
  //      + negativeClipPad      — user-controlled extra guard
  //      + bottomPadding        — breathing room at the bottom
  //
  // ────────────────────────────────────────────────────────────────────────────

  const maxItemH = heightsRef.current.length
    ? Math.max(...heightsRef.current)
    : 80; // sensible fallback before measurement

  let containerH, yOffset;

  if (curveBend >= 0) {
    // Positive / flat curve
    yOffset = 0;
    containerH = curveBend + maxItemH + bottomPadding;
  } else {
    // Negative curve (arch up)
    yOffset = Math.abs(curveBend);
    containerH =
      Math.abs(curveBend) + // top clearance (shift down)
      maxItemH + // tallest item at arch peak
      negativeClipPad + // user-controlled extra guard
      bottomPadding; // breathing room
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Off-screen measurement strip */}
      <div
        ref={measureRef}
        style={{
          position: "fixed",
          top: -9999,
          left: 0,
          display: "flex",
          visibility: "hidden",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}
      >
        {childArray.map((child, i) => (
          <div
            key={i}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: `0 ${gap / 2 + 20}px`,
            }}
          >
            {child}
          </div>
        ))}
      </div>

      {/* Outer scroll container */}
      <div
        style={{
          width: "100%",
          height: containerH,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Inner absolute canvas */}
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
          }}
          aria-hidden="true"
        >
          {positions.map((pos) => (
            <div
              key={pos.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                transform: `translate(${pos.x - pos.w / 2}px, ${pos.y + yOffset}px) rotate(${pos.angle}rad)`,
                padding: `30px ${gap / 2 + 10}px`,
                whiteSpace: "nowrap",
                willChange: "transform",
              }}
            >
              {childArray[pos.childIdx]}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
