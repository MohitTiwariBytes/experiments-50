import React, { useEffect, useRef } from "react";
import "./CardsFlip.css";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function CardsFlip() {
  const cardsRef = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const leftWrapper = cardsRef.current[0]?.closest(".card-wrapper");
      const middleWrapper = cardsRef.current[1]?.closest(".card-wrapper");
      const rightWrapper = cardsRef.current[2]?.closest(".card-wrapper");

      const middleRect = middleWrapper.getBoundingClientRect();
      const leftRect = leftWrapper.getBoundingClientRect();
      const rightRect = rightWrapper.getBoundingClientRect();

      const leftToCenter = middleRect.left - leftRect.left;
      const rightToCenter = middleRect.left - rightRect.left;

      // card-right moves FIRST and goes LEFT
      gsap.fromTo(
        rightWrapper,
        { x: rightToCenter },
        {
          x: 0,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".cards-main",
            start: "top bottom-=700px",
            scrub: true,
          },
        },
      );

      // card-left moves AFTER and goes RIGHT
      gsap.fromTo(
        leftWrapper,
        { x: leftToCenter },
        {
          x: 0,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".cards-main",
            start: "top bottom-=500px",
            scrub: true,
          },
        },
      );

      // middle stays put
      gsap.to(".cards-main", {
        scrollTrigger: {
          trigger: ".cards-main",
          pin: true,
          start: "top top",
        },
      });

      gsap.to(cardsRef.current[2], {
        transform: "translate3d(0px, 0px, 0px) rotateY(-180deg)",
        ease: "back",
        scrollTrigger: {
          trigger: ".cards-main",
          start: "top bottom-=700px",
          scrub: true,
        },
      });

      gsap.to(cardsRef.current[1], {
        transform: "translate3d(0px, 0px, 0px) rotateY(-180deg)",
        ease: "back",
        scrollTrigger: {
          trigger: ".cards-main",
          start: "top bottom-=700px",
          scrub: true,
        },
      });

      gsap.to(cardsRef.current[0], {
        transform: "translate3d(0px, 0px, 0px) rotateY(-180deg)",
        rotateY: -180,
        ease: "back",
        scrollTrigger: {
          trigger: ".cards-main",
          start: "top bottom-=600px",
          scrub: true,
        },
      });
    });

    return () => ctx.revert();
  }, []);
  const svgPath =
    "M285.392 261.781L516.046 223.791C576.905 593.289 667.028 793.109 754.923 887.599C796.389 932.178 834.847 950.709 869.075 956.806C904.377 963.095 946.741 958.159 998.004 936.347C1104.45 891.052 1226.63 782.501 1347.99 628.231C1467.22 476.666 1576.77 292.386 1661.21 112.203C1691.33 47.9445 1759.72 31.854 1808.59 46.8379C1856.48 61.5238 1902.45 110.729 1894.82 178.328L1894.82 178.33L1640.58 2429.11L1402.1 2402.17L1594.36 700.031C1575.44 726.182 1556.18 751.752 1536.62 776.618C1406.44 942.097 1253.84 1088.31 1091.97 1157.19C1009.08 1192.46 918.898 1209.46 826.985 1193.09C733.999 1176.52 650.57 1127.79 579.195 1051.06C564.787 1035.57 550.799 1018.87 537.229 1000.94L566.578 2285.73L326.64 2291.21L280.476 270.267C280.062 267.781 279.647 265.291 279.236 262.795L280.302 262.619L280.285 261.898L285.392 261.781Z";

  const renderCard = (className, index) => (
    <div
      className={`card ${className}`}
      ref={(el) => (cardsRef.current[index] = el)}
    >
      <div className="card-front">
        <svg
          width="155"
          height="185"
          viewBox="0 0 2254 2637"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d={svgPath} fill="red" />
        </svg>
      </div>
      <div className="card-back">
        <h1>bye gng</h1>
      </div>
    </div>
  );

  return (
    <div className="main-cards-flip">
      <div className="cards-main">
        <div className="card-wrapper card-left">{renderCard("first", 0)}</div>
        <div className="card-wrapper card-middle">
          {renderCard("second", 1)}
        </div>
        <div className="card-wrapper card-right">{renderCard("third", 2)}</div>
      </div>
    </div>
  );
}
