import React, { useEffect, useRef } from "react";
import "./VideoPlayOnScroll.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// config
const TOTAL_FRAMES = 300;
const IMAGE_PATH_MODE = "local"; // change it according to your usage

const CANVAS_WIDTH = "100%";
const CANVAS_HEIGHT = "100%";

const LOCAL_PATH_PREFIX = "/framesAnimationImages/ezgif-frame-"; // if you're using local paths
const LOCAL_PATH_SUFFIX = ".jpg"; // change the extension to your own images ones

const EXTERNAL_URL_PREFIX = "https://your-cdn.com/frames/frame-"; // change with your cnd images and image name prefix
const EXTERNAL_URL_SUFFIX = ".jpg"; // change it to your images extension

function getFrameSrc(index) {
  const padded = String(index + 1).padStart(3, "0");
  if (IMAGE_PATH_MODE === "external") {
    return `${EXTERNAL_URL_PREFIX}${padded}${EXTERNAL_URL_SUFFIX}`;
  }
  return `${LOCAL_PATH_PREFIX}${padded}${LOCAL_PATH_SUFFIX}`;
}

export default function VideoPlayOnScroll() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const videoSectionRef = useRef(null);
  const progressVideoRef = useRef(null);
  const imagesRef = useRef([]);
  const frameIndexRef = useRef(0);
  const loadedCountRef = useRef(0);
  const rafIdRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const progressInner = containerRef.current.querySelector(".progress-inner");
    const progressVideo = progressVideoRef.current;

    // inital position and state of the progress bar
    gsap.set(progressVideo, { opacity: 0, y: "100%" });

    function preloadImages() {
      const images = [];
      for (let i = 0; i < TOTAL_FRAMES; i++) {
        const img = new Image();
        img.src = getFrameSrc(i);
        img.onload = () => {
          loadedCountRef.current++;
          if (i === 0 && canvas) {
            resizeCanvas();
            drawFrame(0);
          }
        };
        images.push(img);
      }
      imagesRef.current = images;
    }

    function resizeCanvas() {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;

      const renderedW = canvas.getBoundingClientRect().width;
      const renderedH = canvas.getBoundingClientRect().height;

      canvas.width = Math.round(renderedW * dpr);
      canvas.height = Math.round(renderedH * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawFrame(frameIndexRef.current);
    }

    function drawFrame(index) {
      const img = imagesRef.current[index];
      if (!img || !img.complete || !img.naturalWidth) return;

      const dpr = window.devicePixelRatio || 1;
      const displayW = canvas.width / dpr;
      const displayH = canvas.height / dpr;

      ctx.clearRect(0, 0, displayW, displayH);

      const imgRatio = img.naturalWidth / img.naturalHeight;
      const canvasRatio = displayW / displayH;

      let drawW, drawH, offsetX, offsetY;
      if (imgRatio > canvasRatio) {
        drawH = displayH;
        drawW = displayH * imgRatio;
        offsetX = (displayW - drawW) / 2;
        offsetY = 0;
      } else {
        drawW = displayW;
        drawH = displayW / imgRatio;
        offsetX = 0;
        offsetY = (displayH - drawH) / 2;
      }

      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
    }

    const animateIn = () => {
      gsap.to(progressVideo, {
        opacity: 1,
        y: 0,
        duration: 0.3,
        ease: "power3.out",
      });
    };

    const animateOut = () => {
      gsap.to(progressVideo, {
        opacity: 0,
        y: "100%",
        duration: 0.3,
        ease: "power3.in",
      });
    };

    const gsapCtx = gsap.context(() => {
      const proxy = { frame: 0 };

      gsap.to(proxy, {
        frame: TOTAL_FRAMES - 1,
        snap: "frame",
        ease: "none",
        scrollTrigger: {
          trigger: videoSectionRef.current,
          pin: true,
          scrub: true,
          start: "top top",
          end: "+=1000vh",
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            if (progressInner) {
              progressInner.style.width = `${self.progress * 100}%`;
            }
          },
          onEnter: animateIn,
          onEnterBack: animateIn,
          onLeave: animateOut,
          onLeaveBack: animateOut,
        },
        onUpdate: () => {
          const newFrame = Math.round(proxy.frame);
          if (newFrame !== frameIndexRef.current) {
            frameIndexRef.current = newFrame;
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = requestAnimationFrame(() => {
              drawFrame(newFrame);
            });
          }
        },
      });
    }, containerRef);

    preloadImages();

    const handleResize = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      resizeCanvas();
      ScrollTrigger.refresh();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      gsapCtx.revert();
      window.removeEventListener("resize", handleResize);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  const canvasStyle = {};
  if (CANVAS_WIDTH) canvasStyle.width = CANVAS_WIDTH;
  if (CANVAS_HEIGHT) canvasStyle.height = CANVAS_HEIGHT;

  return (
    <div className="main-video-play-on-scroll" ref={containerRef}>
      <div className="first-section-scroll-down">
        <h1>Scroll Down</h1>
      </div>
      <div className="video-section-main" ref={videoSectionRef}>
        <div className="wrap-video">
          <div className="progress-video" ref={progressVideoRef}>
            <div className="progress-inner"></div>
          </div>
          <canvas
            ref={canvasRef}
            className="video-canvas"
            style={canvasStyle}
          />
        </div>
      </div>
      <div className="last-section-bye-bye">
        <h1>See you soon!</h1>
      </div>
    </div>
  );
}
