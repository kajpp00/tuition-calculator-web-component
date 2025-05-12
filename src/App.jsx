import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import "./TuitionCalculator.css";

export default function TuitionCalculator() {
  const [level, setLevel] = useState("undergraduate");
  const [residency, setResidency] = useState("resident");
  const [hours, setHours] = useState(15);
  const [housing, setHousing] = useState("home");
  const [term, setTerm] = useState("single");
  const [cost, setCost] = useState(null);
  const [animatedCost, setAnimatedCost] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const normalizeHeaders = (data) => {
    return data.map(row => {
      const normalizedRow = {};
      for (const key in row) {
        normalizedRow[key.toLowerCase()] = row[key];
      }
      return normalizedRow;
    });
  };

  function removeDecimalAndFormat(input) {
    const num = parseFloat(input.toString().replace(/,/g, ''));
    const wholeNumber = Math.trunc(num);
    return wholeNumber.toLocaleString();
  }

  const animateValue = (start, end) => {
    let startTimestamp = null;
    const duration = 1000;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const value = Math.floor(progress * (end - start) + start);
      setAnimatedCost(value.toLocaleString());
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  };

  useEffect(() => {
    if (cost !== null) {
      const numericCost = parseInt(cost.replace(/,/g, ''));
      animateValue(0, numericCost);
    }
  }, [cost]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCost(null);
    setAnimatedCost(null);
    setBreakdown(null);
    setShowBreakdown(true);

    const fileName = `${level}-${residency}.csv`;

    try {
      // const baseUrl = 'https://tamuk-tuition-calculator-webcomponent.netlify.app'
      const baseURL = 'https://tamuk.wr.ardent.dev/wp-content/uploads/2025/05' 
      const response = await fetch(`${baseURL}/${fileName}`);
      const text = await response.text();
      const parsed = Papa.parse(text, { header: true });
      const normalizedData = normalizeHeaders(parsed.data);

      const match = normalizedData.find((row) => parseInt(row.hours) === hours);

      if (match) {
        const additionalRes = await fetch("dist/additional-costs.csv");
        const additionalText = await additionalRes.text();
        const additionalParsed = Papa.parse(additionalText, { header: true });
        const additionalData = normalizeHeaders(additionalParsed.data);

        const selectedRow = additionalData.find(row => row["housing option"] === housing);

        let foodAndHousing = selectedRow ? parseFloat(selectedRow["food and housing"].replace(/,/g, '')) || 0 : 0;
        let transportation = selectedRow ? parseFloat(selectedRow["transportation"].replace(/,/g, '')) || 0 : 0;
        let miscellaneous = selectedRow ? parseFloat(selectedRow["miscellaneous"].replace(/,/g, '')) || 0 : 0;
        const booksKey = level === "undergraduate" ? "undergraduate books" : "graduate books";
        let booksCost = selectedRow ? parseFloat(selectedRow[booksKey].replace(/,/g, '')) || 0 : 0;

        if (term === "single") {
          foodAndHousing /= 2;
          transportation /= 2;
          miscellaneous /= 2;
          booksCost /= 2;
        }

        let baseTotal = parseFloat(match.total.toString().replace(/,/g, ''));
        if (term === "fallspring") {
          baseTotal *= 2;
        }

        const totalCost = baseTotal + foodAndHousing + transportation + miscellaneous + booksCost;

        setCost(removeDecimalAndFormat(totalCost));
        setBreakdown({ 
          tuition: { ...match },
          foodHousing: { "food and housing": foodAndHousing },
          additional: { transportation, miscellaneous, books: booksCost }
        });
      } else {
        setBreakdown(null);
      }
    } catch (err) {
      console.error("Error loading or parsing the CSV file.", err);
    }
  };

  return (
    <div className="container">
      <h1 className="heading">Tuition Cost Calculator</h1>
      <form onSubmit={handleSubmit} className="form">
        <div>
          <label>Level of Study</label><br />
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="undergraduate">Undergraduate</option>
            <option value="graduate">Graduate</option>
          </select>
        </div>

        <div>
          <label>Residency Status</label><br />
          <select value={residency} onChange={(e) => setResidency(e.target.value)}>
            <option value="resident">Resident</option>
            <option value="nonresident">Non-Resident</option>
          </select>
        </div>

        <div>
          <label>Housing</label><br />
          <label><input type="radio" value="home" checked={housing === "home"} onChange={(e) => setHousing(e.target.value)} /> At Home</label>
          <label><input type="radio" value="dorm" checked={housing === "dorm"} onChange={(e) => setHousing(e.target.value)} /> Dorm</label>
          <label><input type="radio" value="off campus" checked={housing === "off campus"} onChange={(e) => setHousing(e.target.value)} /> Off Campus</label>
        </div>

        <div>
          <label>Enrollment Term</label><br />
          <label><input type="radio" value="single" checked={term === "single"} onChange={(e) => setTerm(e.target.value)} /> Single Semester</label>
          <label><input type="radio" value="fallspring" checked={term === "fallspring"} onChange={(e) => setTerm(e.target.value)} /> Fall & Spring</label>
        </div>

        <div>
          <label>Number of Hours: {hours}</label><br />
          <input
            type="range"
            value={hours}
            onChange={(e) => setHours(parseInt(e.target.value))}
            min="1"
            max="21"
          />
        </div>

        <button type="submit" className="button">Calculate</button>
      </form>

      {animatedCost && (
        <div className="result">
          Estimated Cost: ${animatedCost}
          <div>
            <button onClick={() => setShowBreakdown(!showBreakdown)}>
              {showBreakdown ? "Hide Breakdown" : "Show Breakdown"}
            </button>
          </div>
        </div>
      )}

      {showBreakdown && breakdown && (
        <div className="breakdown">
          <h2>Cost Breakdown:</h2>
          <div className="breakdown-columns">
            <div className="column">
              <h3>Tuition & Fees: ${removeDecimalAndFormat(term === "fallspring" ? parseFloat(breakdown.tuition.total.toString().replace(/,/g, '')) * 2 : parseFloat(breakdown.tuition.total.toString().replace(/,/g, '')))}</h3>
              <ul>
                {Object.entries(breakdown.tuition).map(([key, value]) => (
                  key !== "total" ? (
                    <li key={key}><strong>{key}</strong>: {key === "hours" ? value : `$${removeDecimalAndFormat(value)}`}</li>
                  ) : null
                ))}
              </ul>
            </div>
            <div className="column">
              <h3>Food & Housing: ${removeDecimalAndFormat(breakdown.foodHousing["food and housing"])}</h3>
            </div>
            <div className="column">
              <h3>Indirect Costs: ${removeDecimalAndFormat(Object.values(breakdown.additional).reduce((sum, value) => sum + value, 0))}</h3>
              <ul>
                {Object.entries(breakdown.additional).map(([key, value]) => (
                  <li key={key}><strong>{key}</strong>: ${removeDecimalAndFormat(value)}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}