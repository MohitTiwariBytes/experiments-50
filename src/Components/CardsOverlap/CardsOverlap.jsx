import React, { useEffect } from "react";
import "./CardsOverlap.css";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function CardsOverlap() {
  useEffect(() => {
    let ctx = gsap.context(() => {
      const cards = gsap.utils.toArray(".card");

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: ".slides-wrapper",
          start: "top top",
          end: () => `+=${cards.length * 100}%`,
          scrub: true,
          pin: true,
          pinSpacing: true,
        },
      });

      cards.forEach((card, i) => {
        const prev = cards[i - 1];

        // where the incoming card starts
        const startX = gsap.getProperty(card, "x");
        const startRotation = gsap.getProperty(card, "rotate");

        // incoming card
        tl.to(card, {
          x: 0,
          y: 0,
          rotate: 0,
          duration: 1,
          ease: "none",
          borderRadius: 0,
        });

        // outgoing card moves opposite direction
        if (prev) {
          tl.to(
            prev,
            {
              borderRadius: 20,
              opacity: 0,
              x: -startX * 0.2,
              rotate: -startRotation * 2,
              duration: 1,
              ease: "none",
              delay: 0.2,
            },
            "<",
          );
        }
      });
    });

    return () => ctx.revert();
  }, []);
  useEffect(() => {
    gsap.to(".text", {
      opacity: 0,
      scale: 0.5,
      ease: "none",
      scrollTrigger: {
        trigger: ".section-1",
        scrub: true,
        start: "top top",
      },
    });
  }, []);

  return (
    <div className="main-cards-overlap">
      <div className="cards-overlap">
        <div className="section-1">
          <div className="text">
            <h1>Scroll Down</h1>
          </div>
        </div>

        <div className="slides-wrapper">
          <div className="slides">
            <div className="card first">
              <h1>First Card</h1>
            </div>
            <div className="card second">
              <h1>Second Card</h1>
            </div>
            <div className="card third">
              <h1>Third Card</h1>
            </div>
            <div className="card fourth">
              <h1>Fourth Card</h1>
            </div>
            <div className="card fifth">
              <h1>Fifth Card</h1>
            </div>
          </div>
        </div>

        <div className="section-2">
          <h1>Hasta la vista, baby.</h1>
          <span>(See you soooon!)</span>
        </div>
      </div>
    </div>
  );
}
