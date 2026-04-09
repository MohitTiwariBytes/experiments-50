import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import Home from "./Pages/Home/Home";
import ReactLenis from "lenis/react";
import Experiment01 from "./Pages/Experiments/Experiment01/Experiment01";
import Experiment02 from "./Pages/Experiments/Experiment02/Experiment02";

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
          </Routes>
        </BrowserRouter>
      </ReactLenis>
    </>
  );
}

export default App;
