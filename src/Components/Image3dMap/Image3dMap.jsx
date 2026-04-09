import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform sampler2D uImage;
  uniform sampler2D uDepth;
  uniform vec2 uMouse;
  uniform float uStrength;
  uniform vec2 uResolution;
  uniform vec2 uImageSize;
  uniform int uFit;
  varying vec2 vUv;

  vec2 coverUV(vec2 uv, vec2 imgSize, vec2 canvasSize) {
    // Scale so the image fills the canvas, cropping the shorter axis
    float canvasRatio = canvasSize.x / canvasSize.y;
    float imageRatio  = imgSize.x / imgSize.y;
    vec2 scale;
    if (canvasRatio > imageRatio) {
      // canvas is wider than image — fit width, crop height
      scale = vec2(1.0, canvasRatio / imageRatio);
    } else {
      // canvas is taller than image — fit height, crop width
      scale = vec2(imageRatio / canvasRatio, 1.0);
    }
    // Multiply maps UV [0,1] outward so the texture is zoomed in (cropped)
    return (uv - 0.5) * scale + 0.5;
  }

  vec2 containUV(vec2 uv, vec2 imgSize, vec2 canvasSize) {
    // Scale so the entire image fits, leaving letterbox/pillarbox
    float canvasRatio = canvasSize.x / canvasSize.y;
    float imageRatio  = imgSize.x / imgSize.y;
    vec2 scale;
    if (canvasRatio > imageRatio) {
      // canvas is wider — fit height, pillarbox sides
      scale = vec2(imageRatio / canvasRatio, 1.0);
    } else {
      // canvas is taller — fit width, letterbox top/bottom
      scale = vec2(1.0, canvasRatio / imageRatio);
    }
    return (uv - 0.5) * scale + 0.5;
  }

  void main() {
    vec2 uv;
    if (uFit == 0) {
      uv = coverUV(vUv, uImageSize, uResolution);
    } else if (uFit == 1) {
      uv = containUV(vUv, uImageSize, uResolution);
    } else {
      uv = vUv;
    }

    float depth = texture2D(uDepth, uv).r;
    vec2 displaced = uv + uMouse * depth * uStrength;
    gl_FragColor = texture2D(uImage, displaced);
  }
