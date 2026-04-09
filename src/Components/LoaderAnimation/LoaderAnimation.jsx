import React, { useEffect, useRef, useState, useCallback } from "react";
import "./LoaderAnimation.css";
import gsap from "gsap";
import CustomEase from "gsap/CustomEase";

gsap.registerPlugin(CustomEase);

const logs = [
  "// initializing...",
  "[site] loading configuration",
  "[env] resolving environment",
  "[router] mapping routes",
  "[data] fetching content payload",
  "[data] parsing JSON structure",
  "[ui] building layout tree",
  "[ui] applying responsive rules",
  "[fonts] loading web fonts",
  "[media] preloading images",
  "[media] optimizing assets",
  "[scroll] initializing smooth scroll",
  "[anim] registering animations",
  "[anim] compiling timelines",
  "[shader] compiling effects",
  "[gpu] preparing render pass",
  "[state] hydrating application state",
  "[cache] caching static assets",
  "[perf] optimizing render pipeline",
  "[events] binding interactions",
  "[access] enabling keyboard input",
  "[final] verifying layout integrity",
];

const readyLog = "[ready] application loaded";

export default function LoaderAnimation() {
  const logsTopRef = useRef(null);
  const [isComplete, setIsComplete] = useState(false);
  const timeoutIdsRef = useRef([]);
  const isLoadedRef = useRef(false);
  const renderedCountRef = useRef(0);
  const readyRenderedRef = useRef(false);
  const loaderRef = useRef(null);
  const logoContainerRef = useRef(null);
  const logoRef = useRef(null);

  useEffect(() => {
    CustomEase.create("smoothEase", "0.825, 0.08, 0.04, 1");
  }, []);

  const handleLoad = useCallback(() => {
    if (readyRenderedRef.current) return;
    readyRenderedRef.current = true;

    const container = logsTopRef.current;
    const minDelay = Math.max(0, 1500 - performance.now());

    setTimeout(() => {
      isLoadedRef.current = true;

      timeoutIdsRef.current.forEach(clearTimeout);
      timeoutIdsRef.current = [];

      const readySpan = document.createElement("span");
      readySpan.textContent = readyLog;
      readySpan.style.cssText = "opacity: 0; color: #00ff00";
      container.appendChild(readySpan);

      gsap.to(readySpan, {
        opacity: 1,
        duration: 0.3,
        ease: "power2.out",
      });

      gsap.to(loaderRef.current, {
        background: "green",
        color: "black!important",
        ease: "none",
        duration: 0.001,
        delay: 0.9,
        onComplete: () => {
          gsap.to(loaderRef.current, {
            background: "#121212",
            color: "white",
            ease: "none",
            duration: 0.001,
            delay: 0.2,
          });
          container.style.display = "none";
          gsap.to(logoContainerRef.current, {
            opacity: 1,
            ease: "none",
            duration: 0.001,
            delay: 0.2,
            onComplete: () => {
              gsap.to(logoRef.current, {
                scale: 1.1,
                opacity: 0,
                ease: "smoothEase",
                duration: 0.6,
                delay: 1.4,
                onComplete: () => {
                  const logoContainer = logoContainerRef.current;
                  const logo = logoRef.current;
                  logoContainer.style.display = "none";
                  logo.style.display = "none";
                  gsap.to(loaderRef.current, {
                    opacity: 0,
                    duration: 0.3,
                    ease: "ease",
                    delay: 0.3,
                    onComplete: () => {
                      loaderRef.current.style.display = "none";
                    },
                  });
                },
              });
            },
          });
        },
      });

      setIsComplete(true);
    }, minDelay);
  }, []);

  useEffect(() => {
    const container = logsTopRef.current;
    if (!container) return;

    container.innerHTML = "";

    let cumulativeDelay = 0;
    const fragment = document.createDocumentFragment();

    logs.forEach((log, index) => {
      const randomDelay = Math.random() * 140 + 80;
      cumulativeDelay += randomDelay;

      const timeoutId = setTimeout(() => {
        if (index >= 5 && isLoadedRef.current) return;

        const span = document.createElement("span");
        span.textContent = log;
        span.style.opacity = "0";
        container.appendChild(span);

        gsap.to(span, {
          opacity: 1,
          duration: 0.3,
          ease: "power2.out",
        });

        renderedCountRef.current = index + 1;
      }, cumulativeDelay);

      timeoutIdsRef.current.push(timeoutId);
    });

    if (document.readyState === "complete") {
      handleLoad();
    } else {
      window.addEventListener("load", handleLoad);
    }

    return () => {
      window.removeEventListener("load", handleLoad);
      timeoutIdsRef.current.forEach(clearTimeout);
    };
  }, [handleLoad]);

  return (
    <div ref={loaderRef} className="main-loader">
      <div className="loader">
        <div className="logs-top" ref={logsTopRef}></div>
        <div ref={logoContainerRef} className="logo-main">
          <svg
            ref={logoRef}
            width="300"
            height="71"
            viewBox="0 0 300 71"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clipPath="url(#clip0_369_88)">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M17.7778 4.4375V71H0V4.4375H17.7778Z"
                fill="white"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M26.6665 4.4375H64.4443C76.7173 4.4375 86.6665 14.3712 86.6665 26.625C86.6665 38.8789 76.7173 48.8125 64.4443 48.8125H44.4443V71H26.6665V4.4375ZM44.4443 31.0625H64.4443C66.899 31.0625 68.8888 29.0757 68.8888 26.625C68.8888 24.1743 66.899 22.1875 64.4443 22.1875H44.4443V31.0625Z"
                fill="white"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M153.333 4.4375V38.8281C153.333 46.7931 159.8 53.25 167.778 53.25C175.755 53.25 182.223 46.7931 182.223 38.8281V4.4375H200.001V38.8281C200.001 56.5962 185.574 71 167.778 71C149.982 71 135.556 56.5962 135.556 38.8281V4.4375H153.333Z"
                fill="white"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M93.3334 35.5C93.3334 18.3446 107.262 4.4375 124.444 4.4375H128.889V22.1875H124.444C117.081 22.1875 111.111 28.1478 111.111 35.5V37.7187C111.111 56.0994 96.1873 71 77.7778 71H75.5557V53.25H77.7778C86.369 53.25 93.3334 46.2964 93.3334 37.7187V35.5Z"
                fill="white"
              />
              <path
                d="M300 6.65625C300 10.3324 297.016 13.3125 293.333 13.3125C289.651 13.3125 286.667 10.3324 286.667 6.65625C286.667 2.9801 289.651 0 293.333 0C297.016 0 300 2.9801 300 6.65625Z"
                fill="white"
              />
              <path
                d="M219.089 71L227.572 35.5321L233.879 56.8698C237.639 69.5962 255.694 69.5962 259.456 56.8698L265.761 35.5321L274.244 71H292.521L279.183 15.2286C276.011 1.96571 257.292 1.47464 253.425 14.5531L246.667 37.4229L239.908 14.5531C236.043 1.47472 217.322 1.96564 214.15 15.2286L200.812 71H219.089Z"
                fill="white"
              />
            </g>
            <defs>
              <clipPath id="clip0_369_88">
                <rect width="300" height="71" fill="white" />
              </clipPath>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  );
}
