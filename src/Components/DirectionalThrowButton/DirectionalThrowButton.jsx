import React, { useEffect, useRef } from "react";
import "./DirectionalThrowButton.css";
import gsap from "gsap";
import CustomEase from "gsap/CustomEase";

gsap.registerPlugin(CustomEase);

// Flop product 😡🤬

export default function DirectionalThrowButton({ text = "Hover me!" }) {
  const duplicateTxtRef = useRef(null);
  const primaryTextRef = useRef(null);

  useEffect(() => {
    CustomEase.create("backEase", ".26,.2,0,1.31");
    CustomEase.create("smoothEase", "0.825, 0.08, 0.04, 1");

    gsap.set(duplicateTxtRef.current, { rotate: "20" });
  }, []);

  const handleMouseIn = () => {
    gsap.to(duplicateTxtRef.current, {
      rotate: 0,
      top: 0,
      opacity: 1,
      ease: "smoothEase",
      duration: 0.4,
    });
    gsap.to(primaryTextRef.current, {
      rotate: "-20",
      opacity: 0,
      y: "-200%",
      ease: "smoothEase",
      duration: 4,
    });
  };
  const handleMouseOut = () => {
    gsap.to(duplicateTxtRef.current, {
      rotate: 20,
      top: "200%",
      ease: "smoothEase",
      duration: 0.4,
      opacity: 0,
    });
    gsap.to(primaryTextRef.current, {
      rotate: 0,
      y: 0,
      ease: "smoothEase",
      duration: 0.4,
      opacity: 1,
    });
  };

  return (
    <div className="main-directional-throw-button">
      <button
        onMouseEnter={handleMouseIn}
        onMouseLeave={handleMouseOut}
        id="btn-directional"
      >
        <div ref={primaryTextRef} className="primary-txt">
          <span>{text}</span>
        </div>
        <div ref={duplicateTxtRef} className="text-duplicate">
          <span>{text}</span>
        </div>
      </button>
    </div>
  );
}
