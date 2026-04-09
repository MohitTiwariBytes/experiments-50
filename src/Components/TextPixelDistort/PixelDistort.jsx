// PixelDistort.jsx
import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * PixelDistort
 *
 * Props:
 *  - text: string (supports \n)
 *  - fontSize: number (px) or string (e.g., "20vw")
 *  - pixelSize: number (visual blockiness; larger -> fewer blocks)
 *  - strength: number (push strength)
 *  - relaxation: number (0..1, smaller = faster decay)
 *  - gridSize: optional number override for data grid resolution
 *  - fontColor: css color string for text
 *  - fontFamily: css font family string (e.g., "Arial", "Helvetica, sans-serif")
 *  - fontWeight: css font weight (e.g., "bold", "normal", "600")
 *  - letterSpacing: number (em) - space between letters in em units (e.g., 0.1 = 0.1em)
 *  - lineHeight: number (multiplier) - line height as multiplier of fontSize (e.g., 1.2)
 *  - chromaticAberration: number (0..1) - RGB split glitch effect intensity (default: 0)
 */
export default function PixelDistort({
  text = "Pixel Distortion",
  fontSize = "10vw",
  pixelSize = 3,
  strength = 15,
  relaxation = 0.88,
  gridSize = 80,
  fontColor = "black",
  fontFamily = "Inter",
  fontWeight = "bold",
  letterSpacing = -0.02,
  lineHeight = 0.9,
}) {
  const mountRef = useRef(null);
  const cleanupRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    let renderer = null;
    let raf = null;
    let material = null;
    let geo = null;
    let textTexture = null;
    let dataTex = null;

    const load = async () => {
      // Parse font size FIRST before using it
      const parseFontSize = (size) => {
        if (typeof size === "string" && size.includes("vw")) {
          const vwValue = parseFloat(size);
          return (window.innerWidth * vwValue) / 100;
        }
        return size;
      };

      const computedFontSize = parseFontSize(fontSize);

      await document.fonts.load(
        `${fontWeight} ${computedFontSize}px ${fontFamily}`,
      );

      const mount = mountRef.current;
      if (!mount || !mounted) return;

      // Ensure mount has size
      const W = Math.max(1, mount.clientWidth);
      const H = Math.max(1, mount.clientHeight);

      // ---------- Renderer ----------
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(W, H);
      mount.appendChild(renderer.domElement);

      // ---------- Scene + Camera ----------
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
      camera.position.z = 1;

      // ---------- Text Canvas -> texture ----------
      const DPR = Math.min(window.devicePixelRatio || 1, 2);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw text centered
      ctx.fillStyle = fontColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${fontWeight} ${computedFontSize * DPR}px ${fontFamily}`;
      ctx.letterSpacing = `${letterSpacing * computedFontSize * DPR}px`;

      const lines = (text || "").split("\n");
      const lineHeightPx = computedFontSize * DPR * lineHeight;
      const startY =
        canvas.height / 2 - (lines.length - 1) * (lineHeightPx / 2);
      lines.forEach((line, i) => {
        ctx.fillText(line, canvas.width / 2, startY + i * lineHeightPx);
      });

      textTexture = new THREE.CanvasTexture(canvas);
      textTexture.minFilter = THREE.LinearFilter;
      textTexture.magFilter = THREE.LinearFilter;
      textTexture.needsUpdate = true;

      // ---------- Grid / DataTexture ----------
      const computedGrid =
        gridSize || Math.max(8, Math.floor(Math.max(24, 200 / pixelSize)));
      const gridW = computedGrid;
      const gridH = computedGrid;
      const gridTotal = gridW * gridH;

      const isWebGL2 = renderer.capabilities.isWebGL2;
      const floatExt =
        renderer.capabilities.isWebGL2 ||
        !!renderer.extensions.get("OES_texture_float");
      const useFloat = floatExt;

      let dataArray,
        usingByteFallback = false;
      const byteEncodeScale = 100.0;

      if (useFloat) {
        dataArray = new Float32Array(gridTotal * 4);
        for (let i = 0; i < dataArray.length; i++) dataArray[i] = 0;
        dataTex = new THREE.DataTexture(
          dataArray,
          gridW,
          gridH,
          THREE.RGBAFormat,
          THREE.FloatType,
        );
      } else {
        usingByteFallback = true;
        dataArray = new Uint8Array(gridTotal * 4);
        for (let i = 0; i < dataArray.length; i++) dataArray[i] = 128;
        dataTex = new THREE.DataTexture(
          dataArray,
          gridW,
          gridH,
          THREE.RGBAFormat,
          THREE.UnsignedByteType,
        );
      }
      dataTex.magFilter = THREE.NearestFilter;
      dataTex.minFilter = THREE.NearestFilter;
      dataTex.needsUpdate = true;

      // ---------- Shader ----------
      const vertex = `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `;

      const fragment = `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform sampler2D uData;
        uniform vec2 uGrid;
        uniform float uBlockMul;
        uniform int uByte;
        uniform float uByteScale;

        vec2 sampleVel(vec2 uv) {
          vec2 cell = floor(uv * uGrid);
          vec2 centerUV = (cell + 0.5) / uGrid;
          vec4 d = texture2D(uData, centerUV);
          if (uByte == 1) {
            float vx = (d.r * 255.0 - 128.0) / uByteScale;
            float vy = (d.g * 255.0 - 128.0) / uByteScale;
            return vec2(vx, vy);
          } else {
            return d.rg;
          }
        }

        void main() {
          vec2 vel = sampleVel(vUv);
          vec2 disp = vel * 0.0008 * uBlockMul;

          vec2 blockSize = (1.0 / uGrid) * uBlockMul;
          vec2 blockOrigin = floor(vUv / blockSize) * blockSize;
          vec2 internalUV = fract(vUv / blockSize) * blockSize;

          vec2 sampleUV = blockOrigin + internalUV + disp;

          vec4 col = texture2D(uTexture, sampleUV);
          if (col.a < 0.02) discard;
          gl_FragColor = col;
        }
      `;

      material = new THREE.ShaderMaterial({
        uniforms: {
          uTexture: { value: textTexture },
          uData: { value: dataTex },
          uGrid: { value: new THREE.Vector2(gridW, gridH) },
          uBlockMul: { value: 1.0 },
          uByte: { value: usingByteFallback ? 1 : 0 },
          uByteScale: { value: byteEncodeScale },
        },
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
      });

      geo = new THREE.PlaneGeometry(2, 2);
      const mesh = new THREE.Mesh(geo, material);
      scene.add(mesh);

      // ---------- Mouse / Velocity ----------
      const mouse = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, vx: 0, vy: 0 };

      function onPointerMove(e) {
        const rect = mount.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width;
        const ny = 1 - (e.clientY - rect.top) / rect.height;
        const dx = nx - mouse.px;
        const dy = ny - mouse.py;
        mouse.vx = dx;
        mouse.vy = dy;
        mouse.px = nx;
        mouse.py = ny;
        mouse.x = nx;
        mouse.y = ny;
      }
      mount.addEventListener("pointermove", onPointerMove);

      // ---------- Animation ----------
      function updateFrame() {
        if (!mounted) return;

        if (useFloat) {
          for (let i = 0; i < dataArray.length; i += 4) {
            dataArray[i] *= relaxation;
            dataArray[i + 1] *= relaxation;
          }
        } else {
          for (let i = 0; i < dataArray.length; i += 4) {
            dataArray[i] = Math.round(128 + (dataArray[i] - 128) * relaxation);
            dataArray[i + 1] = Math.round(
              128 + (dataArray[i + 1] - 128) * relaxation,
            );
          }
        }

        const mx = Math.floor(mouse.x * gridW);
        const my = Math.floor(mouse.y * gridH);
        const vlen = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy);

        if (vlen > 0.000001) {
          const maxCells = Math.max(1, Math.floor(Math.max(3, gridW * 0.12)));
          const scale = strength * 60.0;
          const minI = Math.max(0, mx - maxCells);
          const maxI = Math.min(gridW - 1, mx + maxCells);
          const minJ = Math.max(0, my - maxCells);
          const maxJ = Math.min(gridH - 1, my + maxCells);

          for (let j = minJ; j <= maxJ; j++) {
            for (let i = minI; i <= maxI; i++) {
              const dx = mx - i;
              const dy = my - j;
              const dist2 = dx * dx + dy * dy;
              const maxDist2 = maxCells * maxCells;
              if (dist2 < maxDist2) {
                const fall = 1.0 - Math.sqrt(dist2) / (maxCells + 0.0001);
                const idx = 4 * (i + j * gridW);

                if (useFloat) {
                  dataArray[idx] += mouse.vx * scale * fall * -1.0;
                  dataArray[idx + 1] += mouse.vy * scale * fall * -1.0;
                } else {
                  const vxDesired = mouse.vx * scale * fall * -1.0;
                  const vyDesired = mouse.vy * scale * fall * -1.0;

                  const enc = byteEncodeScale;
                  const vxByte = Math.round(128 + vxDesired * enc);
                  const vyByte = Math.round(128 + vyDesired * enc);

                  dataArray[idx] = Math.min(255, Math.max(0, vxByte));
                  dataArray[idx + 1] = Math.min(255, Math.max(0, vyByte));
                }
              }
            }
          }
          mouse.vx *= 0.6;
          mouse.vy *= 0.6;
        }

        dataTex.needsUpdate = true;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(updateFrame);
      }

      raf = requestAnimationFrame(updateFrame);

      // ---------- Resize ----------
      function onResize() {
        if (!mounted) return;
        const w = Math.max(1, mount.clientWidth);
        const h = Math.max(1, mount.clientHeight);
        renderer.setSize(w, h);
      }
      window.addEventListener("resize", onResize);

      // Store cleanup function
      cleanupRef.current = () => {
        mounted = false;
        if (raf) cancelAnimationFrame(raf);
        if (mount) {
          mount.removeEventListener("pointermove", onPointerMove);
        }
        window.removeEventListener("resize", onResize);
        if (
          renderer &&
          renderer.domElement &&
          mount &&
          mount.contains(renderer.domElement)
        ) {
          mount.removeChild(renderer.domElement);
        }
        if (material) material.dispose();
        if (geo) geo.dispose();
        if (textTexture) textTexture.dispose();
        if (dataTex) dataTex.dispose();
        if (renderer) renderer.dispose();
      };
    };

    load();

    return () => {
      mounted = false;
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [
    text,
    fontSize,
    pixelSize,
    strength,
    relaxation,
    gridSize,
    fontColor,
    fontFamily,
    fontWeight,
    letterSpacing,
    lineHeight,
  ]);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}
