import React from 'react';
import './TuitionCalculator.css'; // For styling

const Tooltip = ({ text, children }) => (
  <div className="tooltip-container">
    {children}
    <span className="tooltip-text">{text}</span>
  </div>
);

export default Tooltip;
