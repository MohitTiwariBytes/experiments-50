import React from "react";
import "./Experiment07.css";
import DirectionalThrowButton from "../../../Components/DirectionalThrowButton/DirectionalThrowButton";
import Grid from "@geist-ui/icons/grid";
import ArrowRight from "@geist-ui/icons/arrowRight";
import ArrowLeft from "@geist-ui/icons/arrowLeft";

export default function Experiment07() {
  const MAX = 11;
  const name = "Slanted Button";

  const navigate = (dir) => {
    const parts = window.location.pathname.split("/");
    const num = parseInt(parts[parts.length - 1]);
    if (!isNaN(num)) {
      let next = num + dir;
      if (next > MAX) next = 1;
      if (next < 1) next = MAX;
      parts[parts.length - 1] = String(next).padStart(2, "0");
      window.location.href = parts.join("/");
    }
  };

  return (
    <div className="main-experiment">
      <div className="controls">
        <div className="left-controls">
          <div
            onClick={() => {
              window.location.replace("/");
            }}
            className="collection-link"
          >
            <span>
              <Grid size={20}></Grid> All Experiments
            </span>
          </div>
          <div className="grp-bla-bla">
            <div className="next" onClick={() => navigate(-1)}>
              <ArrowLeft></ArrowLeft>
            </div>
            <div className="previous" onClick={() => navigate(1)}>
              <ArrowRight></ArrowRight>
            </div>
          </div>
        </div>
        <div className="right-controls">
          <div className="name-effect">
            <span>{name}</span>
          </div>
        </div>
      </div>

      <DirectionalThrowButton text="Contact Us"></DirectionalThrowButton>
    </div>
  );
}
