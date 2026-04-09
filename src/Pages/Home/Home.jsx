import React from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import ChevronRight from "@geist-ui/icons/chevronRight";

import "./Home.css";

const effects = [
  {
    title: "Pixel Text Distortion",
    image:
      "https://cdn.hackclub.com/019d7042-7cc6-7585-8d63-7f66b63b994c/PixelDistort.png",
    link: "/effects/01",
  },
  {
    title: "Dissolve Text",
    image:
      "https://cdn.hackclub.com/019d707c-87f9-7224-b84d-99d6d408995e/Group%2058.png",
    link: "/effects/02",
  },
  {
    title: "Liquid Ascii",
    image:
      "https://cdn.hackclub.com/019d708c-8759-7b66-bd2c-9664b000ebcf/Group%2059.png",
    link: "/effects/03",
  },
];

export default function Home() {
  return (
    <div className="main-home-page">
      <div className="homePage">
        <div className="grp-main-homepage">
          <h1>
            <span style={{ fontSize: "clamp(65px, 9vw, 140px)" }}>
              <p style={{ color: "#747474" }}>{effects.length}</p>/50
            </span>{" "}
            Experiments
          </h1>
          <span id="desc">
            {effects.length}/50 WebGL & GSAP experiments made by Mohit Tiwari
          </span>
        </div>
        <div className="effects">
          {effects.map((effect, i) => (
            <div
              className="effect"
              key={i}
              onClick={() => (window.location.href = effect.link)}
              style={{ cursor: "pointer" }}
            >
              <div className="image">
                <img src={effect.image} alt={effect.title} />
              </div>
              <div className="effect-info">
                <span>{effect.title}</span>
                <div className="open-btn">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = effect.link;
                    }}
                  >
                    <ChevronRight size={25} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
