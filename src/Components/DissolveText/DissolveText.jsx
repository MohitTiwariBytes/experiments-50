import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export default function DissolveTextScaled({
  text = "DISSOLVE",
  fontSize = "15vw",
  fontFamily = "sans-serif",
  fontWeight = "bold",
  fontColor = "black",
  letterSpacing = 0,
  lineHeight = 0.9,
  dissolveScale = 9,
  speed = 1.0,
  softness = 0.1,
  alphaMultiplier = 1.0,
  fireSize = 0.8,
  hoverRadius = 60, // radius in pixels around mouse that dissolves
  dissolveSpeed = 15.0, // how fast it dissolves
  maxDissolveAmount = 0.69, // 0.0 to 1.0, how much it dissolves (1.0 = fully dissolved, 0.5 = 50% dissolved)
  idleRegenerateTime = 0.3, // seconds of mouse stillness before regeneration
  idleRegenerateSpeed = 0.1, // speed multiplier for regeneration (lower = slower, more visible)
}) {
  const mountRef = useRef(null);
  const cleanupRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000 }); // Start off-screen
  const dissolveMapRef = useRef(null);
  const lastMouseMoveTimeRef = useRef(performance.now());
  const mouseStillRef = useRef(false);
  const forceRegenerateRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    let renderer, scene, camera;
    let textTexture, noiseTexture, rampTexture;
    let bufferSceneA, bufferSceneB, bufferSceneC, bufferSceneFinal;
    let renderTargetA, renderTargetB, renderTargetC;
    let materialA, materialB, materialC, materialFinal;

    const parseFontSize = (size) => {
      if (typeof size === "string" && size.includes("vw")) {
        const vw = parseFloat(size);
        return (window.innerWidth * vw) / 100;
      }
      return size;
    };

    const computedFontSize = parseFontSize(fontSize);

    const load = async () => {
      const mount = mountRef.current;
      if (!mount || !mounted) return;

      const W = Math.max(1, mount.clientWidth);
      const H = Math.max(1, mount.clientHeight);

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(W, H);
      mount.appendChild(renderer.domElement);

      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
      camera.position.z = 1;

      // Create render targets for buffers
      renderTargetA = new THREE.WebGLRenderTarget(W, H);
      renderTargetB = new THREE.WebGLRenderTarget(W, H);
      renderTargetC = new THREE.WebGLRenderTarget(W, H);

      // Draw text to canvas
      const DPR = Math.min(window.devicePixelRatio || 1, 2);
      const canvas = document.createElement("canvas");
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = fontColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${fontWeight} ${computedFontSize * DPR}px ${fontFamily}`;

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

      // Create dissolve map texture (accumulates dissolve over time)
      const dissolveMapSize = 512;
      const dissolveMapCanvas = document.createElement("canvas");
      dissolveMapCanvas.width = dissolveMapSize;
      dissolveMapCanvas.height = dissolveMapSize;
      const dissolveMapCtx = dissolveMapCanvas.getContext("2d");
      dissolveMapCtx.fillStyle = "black";
      dissolveMapCtx.fillRect(0, 0, dissolveMapSize, dissolveMapSize);

      const dissolveMapTexture = new THREE.CanvasTexture(dissolveMapCanvas);
      dissolveMapTexture.minFilter = THREE.LinearFilter;
      dissolveMapTexture.magFilter = THREE.LinearFilter;
      dissolveMapTexture.needsUpdate = true;

      dissolveMapRef.current = {
        canvas: dissolveMapCanvas,
        ctx: dissolveMapCtx,
        texture: dissolveMapTexture,
      };
      const noiseSize = 512;
      const noiseCanvas = document.createElement("canvas");
      noiseCanvas.width = noiseSize;
      noiseCanvas.height = noiseSize;
      const noiseCtx = noiseCanvas.getContext("2d");

      const imageData = noiseCtx.createImageData(noiseSize, noiseSize);

      // Better hash function
      const hash = (x, y) => {
        const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return h - Math.floor(h);
      };

      // Proper 2D noise with smooth interpolation
      const noise2D = (x, y) => {
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        const fx = x - ix;
        const fy = y - iy;

        // Smoothstep interpolation
        const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
        const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);

        const a = hash(ix, iy);
        const b = hash(ix + 1, iy);
        const c = hash(ix, iy + 1);
        const d = hash(ix + 1, iy + 1);

        return (
          a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v
        );
      };

      // Fractal Brownian Motion
      const fbm = (x, y, octaves) => {
        let value = 0;
        let amplitude = 0.5;
        let frequency = 1;

        for (let i = 0; i < octaves; i++) {
          value += amplitude * noise2D(x * frequency, y * frequency);
          frequency *= 2;
          amplitude *= 0.5;
        }

        return value;
      };

      for (let y = 0; y < noiseSize; y++) {
        for (let x = 0; x < noiseSize; x++) {
          const i = (y * noiseSize + x) * 4;

          const nx = (x / noiseSize) * 8;
          const ny = (y / noiseSize) * 8;

          const value = fbm(nx, ny, 6);
          const finalValue = Math.floor(value * 255);

          imageData.data[i] = finalValue;
          imageData.data[i + 1] = finalValue;
          imageData.data[i + 2] = finalValue;
          imageData.data[i + 3] = 255;
        }
      }

      noiseCtx.putImageData(imageData, 0, 0);
      noiseTexture = new THREE.CanvasTexture(noiseCanvas);
      noiseTexture.wrapS = THREE.RepeatWrapping;
      noiseTexture.wrapT = THREE.RepeatWrapping;
      noiseTexture.minFilter = THREE.LinearFilter;
      noiseTexture.magFilter = THREE.LinearFilter;
      noiseTexture.needsUpdate = true;

      const vertex = `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `;

      // Buffer A: Ramp texture
      const fragmentA = `
        precision highp float;
        varying vec2 vUv;
        uniform vec2 iResolution;

        void main() {
          vec2 fragCoord = vUv * iResolution;
          vec2 uv = fragCoord / iResolution;
          float totalColumn = 4.0;
          float wid = 1.0 / totalColumn;
          float column = floor(uv.x / wid) + 1.0;
          float c = wid * column;
          gl_FragColor = vec4(c, 0.0, 0.0, 1.0);
        }
      `;

      // Buffer B: Main dissolve effect
      const fragmentB = `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D iChannel0;
        uniform sampler2D iChannel1;
        uniform sampler2D iChannel2;
        uniform sampler2D iChannel3;
        uniform float iTime;
        uniform vec2 iResolution;
        uniform float noiseScale;
        uniform vec2 speedVec;
        uniform float fireSize;
        uniform vec2 uMouse;
        uniform float uHoverRadius;
        uniform float uMaxDissolve;

        vec4 noiseMask(vec2 uv, float scale, vec2 speed) {
          uv.x = uv.x * iResolution.x / iResolution.y;
          vec4 sampleColor = texture2D(iChannel0, uv * scale + iTime * speed);
          float gray = sampleColor.x;
          return vec4(gray, gray, gray, gray);
        }

        vec4 colorRamp(float x) {
          return texture2D(iChannel1, vec2(x, x));
        }

        vec4 mainTex(vec2 uv) {
          return texture2D(iChannel2, uv);
        }

        float fireEdge(float dissolvedNoise, float fSize) {
          return step(0.0 - fSize, dissolvedNoise) * (1.0 - step(0.0, dissolvedNoise));
        }

        vec4 fire(float dissolvedNoise, float fSize) {
          float coord = (dissolvedNoise + fSize) / fSize;
          return fireEdge(dissolvedNoise, fSize) * colorRamp(coord);
        }

        void main() {
          vec2 fragCoord = vUv * iResolution;
          vec2 uv = fragCoord / iResolution;
          
          vec4 texColor = mainTex(uv);
          
          // Only apply effect where text exists
          if (texColor.a < 0.01) {
            discard;
          }
          
          // Get accumulated dissolve amount from dissolve map
          vec4 dissolveMap = texture2D(iChannel3, uv);
          float accumulatedDissolve = dissolveMap.r;
          
          // Calculate distance-based intensity
          float distFromMouse = distance(fragCoord, uMouse);
          float normalizedDist = clamp(distFromMouse / uHoverRadius, 0.0, 1.0);
          
          // Interpolate max dissolve based on distance (close = 1.0, far = uMaxDissolve)
          float distanceBasedMax = mix(1.0, uMaxDissolve, normalizedDist);
          
          // Cap dissolve based on distance from mouse
          if (uMouse.x > 0.0 && distFromMouse < uHoverRadius) {
            accumulatedDissolve = min(accumulatedDissolve, distanceBasedMax);
          } else {
            accumulatedDissolve = min(accumulatedDissolve, uMaxDissolve);
          }
          
          vec4 noise = noiseMask(uv, noiseScale, speedVec);
          float dissolvedNoise = noise.x - accumulatedDissolve;
          
          // Simple threshold - if below 0, discard (transparent)
          if (dissolvedNoise < 0.0) {
            discard;
          }
          
          gl_FragColor = texColor;
        }
      `;

      // Buffer C: Gaussian
      const fragmentC = `
        precision highp float;
        varying vec2 vUv;
        uniform vec2 iResolution;

        void main() {
          vec2 fragCoord = vUv * iResolution;
          vec2 uv = fragCoord / iResolution;
          gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);
        }
      `;

      // Final Image pass
      const fragmentFinal = `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D iChannel0;
        uniform vec2 iResolution;

        vec3 ACESToneMapping(vec3 color) {
          const float A = 2.51;
          const float B = 0.03;
          const float C = 2.43;
          const float D = 0.59;
          const float E = 0.14;
          return (color * (A * color + B)) / (color * (C * color + D) + E);
        }

        void main() {
          vec2 fragCoord = vUv * iResolution;
          vec2 uv = fragCoord / iResolution;
          vec4 outColor = texture2D(iChannel0, uv);
          gl_FragColor = outColor;
        }
      `;

      // Create scenes and materials for each buffer
      bufferSceneA = new THREE.Scene();
      materialA = new THREE.ShaderMaterial({
        uniforms: {
          iResolution: { value: new THREE.Vector2(W, H) },
        },
        vertexShader: vertex,
        fragmentShader: fragmentA,
      });
      bufferSceneA.add(
        new THREE.Mesh(new THREE.PlaneGeometry(2, 2), materialA),
      );

      bufferSceneB = new THREE.Scene();
      materialB = new THREE.ShaderMaterial({
        uniforms: {
          iChannel0: { value: noiseTexture },
          iChannel1: { value: renderTargetA.texture },
          iChannel2: { value: textTexture },
          iChannel3: { value: dissolveMapTexture },
          iTime: { value: 0 },
          iResolution: { value: new THREE.Vector2(W, H) },
          noiseScale: { value: dissolveScale },
          speedVec: { value: new THREE.Vector2(0, 0) },
          fireSize: { value: fireSize },
          uMouse: { value: new THREE.Vector2(-1000, -1000) },
          uHoverRadius: { value: hoverRadius },
          uMaxDissolve: { value: maxDissolveAmount },
        },
        vertexShader: vertex,
        fragmentShader: fragmentB,
        transparent: true,
      });
      bufferSceneB.add(
        new THREE.Mesh(new THREE.PlaneGeometry(2, 2), materialB),
      );

      bufferSceneC = new THREE.Scene();
      materialC = new THREE.ShaderMaterial({
        uniforms: {
          iResolution: { value: new THREE.Vector2(W, H) },
        },
        vertexShader: vertex,
        fragmentShader: fragmentC,
      });
      bufferSceneC.add(
        new THREE.Mesh(new THREE.PlaneGeometry(2, 2), materialC),
      );

      bufferSceneFinal = new THREE.Scene();
      materialFinal = new THREE.ShaderMaterial({
        uniforms: {
          iChannel0: { value: renderTargetB.texture },
          iResolution: { value: new THREE.Vector2(W, H) },
        },
        vertexShader: vertex,
        fragmentShader: fragmentFinal,
        transparent: true,
      });
      bufferSceneFinal.add(
        new THREE.Mesh(new THREE.PlaneGeometry(2, 2), materialFinal),
      );

      let startTime = performance.now();
      let lastFrameTime = performance.now();

      const onMouseMove = (e) => {
        const rect = mount.getBoundingClientRect();
        const x = (e.clientX - rect.left) * DPR;
        const y = (rect.height - (e.clientY - rect.top)) * DPR; // Flip Y
        mouseRef.current = { x, y };
        materialB.uniforms.uMouse.value.set(x, y);
        lastMouseMoveTimeRef.current = performance.now();
        mouseStillRef.current = false;
        forceRegenerateRef.current = false;
      };

      const onMouseLeave = () => {
        mouseRef.current = { x: -1000, y: -1000 };
        materialB.uniforms.uMouse.value.set(-1000, -1000);
      };

      mount.addEventListener("mousemove", onMouseMove);
      mount.addEventListener("mouseleave", onMouseLeave);

      const animate = () => {
        if (!mounted) return;
        const now = performance.now();
        const elapsed = (now - startTime) / 1000;
        const delta = (now - lastFrameTime) / 1000;
        lastFrameTime = now;

        materialB.uniforms.iTime.value = elapsed * speed;

        // Update dissolve map based on mouse position
        const { ctx, canvas, texture } = dissolveMapRef.current;
        const mouse = mouseRef.current;

        // Check if mouse has been still for 2 seconds
        const timeSinceLastMove = (now - lastMouseMoveTimeRef.current) / 1000;

        if (
          timeSinceLastMove > idleRegenerateTime &&
          mouse.x > 0 &&
          mouse.y > 0 &&
          !mouseStillRef.current
        ) {
          // Mouse has been still for specified time - trigger gradual regeneration
          mouseStillRef.current = true;
          forceRegenerateRef.current = true;
        }

        // Always apply gradual fade (recovery)
        ctx.globalCompositeOperation = "source-over";
        const fadeSpeed = forceRegenerateRef.current
          ? dissolveSpeed * idleRegenerateSpeed
          : dissolveSpeed * 0.2;
        ctx.fillStyle = `rgba(0, 0, 0, ${delta * fadeSpeed})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (
          mouse.x > 0 &&
          mouse.y > 0 &&
          timeSinceLastMove <= idleRegenerateTime &&
          !forceRegenerateRef.current
        ) {
          // Only dissolve when mouse is moving or hasn't been still for 2 seconds yet
          // Map mouse position to canvas coordinates
          const scaleX = canvas.width / (W * DPR);
          const scaleY = canvas.height / (H * DPR);
          const canvasX = mouse.x * scaleX;
          const canvasY = canvas.height - mouse.y * scaleY; // Flip Y for canvas
          const canvasRadius = hoverRadius * Math.max(scaleX, scaleY);

          // Gradient that's stronger at center, weaker at edges
          const gradient = ctx.createRadialGradient(
            canvasX,
            canvasY,
            0,
            canvasX,
            canvasY,
            canvasRadius,
          );
          const increaseAmount = delta * dissolveSpeed * 0.5;
          gradient.addColorStop(
            0,
            `rgba(255, 255, 255, ${increaseAmount * 3})`,
          ); // Strongest at center
          gradient.addColorStop(
            0.5,
            `rgba(255, 255, 255, ${increaseAmount * 1.5})`,
          );
          gradient.addColorStop(1, "rgba(255, 255, 255, 0)"); // Weakest at edge

          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        texture.needsUpdate = true;

        // Render Buffer A
        renderer.setRenderTarget(renderTargetA);
        renderer.render(bufferSceneA, camera);

        // Render Buffer B
        renderer.setRenderTarget(renderTargetB);
        renderer.render(bufferSceneB, camera);

        // Render Buffer C
        renderer.setRenderTarget(renderTargetC);
        renderer.render(bufferSceneC, camera);

        // Final render to screen
        renderer.setRenderTarget(null);
        renderer.render(bufferSceneFinal, camera);

        requestAnimationFrame(animate);
      };
      animate();

      const onResize = () => {
        if (!mounted) return;
        const w = Math.max(1, mount.clientWidth);
        const h = Math.max(1, mount.clientHeight);
        renderer.setSize(w, h);
        renderTargetA.setSize(w, h);
        renderTargetB.setSize(w, h);
        renderTargetC.setSize(w, h);
        materialA.uniforms.iResolution.value.set(w, h);
        materialB.uniforms.iResolution.value.set(w, h);
        materialC.uniforms.iResolution.value.set(w, h);
        materialFinal.uniforms.iResolution.value.set(w, h);
      };
      window.addEventListener("resize", onResize);

      cleanupRef.current = () => {
        mounted = false;
        window.removeEventListener("resize", onResize);
        mount.removeEventListener("mousemove", onMouseMove);
        mount.removeEventListener("mouseleave", onMouseLeave);
        if (
          renderer &&
          renderer.domElement &&
          mount.contains(renderer.domElement)
        ) {
          mount.removeChild(renderer.domElement);
        }
        if (materialA) materialA.dispose();
        if (materialB) materialB.dispose();
        if (materialC) materialC.dispose();
        if (materialFinal) materialFinal.dispose();
        if (textTexture) textTexture.dispose();
        if (noiseTexture) noiseTexture.dispose();
        if (dissolveMapRef.current?.texture)
          dissolveMapRef.current.texture.dispose();
        if (renderTargetA) renderTargetA.dispose();
        if (renderTargetB) renderTargetB.dispose();
        if (renderTargetC) renderTargetC.dispose();
        if (renderer) renderer.dispose();
      };
    };

    load();

    return () => {
      mounted = false;
      if (cleanupRef.current) cleanupRef.current();
    };
  }, [
    text,
    fontSize,
    fontFamily,
    fontWeight,
    fontColor,
    letterSpacing,
    lineHeight,
    dissolveScale,
    speed,
    softness,
    alphaMultiplier,
    fireSize,
    hoverRadius,
    dissolveSpeed,
    maxDissolveAmount,
    idleRegenerateTime,
    idleRegenerateSpeed,
  ]);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}
