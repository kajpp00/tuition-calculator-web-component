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
  const [residenceHalls, setResidenceHalls] = useState([]);
  const [selectedHall, setSelectedHall] = useState("Martin Hall (Co-ed)");
  const [mealPlans, setMealPlans] = useState([]);
  const [selectedMeal, setSelectedMeal] = useState("none");
  const [directTotal, setDirectTotal] = useState(0);
  const [indirectTotal, setIndirectTotal] = useState(0);

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
          const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
          tuitionResults[file.replace('.csv', '')] = normalizeHeaders(parsed.data);
        }

        setTuitionData(tuitionResults);

        const additionalRes = await fetch(`${baseURL}/additional-costs.csv`);
        const additionalText = await additionalRes.text();
        const additionalParsed = Papa.parse(additionalText, { header: true, skipEmptyLines: true });
        setAdditionalData(normalizeHeaders(additionalParsed.data));

        const hallRes = await fetch(`${baseURL}/residence-hall-rates.csv`);
        const hallText = await hallRes.text();
        const hallParsed = Papa.parse(hallText, { header: true, skipEmptyLines: true });
        setResidenceHalls(normalizeHeaders(hallParsed.data));

        const mealRes = await fetch(`${baseURL}/meal-plan-rates.csv`);
        const mealText = await mealRes.text();
        const mealParsed = Papa.parse(mealText, { header: true, skipEmptyLines: true });
        setMealPlans(normalizeHeaders(mealParsed.data));
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

    let foodAndHousing = 0;
    let transportation = 0;
    let miscellaneous = 0;
    let booksCost = 0;
    let hallCost = 0;
    let mealCost = 0;

    if (housing === "dorm") {
      const hall = residenceHalls.find(h => h["residence hall"] === selectedHall);
      const meal = mealPlans.find(m => m["meal plan"] === selectedMeal);

      if (hall) {
        const rawHall = parseFloat(hall["2 suite"].replace(/,/g, '')) || 0;
        hallCost = term === "fallspring" ? rawHall * 2 : rawHall;
        foodAndHousing += hallCost;
      }

      if (meal && selectedMeal !== "none") {
        const rawMeal = parseFloat(meal["rate"].replace(/,/g, '')) || 0;
        mealCost = term === "fallspring" ? rawMeal * 2 : rawMeal;
        foodAndHousing += mealCost;
      }

      transportation = selectedRow ? parseFloat(selectedRow["transportation"].replace(/,/g, '')) || 0 : 0;
      miscellaneous = selectedRow ? parseFloat(selectedRow["miscellaneous"].replace(/,/g, '')) || 0 : 0;
      const booksKey = level === "undergraduate" ? "undergraduate books" : "graduate books";
      booksCost = selectedRow ? parseFloat(selectedRow[booksKey].replace(/,/g, '')) || 0 : 0;
    } else {
      foodAndHousing = selectedRow ? parseFloat(selectedRow["food and housing"].replace(/,/g, '')) || 0 : 0;
      transportation = selectedRow ? parseFloat(selectedRow["transportation"].replace(/,/g, '')) || 0 : 0;
      miscellaneous = selectedRow ? parseFloat(selectedRow["miscellaneous"].replace(/,/g, '')) || 0 : 0;
      const booksKey = level === "undergraduate" ? "undergraduate books" : "graduate books";
      booksCost = selectedRow ? parseFloat(selectedRow[booksKey].replace(/,/g, '')) || 0 : 0;
    }

    if (term === "single") {
      foodAndHousing /= 2;
      transportation /= 2;
      miscellaneous /= 2;
      booksCost /= 2;
    }

    if (match) {
      let baseTotal = parseFloat(match.total?.toString().replace(/,/g, '') || '0');
      const adjustedTuition = term === "fallspring" ? baseTotal * 2 : baseTotal;

      const tuitionBreakdown = {};
      for (const [key, value] of Object.entries(match)) {
        if (key === "hours") {
          tuitionBreakdown[key] = value;
        } else {
          const numeric = parseFloat(value?.toString().replace(/,/g, '') || '0');
          tuitionBreakdown[key] = (term === "fallspring" ? numeric * 2 : numeric).toString();
        }
      }

      const totalCost = adjustedTuition + foodAndHousing + transportation + miscellaneous + booksCost;

      setCost(removeDecimalAndFormat(totalCost));
      setBreakdown({
        tuition: tuitionBreakdown,
        foodHousing: {
          ...(housing === "dorm"
            ? {
              [selectedHall]: hallCost,
              [selectedMeal]: mealCost
            }
            : { "food and housing": foodAndHousing }),
        },
        additional: {
          transportation,
          miscellaneous,
          books: booksCost
        }
      });
      const tuitionTotal = parseFloat(tuitionBreakdown.total?.replace(/,/g, '')) || 0;
      const direct = tuitionTotal + foodAndHousing;
      const indirect = transportation + miscellaneous + booksCost;

      setDirectTotal(direct);
      setIndirectTotal(indirect);
    }
  }, [level, residency, hours, housing, term, tuitionData, additionalData, selectedHall, selectedMeal, mealPlans, residenceHalls]);

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

        {housing === "dorm" && (
          <>
            <fieldset className="form-group">
              <legend>Residence Hall</legend>
              {residenceHalls.map(hall => (
                <label key={hall["residence hall"]}>
                  <input
                    type="radio"
                    value={hall["residence hall"]}
                    checked={selectedHall === hall["residence hall"]}
                    onChange={(e) => setSelectedHall(e.target.value)}
                  /> {hall["residence hall"]}
                </label>
              ))}
            </fieldset>

            <fieldset className="form-group">
              <legend>Meal Plan</legend>
              <label>
                <input type="radio" value="none" checked={selectedMeal === "none"} onChange={() => setSelectedMeal("none")} /> None
              </label>
              {mealPlans.map(meal => (
                <label key={meal["meal plan"]}>
                  <input
                    type="radio"
                    value={meal["meal plan"]}
                    checked={selectedMeal === meal["meal plan"]}
                    onChange={(e) => setSelectedMeal(e.target.value)}
                  /> {meal["meal plan"]}
                </label>
              ))}
            </fieldset>
          </>
        )}



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
        <div className="breakdown-section">
          <h2>Cost Breakdown</h2>
          <button className="print-button" onClick={() => window.print()}>
            Print Breakdown
          </button>

          <div className="cost-columns">
            {/* Direct Costs */}
            <div className="cost-column">
              <h3>Direct Costs</h3>
              <ul>
                {/* Tuition & Fees */}
                {Object.entries(breakdown.tuition).map(([key, value]) => {
                  if (key === "hours") return null;
                  return (
                    <li key={key}>
                      <span>{key.replace(/_/g, ' ')}</span>
                      <span>${removeDecimalAndFormat(value)}</span>
                    </li>
                  );
                })}

                {/* Food & Housing */}
                {Object.entries(breakdown.foodHousing).map(([key, value]) => (
                  <li key={key}>
                    <span>{key}</span>
                    <span>${removeDecimalAndFormat(value)}</span>
                  </li>
                ))}
              </ul>
              {/* Direct Costs Total */}
              <div className="cost-total">
                <strong>Total Direct Costs:</strong>
                <span>${removeDecimalAndFormat(directTotal)}</span>
              </div>
            </div>

            {/* Indirect Costs */}
            <div className="cost-column">
              <h3>Indirect Costs</h3>
              <ul>
                {Object.entries(breakdown.additional).map(([key, value]) => (
                  <li key={key}>
                    <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                    <span>${removeDecimalAndFormat(value)}</span>
                  </li>
                ))}
              </ul>
              {/* Indirect Costs Total */}
              <div className="cost-total">
                <strong>Total Indirect Costs:</strong>
                <span>${removeDecimalAndFormat(indirectTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
