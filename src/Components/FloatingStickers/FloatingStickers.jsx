import React, { useEffect, useRef, useState } from "react";
import "./FloatingStickers.css";
import gsap from "gsap";

export default function FloatingStickers({
  stickers = [
    "https://cdn.hackclub.com/019c1e7b-50cb-75e4-8e0d-b5be55d7bd25/logored.png",
    "https://cdn.cosmos.so/2292f333-515c-4c6b-b264-0bc7a4ccda84?format=jpeg",
    "https://cdn.cosmos.so/a20d16a7-6896-4abf-8699-cb53c23ff862?format=jpeg",
    "https://cdn.cosmos.so/a9c1ecb9-c420-4ea2-a537-151f6bf07738?format=jpeg",
    "https://cdn.cosmos.so/172757e3-03a7-44e4-80e5-2cf50f7a6b5a?format=jpeg",
    "https://cdn.cosmos.so/4b16a830-25e5-45a4-9604-c2a5acf0ddbd?format=jpeg",
  ],
}) {
  const [userMousePos, setUserMousePos] = useState({ x: 0, y: 0 });
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const containerRef = useRef(null);
  const preloadedImagesRef = useRef([]);
  const isWarmupDoneRef = useRef(false);
  const lastStickerIndex = useRef(-1); // Track last used sticker

  useEffect(() => {
    const loadImages = async () => {
      const imagePromises = stickers.map((src) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      });

      try {
        preloadedImagesRef.current = await Promise.all(imagePromises);
        setImagesLoaded(true);
      } catch (error) {
        console.error("Failed to preload images:", error);
      }
    };

    loadImages();

    const warmupElement = document.createElement("div");
    warmupElement.style.position = "absolute";
    warmupElement.style.opacity = "0";
    warmupElement.style.pointerEvents = "none";
    containerRef.current?.appendChild(warmupElement);

    gsap.to(warmupElement, {
      x: 1,
      duration: 0.01,
      onComplete: () => {
        warmupElement.remove();
        isWarmupDoneRef.current = true;
      },
    });
  }, [stickers]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setUserMousePos({
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const spawnStickers = () => {
    if (!imagesLoaded || !preloadedImagesRef.current.length) return;

    // get a random index thats different from the last one
    let randomIndex;
    do {
      randomIndex = Math.floor(
        Math.random() * preloadedImagesRef.current.length,
      );
    } while (
      randomIndex === lastStickerIndex.current &&
      preloadedImagesRef.current.length > 1
    );

    lastStickerIndex.current = randomIndex;

    const stickerElement = document.createElement("img");
    stickerElement.src = preloadedImagesRef.current[randomIndex].src;

    stickerElement.style.cssText = `
      position: absolute;
      left: ${userMousePos.x}px;
      top: ${userMousePos.y}px;
      transform: translate(-50%, -50%) scale(0);
      will-change: transform, opacity;
    `;

    containerRef.current.appendChild(stickerElement);

    gsap.to(stickerElement, {
      scale: 1,
      y: "-=80",
      rotation: gsap.utils.random(-20, 20),
      duration: 0.4,
      ease: "back.out(2.1, 2.3)",
      onComplete: () => {
        stickerElement.style.willChange = "auto";
      },
    });

    gsap.to(stickerElement, {
      opacity: 0,
      scale: 1.1,
      y: "-=120",
      duration: 0.4,
      delay: 0.5,
      ease: "back.out(2.1, 2.3)",
      onComplete: () => stickerElement.remove(),
    });
  };

  return (
    <div onClick={spawnStickers} className="main-floating-stickers">
      <h1>Click around and have some fun!</h1>
      <div ref={containerRef} className="floating-stickers"></div>
    </div>
  );
}
