import React from "react";
import "./Experiment08.css";
import Grid from "@geist-ui/icons/grid";
import ArrowRight from "@geist-ui/icons/arrowRight";
import ArrowLeft from "@geist-ui/icons/arrowLeft";
import ParallaxDepthImage from "../../../Components/Image3dMap/Image3dMap";

export default function Experiment08() {
  const MAX = 11;
  const name = "3D Image Depth Effect";

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

      <ParallaxDepthImage></ParallaxDepthImage>
    </div>
  );
}
