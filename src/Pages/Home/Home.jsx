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
  {
    title: "Video Play On Scroll",
    image:
      "https://cdn.hackclub.com/019d70a5-e41b-7709-a18a-b914619966a4/image%204.png",
    link: "/effects/04",
  },
  {
    title: "Image Trail",
    image:
      "https://cdn.hackclub.com/019d70a9-aff1-7bc8-ac24-acdb9a550da1/Group%2060.png",
    link: "/effects/05",
  },
  {
    title: "Floating Stickers",
    image:
      "https://cdn.hackclub.com/019d70be-21f5-7942-b221-ba8f45965b45/Group%2061.png",
    link: "/effects/06",
  },
  {
    title: "Slanted Button",
    image:
      "https://cdn.hackclub.com/019d70c5-f44f-7661-b506-5f7d58f3025e/Group%2063.png",
    link: "/effects/07",
  },
  {
    title: "3D Image (Depth Effect)",
    image:
      "https://cdn.hackclub.com/019d70d3-c8e9-7b12-9515-4ef1f98a3545/Group%2064.png",
    link: "/effects/08",
  },
  {
    title: "Floating Menu",
    image:
      "https://cdn.hackclub.com/019d70db-5f8a-7e80-be91-6b0352647888/Screenshot%202026-04-09%20113630.png",
    link: "/effects/09",
  },
  {
    title: "Curved Marquee",
    image:
      "https://cdn.hackclub.com/019d70e1-5d45-7d3a-884b-18f39c371c2d/image%208%20(2).png",
    link: "/effects/10",
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
