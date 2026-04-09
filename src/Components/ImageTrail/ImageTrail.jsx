import React, { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import "./ImageTrail.css";

export default function ImageTrail({
  images = [
    "https://cdn.cosmos.so/96b0b29e-739b-41c3-9135-056a960025f6?format=jpeg",
    "https://cdn.cosmos.so/dedc89c0-a979-46ba-8ede-83dd50aacf5d?format=jpeg",
    "https://cdn.cosmos.so/ab8e68a5-a7aa-4915-a5f1-23eb300ec371?format=jpeg",
    "https://cdn.cosmos.so/ac66f728-0b0a-4411-b0e9-106004da6a2c?format=jpeg",
    "https://cdn.cosmos.so/c7505fec-58af-4a3b-add3-5968947562fe?format=jpeg",
    "https://cdn.cosmos.so/fcaf7573-cfd4-4604-b114-78b92b611182?format=jpeg",
  ],
  maxTrailLength = 15,
  className,
  velocity = 16,
}) {
  const containerRef = useRef(null);
  const [active, setActive] = useState(false);

  const BUFFER_SIZE = 5;
  const positionHistory = useRef([]);

  const liveImages = useRef([]);

  const nextImageIdx = useRef(0);
  const lastSpawnTime = useRef(0);
  const pixelsSinceSpawn = useRef(0);
  const MIN_PIXELS_TO_SPAWN = 40;
  const MIN_MS_BETWEEN_SPAWNS = 60;

  const stopTimer = useRef(null);

  const getSmoothedVelocity = useCallback(() => {
    const buf = positionHistory.current;
    if (buf.length < 2) return { vx: 0, vy: 0, speed: 0 };

    const oldest = buf[0];
    const newest = buf[buf.length - 1];
    const dt = newest.t - oldest.t || 1; // avoid /0

    const dx = newest.x - oldest.x;
    const dy = newest.y - oldest.y;

    const vx = (dx / dt) * velocity;
    const vy = (dy / dt) * velocity;
    const speed = Math.sqrt(vx * vx + vy * vy);

    return { vx, vy, speed };
  }, []);

  const recordPosition = useCallback((x, y) => {
    positionHistory.current.push({ x, y, t: performance.now() });
    if (positionHistory.current.length > BUFFER_SIZE) {
      positionHistory.current.shift();
    }
  }, []);

  const throwImage = useCallback(
    (spawnX, spawnY, vx, vy, speed) => {
      const container = containerRef.current;
      if (!container) return;

      const img = document.createElement("img");
      img.src = images[nextImageIdx.current];
      img.className = "trail-image";
      container.appendChild(img);

      nextImageIdx.current = (nextImageIdx.current + 1) % images.length;
      liveImages.current.push(img);

      if (liveImages.current.length > maxTrailLength) {
        const evicted = liveImages.current.shift();
        gsap.to(evicted, {
          scale: 0,
          opacity: 0,
          duration: 0.25,
          ease: "power2.in",
          onComplete: () => evicted.remove(),
        });
      }

      const throwMagnitude = Math.min(speed * 3.2, 420);
      const len = speed || 1;
      const throwX = (vx / len) * throwMagnitude;
      const throwY = (vy / len) * throwMagnitude;

      const jitterX = (Math.random() - 0.5) * 60;
      const jitterY = (Math.random() - 0.5) * 30;
      const startRotation = (Math.random() - 0.5) * 25;
      const endRotation = startRotation + (Math.random() - 0.5) * 15;

      const tl = gsap.timeline({
        onComplete: () => {
          img.remove();
          const idx = liveImages.current.indexOf(img);
          if (idx !== -1) liveImages.current.splice(idx, 1);
        },
      });

      tl.set(img, {
        x: spawnX + jitterX,
        y: spawnY + jitterY,
        opacity: 1,
      });

      tl.fromTo(
        img,
        {
          clipPath: "inset(100% 100% 100% 100%)",
          scale: 1,
          duration: 0.3,
          ease: "ease",
        },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          scale: 1,
          duration: 0.3,
          ease: "ease",
        },
        0, // start at time 0 of the timeline
      );

      tl.to(
        img,
        {
          x: spawnX + jitterX + throwX,
          y: spawnY + jitterY + throwY,
          duration: 1.2,
          ease: "power3.out",
        },
        0,
      );

      tl.to(img, {
        scale: 0.35,
        opacity: 0,
        duration: 0.35,
        ease: "power2.in",
        delay: 0.05,
      });
    },
    [images, maxTrailLength],
  );

  useEffect(() => {
    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    const container = containerRef.current;
    if (!container) return;

    const onMove = (e) => {
      const { clientX, clientY } = e;
      const now = performance.now();

      recordPosition(clientX, clientY);

      const prev = positionHistory.current[positionHistory.current.length - 2];
      if (prev) {
        const dx = clientX - prev.x;
        const dy = clientY - prev.y;
        pixelsSinceSpawn.current += Math.sqrt(dx * dx + dy * dy);
      }

      if (!active) setActive(true);

      clearTimeout(stopTimer.current);
      stopTimer.current = setTimeout(() => setActive(false), 300);

      const timeSinceSpawn = now - lastSpawnTime.current;
      if (
        pixelsSinceSpawn.current < MIN_PIXELS_TO_SPAWN ||
        timeSinceSpawn < MIN_MS_BETWEEN_SPAWNS
      ) {
        return;
      }

      pixelsSinceSpawn.current = 0;
      lastSpawnTime.current = now;

      const { vx, vy, speed } = getSmoothedVelocity();

      const localY = clientY - container.getBoundingClientRect().top;

      throwImage(clientX, localY, vx, vy, speed);
    };

    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      clearTimeout(stopTimer.current);
    };
  }, [active, recordPosition, getSmoothedVelocity, throwImage]);

  useEffect(() => {
    if (active) return;

    const cleanup = setTimeout(() => {
      liveImages.current.forEach((img, index) => {
        gsap.to(img, {
          opacity: 0,
          duration: 0.3,
          clipPath: "inset(100% 100% 100% 100%)",
          ease: "power2.in",
          onComplete: () => img.remove(),
          delay: 0.08 * index,
        });
      });
      liveImages.current = [];
    }, 400);

    return () => clearTimeout(cleanup);
  }, [active]);

  return (
    <div className={`main-image-trail ${className}`} ref={containerRef}>
      <span>Move Your Mouse!</span>
    </div>
  );
}