`;

function generateDepthMap(img) {
  const SIZE = 512;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, SIZE, SIZE);

  const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
  const lum = new Float32Array(SIZE * SIZE);

  for (let i = 0; i < SIZE * SIZE; i++) {
    const r = data[i * 4] / 255;
    const g = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;
    lum[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  const radius = 16;
  const sigma = radius / 2;
  const tmp = new Float32Array(SIZE * SIZE);
  const out = new Float32Array(SIZE * SIZE);

  // horizontal blur
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let sum = 0,
        weight = 0;
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = Math.max(0, Math.min(SIZE - 1, x + dx));
        const w = Math.exp(-(dx * dx) / (2 * sigma * sigma));
        sum += lum[y * SIZE + nx] * w;
        weight += w;
      }
      tmp[y * SIZE + x] = sum / weight;
    }
  }

  // vertical blur
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let sum = 0,
        weight = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = Math.max(0, Math.min(SIZE - 1, y + dy));
        const w = Math.exp(-(dy * dy) / (2 * sigma * sigma));
        sum += tmp[ny * SIZE + x] * w;
        weight += w;
      }
      out[y * SIZE + x] = sum / weight;
    }
  }

  let min = Infinity,
    max = -Infinity;
  for (let i = 0; i < out.length; i++) {
    if (out[i] < min) min = out[i];
    if (out[i] > max) max = out[i];
  }
  const range = max - min || 1;

  const pixels = new Uint8Array(SIZE * SIZE * 4);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const v = Math.round(((out[i] - min) / range) * 255);
    pixels[i * 4] = v;
    pixels[i * 4 + 1] = v;
    pixels[i * 4 + 2] = v;
    pixels[i * 4 + 3] = 255;
  }

  const depthCanvas = document.createElement("canvas");
  depthCanvas.width = SIZE;
  depthCanvas.height = SIZE;
  const depthCtx = depthCanvas.getContext("2d");
  const imageData = depthCtx.createImageData(SIZE, SIZE);
  imageData.data.set(pixels);
  depthCtx.putImageData(imageData, 0, 0);

  return new THREE.CanvasTexture(depthCanvas);
}

const FIT_MAP = { cover: 0, contain: 1, fill: 2, none: 2 };

/**
 props:
  src          – image URL (obviously)
  width        – canvas width in px  (default = 800)
  height       – canvas height in px (default = 450)
  objectFit    – "cover" or "contain" or "fill" or "none"  (default: "cover")
  strength     – parallax strength 0.0–0.1  (default: 0.03)
  className    – optional class on the wrapper div
  style        – optional style on the wrapper div
 */
export default function ParallaxDepthImage({
  src,
  width = 800,
  height = 950,
  objectFit = "cover",
  strength = 0.03,
  className,
  style,
}) {
  const mountRef = useRef(null);
  const stateRef = useRef({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block;";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
    camera.position.z = 1;

    const uniforms = {
      uImage: { value: null },
      uDepth: { value: null },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uStrength: { value: strength },
      uResolution: {
        value: new THREE.Vector2(el.clientWidth, el.clientHeight),
      },
      uImageSize: { value: new THREE.Vector2(1, 1) },
      uFit: { value: FIT_MAP[objectFit] ?? 0 },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
    });

    const geo = new THREE.PlaneGeometry(1, 1);
    const mesh = new THREE.Mesh(geo, material);
    scene.add(mesh);

    const mouse = { current: { x: 0, y: 0 }, target: { x: 0, y: 0 } };

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      mouse.target.x = ((e.clientX - rect.left) / rect.width - 0.5) * -2;
      mouse.target.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    const onLeave = () => {
      mouse.target.x = 0;
      mouse.target.y = 0;
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);

    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      mouse.current.x += (mouse.target.x - mouse.current.x) * 0.07;
      mouse.current.y += (mouse.target.y - mouse.current.y) * 0.07;
      uniforms.uMouse.value.set(mouse.current.x, mouse.current.y);
      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h);
      uniforms.uResolution.value.set(w, h);
    });
    ro.observe(el);

    stateRef.current = { renderer, scene, camera, uniforms, mouse, ro };

    return () => {
      cancelAnimationFrame(animId);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      ro.disconnect();
      renderer.dispose();
      el.innerHTML = "";
    };
  }, []);

  useEffect(() => {
    if (!src) return;
    setLoading(true);
    setError(null);

    const { uniforms } = stateRef.current;
    if (!uniforms) return;

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const texture = new THREE.Texture(img);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;

      const depthTexture = generateDepthMap(img);

      uniforms.uImage.value = texture;
      uniforms.uDepth.value = depthTexture;
      uniforms.uImageSize.value.set(img.naturalWidth, img.naturalHeight);
      setLoading(false);
    };

    img.onerror = () => {
      setError(
        "Failed to load image. Check CORS headers or try a different URL.",
      );
      setLoading(false);
    };

    img.src = src;
  }, [src]);

  useEffect(() => {
    const { uniforms } = stateRef.current;
    if (!uniforms) return;
    uniforms.uStrength.value = strength;
  }, [strength]);

  useEffect(() => {
    const { uniforms } = stateRef.current;
    if (!uniforms) return;
    uniforms.uFit.value = FIT_MAP[objectFit] ?? 0;
  }, [objectFit]);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width,
        height,
        borderRadius: 12,
        overflow: "hidden",
        background: "#111",
        ...style,
      }}
    >
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            fontSize: 14,
            fontFamily: "sans-serif",
          }}
        >
          Loading…
        </div>
      )}

      {error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.75)",
            color: "#f88",
            fontSize: 13,
            fontFamily: "sans-serif",
            padding: 24,
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
