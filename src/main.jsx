window.process = { env: { NODE_ENV: 'production' } };
import { createRoot } from "react-dom/client";
import TuitionCalculator from "./App.jsx";

class TuitionCalculatorElement extends HTMLElement {
  connectedCallback() {
    const container = document.createElement("div");
    this.appendChild(container);
    const root = createRoot(container);
    root.render(<TuitionCalculator />);
  }
}

customElements.define("tuition-calculator", TuitionCalculatorElement);