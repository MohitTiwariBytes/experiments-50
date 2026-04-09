import React, { useEffect, useRef, useState } from "react";

const CHARSET = "@#W$986543210?!abc;:+=-,._  ";
const SCRAMBLE = "-";
const SCRAMBLE_DUR = 120;
const GRID_W = 80;
const GRID_H = 80;
const VISCOSITY = 0.985;
const DYE_DECAY = 0.975;
const ALPHA_THRESHOLD = 30; // cells with alpha below this are treated as transparent

export default function LiquidAscii({
  image = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQUKzJZWOQ9QHhLpOaMI4SFI_KGw42HBrqy-Q&s",
  width = "800px",
  height = "600px",
  objectFit = "cover",
  defaultBrightness,
  defaultContrast,
  defaultColored = true,
  TARGET_COLS = 40,
  backgroundColor = "black", // use transparent if you are using bg free images
}) {
  const resolvedBrightness = defaultBrightness ?? (defaultColored ? 1 : 0);
  const resolvedContrast = defaultContrast ?? (defaultColored ? 3 : 1.8);

  const canvasRef = useRef(null);
  const stateRef = useRef({});
  const [brightness, setBrightness] = useState(resolvedBrightness);
  const [contrast, setContrast] = useState(resolvedContrast);
  const [colored, setColored] = useState(defaultColored);
  const [imgSrc] = useState(image);

  const fluid = useRef({
    velX: new Float32Array(GRID_W * GRID_H),
    velY: new Float32Array(GRID_W * GRID_H),
    velXn: new Float32Array(GRID_W * GRID_H),
    velYn: new Float32Array(GRID_W * GRID_H),
    dye: new Float32Array(GRID_W * GRID_H),
    dyeN: new Float32Array(GRID_W * GRID_H),
  });

  useEffect(() => {
    stateRef.current.brightness = brightness;
    stateRef.current.contrast = contrast;
    stateRef.current.colored = colored;
    stateRef.current.objectFit = objectFit;
  }, [brightness, contrast, colored, objectFit]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const f = fluid.current;

    const offscreen = document.createElement("canvas");
    const offCtx = offscreen.getContext("2d");

    let cols, rows, CELL, FONT_SIZE;
    let asciiGrid = []; // null = transparent cell, string = character
    let colorGrid = []; // null = transparent cell
    let scrambleTimers = [];
    let prevRendered = [];
    let drawBounds = { x: 0, y: 0, w: 0, h: 0 };
    let imgEl = null;
    let prev = null;
    let lastTime = 0;
    let rafId;
    let resizeDebounce = null;

    function gi(x, y) {
      return y * GRID_W + x;
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width);
      canvas.height = Math.round(rect.height);
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      CELL = Math.max(4, Math.round(canvas.width / TARGET_COLS));
      FONT_SIZE = CELL;
    }

    function drawContain(tc, img, W, H, fit) {
      const ir = img.width / img.height;
      const cr = W / H;
      let dw,
        dh,
        ox,
        oy,
        sx = 0,
        sy = 0,
        sw = img.width,
        sh = img.height;

      if (fit === "cover") {
        if (ir > cr) {
          sh = img.height;
          sw = Math.round(img.height * cr);
          sx = Math.round((img.width - sw) / 2);
        } else {
          sw = img.width;
          sh = Math.round(img.width / cr);
          sy = Math.round((img.height - sh) / 2);
        }
        dw = W;
        dh = H;
        ox = 0;
        oy = 0;
      } else {
        if (ir > cr) {
          dw = W;
          dh = Math.round(W / ir);
          ox = 0;
          oy = Math.round((H - dh) / 2);
        } else {
          dh = H;
          dw = Math.round(H * ir);
          ox = Math.round((W - dw) / 2);
          oy = 0;
        }
      }
      drawBounds = { x: ox, y: oy, w: dw, h: dh };
      tc.drawImage(img, sx, sy, sw, sh, ox, oy, dw, dh);
    }

    function buildAscii() {
      if (!imgEl) return;
      const { brightness: br, contrast: co, objectFit: fit } = stateRef.current;
      const W = canvas.width,
        H = canvas.height;

      const tmp = document.createElement("canvas");
      tmp.width = W;
      tmp.height = H;
      const tc = tmp.getContext("2d");
      tc.clearRect(0, 0, W, H);
      drawContain(tc, imgEl, W, H, fit);

      let effectiveCell = CELL;
      if (fit === "cover") {
        const scaleX = drawBounds.w / imgEl.width;
        effectiveCell = Math.max(4, Math.round(CELL / scaleX));
      }
      FONT_SIZE = effectiveCell;
      cols = Math.floor(W / effectiveCell);
      rows = Math.floor(H / effectiveCell);

      const small = document.createElement("canvas");
      small.width = cols;
      small.height = rows;
      const sc = small.getContext("2d");
      sc.drawImage(
        tmp,
        drawBounds.x,
        drawBounds.y,
        drawBounds.w,
        drawBounds.h,
        0,
        0,
        cols,
        rows,
      );
      const data = sc.getImageData(0, 0, cols, rows).data;

      asciiGrid = new Array(cols * rows);
      colorGrid = new Array(cols * rows);
      scrambleTimers = new Array(cols * rows).fill(-99999);
      prevRendered = new Array(cols * rows).fill(null);

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const idx = y * cols + x;
          const pi = idx * 4;
          const r = data[pi],
            g = data[pi + 1],
            b = data[pi + 2];
          const a = data[pi + 3];

          if (a < ALPHA_THRESHOLD) {
            asciiGrid[idx] = null;
            colorGrid[idx] = null;
            continue;
          }

          // For partially transparent pixels, blend alpha into luminance
          const alpha = a / 255;
          let lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          lum = Math.max(0, Math.min(1, (lum - 0.5) * co + 0.5 + br));
          lum = lum * alpha + (1 - alpha);
          asciiGrid[idx] =
            CHARSET[Math.floor((1 - lum) * (CHARSET.length - 1))];
          colorGrid[idx] = `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
        }
      }

      renderBaseFrame();
    }

    function renderBaseFrame() {
      if (!cols) return;
      const { colored: col } = stateRef.current;
      offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
      offCtx.font = `${FONT_SIZE}px monospace`;
      offCtx.textBaseline = "top";
      const cellSize = Math.floor(canvas.width / cols);

      if (col) {
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const i = y * cols + x;
            if (asciiGrid[i] === null) continue; // skip transparent cells
            offCtx.fillStyle = colorGrid[i];
            offCtx.fillText(asciiGrid[i], x * cellSize, y * cellSize);
          }
        }
      } else {
        offCtx.fillStyle = "#fff";
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const i = y * cols + x;
            if (asciiGrid[i] === null) continue; // skip transparent cells
            offCtx.fillText(asciiGrid[i], x * cellSize, y * cellSize);
          }
        }
      }

      for (let i = 0; i < asciiGrid.length; i++) prevRendered[i] = asciiGrid[i];
    }

    stateRef.current.buildAscii = buildAscii;

    function addSplat(nx, ny, fx, fy, strength) {
      const gx = Math.floor(nx * GRID_W),
        gy = Math.floor(ny * GRID_H);
      const r = 5;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const cx = gx + dx,
            cy = gy + dy;
          if (cx < 0 || cx >= GRID_W || cy < 0 || cy >= GRID_H) continue;
          const w = Math.exp(-((dx * dx + dy * dy) / (r * r)) * 3);
          const i = gi(cx, cy);
          f.velX[i] += fx * strength * w;
          f.velY[i] += fy * strength * w;
          f.dye[i] = Math.min(1, f.dye[i] + w * 0.9);
        }
      }
    }

    function advect(field, fieldOut, vx, vy, dt, decay) {
      for (let y = 1; y < GRID_H - 1; y++) {
        for (let x = 1; x < GRID_W - 1; x++) {
          const i = gi(x, y);
          const sx = Math.max(
            0.5,
            Math.min(GRID_W - 1.5, x - vx[i] * dt * GRID_W),
          );
          const sy = Math.max(
            0.5,
            Math.min(GRID_H - 1.5, y - vy[i] * dt * GRID_H),
          );
          const x0 = Math.floor(sx),
            y0 = Math.floor(sy);
          const tx = sx - x0,
            ty = sy - y0;
          fieldOut[i] =
            decay *
            ((1 - tx) * (1 - ty) * field[gi(x0, y0)] +
              tx * (1 - ty) * field[gi(x0 + 1, y0)] +
              (1 - tx) * ty * field[gi(x0, y0 + 1)] +
              tx * ty * field[gi(x0 + 1, y0 + 1)]);
        }
      }
    }

    function stepFluid(dt) {
      advect(f.velX, f.velXn, f.velX, f.velY, dt, VISCOSITY);
      advect(f.velY, f.velYn, f.velX, f.velY, dt, VISCOSITY);
      f.velX.set(f.velXn);
      f.velY.set(f.velYn);
      advect(f.dye, f.dyeN, f.velX, f.velY, dt, DYE_DECAY);
      f.dye.set(f.dyeN);
    }

    function getDyeAt(nx, ny) {
      const cx = Math.max(0, Math.min(GRID_W - 1, Math.floor(nx * GRID_W)));
      const cy = Math.max(0, Math.min(GRID_H - 1, Math.floor(ny * GRID_H)));
      return f.dye[gi(cx, cy)];
    }

    function draw(time) {
      if (!cols) return;
      const { colored: col } = stateRef.current;
      const cellSize = Math.floor(canvas.width / cols);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(offscreen, 0, 0);

      ctx.font = `${FONT_SIZE}px monospace`;
      ctx.textBaseline = "top";

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;

          if (asciiGrid[i] === null) continue;

          const d = getDyeAt(x / cols, y / rows);
          let char = asciiGrid[i];
          let needsRepaint = false;

          if (d > 0.15) {
            if (time - scrambleTimers[i] >= SCRAMBLE_DUR)
              scrambleTimers[i] = time;
            const t = (time - scrambleTimers[i]) / SCRAMBLE_DUR;
            char =
              Math.random() < (1 - t) * 0.85
                ? SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)]
                : asciiGrid[i];
            needsRepaint = true;
          } else if (prevRendered[i] !== asciiGrid[i]) {
            needsRepaint = true;
          }

          if (needsRepaint) {
            // Erase with transparent clear instead of black fill
            ctx.clearRect(x * cellSize, y * cellSize, cellSize, FONT_SIZE + 1);
            ctx.fillStyle = col ? colorGrid[i] : "#fff";
            ctx.fillText(char, x * cellSize, y * cellSize);
            prevRendered[i] = char;
          }
        }
      }
    }

    function loop(t) {
      const dt = Math.min((t - lastTime) / 1000, 0.033);
      lastTime = t;
      stepFluid(dt);
      draw(t);
      rafId = requestAnimationFrame(loop);
    }

    function loadImage(src) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      const proxy = `https://images.weserv.nl/?url=${encodeURIComponent(src.replace(/^https?:\/\//, ""))}&w=800`;
      img.onload = () => {
        imgEl = img;
        resize();
        buildAscii();
      };
      img.onerror = () => {
        const img2 = new Image();
        img2.crossOrigin = "anonymous";
        img2.onload = () => {
          imgEl = img2;
          resize();
          buildAscii();
        };
        img2.src = src;
      };
      img.src = proxy;
    }

    function onMove(e) {
      const rect = canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      if (prev) {
        const fdx = nx - prev.x,
          fdy = ny - prev.y;
        const speed = Math.sqrt(fdx * fdx + fdy * fdy);
        if (speed > 0.0005)
          addSplat(nx, ny, fdx * 18, fdy * 18, Math.min(speed * 200, 3));
      }
      prev = { x: nx, y: ny };
    }

    function onTouchMove(e) {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const nx = (touch.clientX - rect.left) / rect.width;
      const ny = (touch.clientY - rect.top) / rect.height;
      if (prev) {
        const fdx = nx - prev.x,
          fdy = ny - prev.y;
        const speed = Math.sqrt(fdx * fdx + fdy * fdy);
        if (speed > 0.0003)
          addSplat(nx, ny, fdx * 18, fdy * 18, Math.min(speed * 200, 3));
      }
      prev = { x: nx, y: ny };
    }

    const ro = new ResizeObserver(() => {
      clearTimeout(resizeDebounce);
      resizeDebounce = setTimeout(() => {
        resize();
        buildAscii();
      }, 150);
    });

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", () => {
      prev = null;
    });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", () => {
      prev = null;
    });
    ro.observe(canvas);

    loadImage(imgSrc);
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(resizeDebounce);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("touchmove", onTouchMove);
      ro.disconnect();
    };
  }, [imgSrc]);

  useEffect(() => {
    if (stateRef.current.buildAscii) stateRef.current.buildAscii();
  }, [brightness, contrast, objectFit]);

  useEffect(() => {
    stateRef.current.buildAscii?.();
  }, [colored]);

  return (
    <div
      style={{
        width,
        height,
        background: backgroundColor,
        fontFamily: "monospace",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}
