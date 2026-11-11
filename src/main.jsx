import { StrictMode } from 'react'
import { createRoot } from "react-dom/client";
import TuitionCalculator from "./App.jsx";

class TuitionCalculatorElement extends HTMLElement {
  connectedCallback() {
    const container = document.createElement("div");
    this.appendChild(container);
    const root = createRoot(container);
    root.render(
      <StrictMode>
        <TuitionCalculator />
      </StrictMode>);
  }
}

customElements.define("tuition-calculator", TuitionCalculatorElement);