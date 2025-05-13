import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import "./TuitionCalculator.css";

export default function TuitionCalculator() {
  const [level, setLevel] = useState("undergraduate");
  const [residency, setResidency] = useState("resident");
  const [hours, setHours] = useState(15);
  const [housing, setHousing] = useState("home");
  const [term, setTerm] = useState("fallspring");
  const [cost, setCost] = useState(null);
  const [animatedCost, setAnimatedCost] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [tuitionData, setTuitionData] = useState({});
  const [additionalData, setAdditionalData] = useState([]);
  const baseURL = 'https://www.tamuk.edu/_wp_rd_content/_wp_misc_feeds/tuition-calculator';

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
    const num = parseFloat(input?.toString().replace(/,/g, '') || '0');
    if (isNaN(num)) {
      console.error("Invalid value used in removeDecimalAndFormat:", input);
      return "0";
    }
    const wholeNumber = Math.trunc(num);
    return wholeNumber.toLocaleString();
  }

  const animateValue = (start, end) => {
    let startTimestamp = null;
    const duration = 500;
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
    const loadCSVs = async () => {
      try {
        const files = [
          'undergraduate-resident.csv',
          'undergraduate-nonresident.csv',
          'graduate-resident.csv',
          'graduate-nonresident.csv'
        ];
        const tuitionResults = {};

        for (const file of files) {
          const res = await fetch(`${baseURL}/${file}`);
          const text = await res.text();
          const parsed = Papa.parse(text, { header: true });
          tuitionResults[file.replace('.csv', '')] = normalizeHeaders(parsed.data);
        }

        const additionalRes = await fetch(`${baseURL}/additional-costs.csv`);
        const additionalText = await additionalRes.text();
        const additionalParsed = Papa.parse(additionalText, { header: true });
        setAdditionalData(normalizeHeaders(additionalParsed.data));

        setTuitionData(tuitionResults);
      } catch (err) {
        console.error("Failed to load CSVs", err);
      }
    };

    loadCSVs();
  }, []);

  useEffect(() => {
    const fileKey = `${level}-${residency}`;
    const data = tuitionData[fileKey] || [];
    const match = data.find((row) => parseInt(row.hours) === hours);

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

    // setShowBreakdown(true);

    if (match) {
      let baseTotal = parseFloat(match.total?.toString().replace(/,/g, '') || '0');
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
      setCost("N/A");
      setBreakdown({
        tuition: { hours },
        foodHousing: { "food and housing": foodAndHousing },
        additional: { transportation, miscellaneous, books: booksCost }
      });
    }
  }, [level, residency, hours, housing, term, tuitionData, additionalData]);

  useEffect(() => {
    if (cost !== null && cost !== "N/A") {
      const numericCost = parseInt(cost.replace(/,/g, ''));
      animateValue(0, numericCost);
    }
  }, [cost]);

  return (
    <div className="calculator-wrapper">
      <h1 className="heading">Tuition Cost Calculator</h1>
  
      <form className="calculator-form">
        <fieldset className="form-group">
          <legend>Level of Study</legend>
          <label><input type="radio" value="undergraduate" checked={level === "undergraduate"} onChange={(e) => setLevel(e.target.value)} /> Undergraduate</label>
          <label><input type="radio" value="graduate" checked={level === "graduate"} onChange={(e) => setLevel(e.target.value)} /> Graduate</label>
        </fieldset>
  
        <fieldset className="form-group">
          <legend>Residency Status</legend>
          <label><input type="radio" value="resident" checked={residency === "resident"} onChange={(e) => setResidency(e.target.value)} /> Resident</label>
          <label><input type="radio" value="nonresident" checked={residency === "nonresident"} onChange={(e) => setResidency(e.target.value)} /> Non-Resident</label>
        </fieldset>
  
        <fieldset className="form-group">
          <legend>Housing</legend>
          <label><input type="radio" value="home" checked={housing === "home"} onChange={(e) => setHousing(e.target.value)} /> At Home</label>
          <label><input type="radio" value="dorm" checked={housing === "dorm"} onChange={(e) => setHousing(e.target.value)} /> Dorm</label>
          <label><input type="radio" value="off campus" checked={housing === "off campus"} onChange={(e) => setHousing(e.target.value)} /> Off Campus</label>
        </fieldset>
  
        <fieldset className="form-group">
          <legend>Enrollment Term</legend>
          <label><input type="radio" value="fallspring" checked={term === "fallspring"} onChange={(e) => setTerm(e.target.value)} /> Fall & Spring</label>
          <label><input type="radio" value="single" checked={term === "single"} onChange={(e) => setTerm(e.target.value)} /> Single Semester</label>
        </fieldset>
  
        <div className="form-group hours-slider">
          <label htmlFor="hours">Number of Hours: {hours}</label>
          <input
            id="hours"
            type="range"
            value={hours}
            onChange={(e) => setHours(parseInt(e.target.value))}
            min="1"
            max="21"
          />
        </div>
      </form>
  
      {animatedCost && (
        <div className="sticky-result">
          <div className="estimated-cost">Estimated Cost: <strong>${animatedCost}</strong></div>
          <button className="toggle-breakdown" onClick={() => setShowBreakdown(!showBreakdown)}>
            {showBreakdown ? "Hide Breakdown" : "Show Breakdown"}
          </button>
        </div>
      )}
  
      {showBreakdown && breakdown && (
        <div className="breakdown">
          <h2>Cost Breakdown</h2>
          <div className="breakdown-columns">
            <div className="column">
              <h3>Tuition & Fees</h3>
              <p>${removeDecimalAndFormat(
                breakdown.tuition.total
                  ? term === "fallspring"
                    ? parseFloat(breakdown.tuition.total.replace(/,/g, '')) * 2
                    : parseFloat(breakdown.tuition.total.replace(/,/g, ''))
                  : 0
              )}</p>
              <ul>
                {Object.entries(breakdown.tuition).map(([key, value]) => {
                  if (key === "total") return null;
                  const label = key.replace(/\b\w/g, l => l.toUpperCase());
                  return (
                    <li key={key}><strong>{label}</strong>: {key === "hours" ? value : `$${removeDecimalAndFormat(value)}`}</li>
                  );
                })}
              </ul>
            </div>
            <div className="column">
              <h3>Food & Housing</h3>
              <p>${removeDecimalAndFormat(breakdown.foodHousing["food and housing"])}</p>
            </div>
            <div className="column">
              <h3>Indirect Costs</h3>
              <p>${removeDecimalAndFormat(Object.values(breakdown.additional).reduce((sum, value) => sum + value, 0))}</p>
              <ul>
                {Object.entries(breakdown.additional).map(([key, value]) => (
                  <li key={key}><strong>{key.replace(/\b\w/g, l => l.toUpperCase())}</strong>: ${removeDecimalAndFormat(value)}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}