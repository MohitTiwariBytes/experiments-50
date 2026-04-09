import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import Home from "./Pages/Home/Home";
import ReactLenis from "lenis/react";
import Experiment01 from "./Pages/Experiments/Experiment01/Experiment01";
import Experiment02 from "./Pages/Experiments/Experiment02/Experiment02";
import Experiment03 from "./Pages/Experiments/Experiment03/Experiment03";
import Experiment04 from "./Pages/Experiments/Experiment04/Experiment04";
import Experiment05 from "./Pages/Experiments/Experiment05/Experiment05";
import Experiment06 from "./Pages/Experiments/Experiment06/Experiment06";
import Experiment07 from "./Pages/Experiments/Experiment07/Experiment07";
import Experiment08 from "./Pages/Experiments/Experiment08/Experiment08";

function App() {
  return (
    <>
      <ReactLenis root>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home></Home>}></Route>
            <Route
              path="/effects/01"
              element={<Experiment01></Experiment01>}
            ></Route>
            <Route
              path="/effects/02"
              element={<Experiment02></Experiment02>}
            ></Route>
            <Route
              path="/effects/03"
              element={<Experiment03></Experiment03>}
            ></Route>
            <Route
              path="/effects/04"
              element={<Experiment04></Experiment04>}
            ></Route>
            <Route
              path="/effects/05"
              element={<Experiment05></Experiment05>}
            ></Route>
            <Route
              path="/effects/06"
              element={<Experiment06></Experiment06>}
            ></Route>
            <Route
              path="/effects/07"
              element={<Experiment07></Experiment07>}
            ></Route>
            <Route
              path="/effects/08"
              element={<Experiment08></Experiment08>}
            ></Route>
            <Route path="*" element={<Experiment01></Experiment01>}></Route>
          </Routes>
        </BrowserRouter>
      </ReactLenis>
    </>
  );
}

export default App;
