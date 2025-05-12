import React from "react";
import { createRoot } from "react-dom/client";
import TuitionCalculator from "./App";

class TuitionCalculatorElement extends HTMLElement {
  connectedCallback() {
    const container = document.createElement("div");
    this.appendChild(container);
    const root = createRoot(container);
    root.render(<TuitionCalculator />);
  }
}

customElements.define("tuition-calculator", TuitionCalculatorElement);
