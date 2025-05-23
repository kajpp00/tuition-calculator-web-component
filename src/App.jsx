import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import "./Tuition-select-form.css";
import Tooltip from './Tooltip'

export default function TuitionCalculator() {
  const [level, setLevel] = useState("");
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
  const [selectedHall, setSelectedHall] = useState("Lucio Hall (Co-ed)");
  const [mealPlans, setMealPlans] = useState([]);
  const [selectedMeal, setSelectedMeal] = useState("none");
  const [directTotal, setDirectTotal] = useState(0);
  const [indirectTotal, setIndirectTotal] = useState(0);

  const baseURL = 'https://www.tamuk.edu/_wp_rd_content/_wp_misc_feeds/tuition-calculator';

  useEffect(()=>{
    const singlePostNode = document.querySelector('[data-elementor-type="single-post"]')

    if (singlePostNode) {
      if (singlePostNode.classList.contains('program_type-bachelors-degree')){
        setLevel('undergraduate')
      } else {
        setLevel('graduate')
      }
    }

  },[])

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
      if (term === "single") {
        transportation /= 2;
        miscellaneous /= 2;
        booksCost /= 2;
      }
    } else {
      foodAndHousing = selectedRow ? parseFloat(selectedRow["food and housing"].replace(/,/g, '')) || 0 : 0;
      transportation = selectedRow ? parseFloat(selectedRow["transportation"].replace(/,/g, '')) || 0 : 0;
      miscellaneous = selectedRow ? parseFloat(selectedRow["miscellaneous"].replace(/,/g, '')) || 0 : 0;
      const booksKey = level === "undergraduate" ? "undergraduate books" : "graduate books";
      booksCost = selectedRow ? parseFloat(selectedRow[booksKey].replace(/,/g, '')) || 0 : 0;
      if (term === "single") {
        foodAndHousing /= 2;
        transportation /= 2;
        miscellaneous /= 2;
        booksCost /= 2;
      }
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
              [selectedMeal]: mealCost,
              'Room & Board': mealCost + hallCost
            }
            : { "Food & Housing": foodAndHousing }),
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
    <div className="app-wrapper">
      <div className="calculator-wrapper">
        <form className="calculator-form">
         
            <div className="form-group">
              <label htmlFor="level">Level of Study</label>
              <select
                id="level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                <option value="undergraduate">Undergraduate</option>
                <option value="graduate">Graduate</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="residency">Residency Status</label>
              <select
                id="residency"
                value={residency}
                onChange={(e) => setResidency(e.target.value)}
              >
                <option value="resident">Resident</option>
                <option value="nonresident">Non-Resident</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="housing">Housing</label>
              <select
                id="housing"
                value={housing}
                onChange={(e) => setHousing(e.target.value)}
              >
                <option value="home">At Home</option>
                <option value="dorm">Dorm</option>
                <option value="off campus">Off Campus</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="term">Enrollment Term</label>
              <select
                id="term"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              >
                <option value="fallspring">Fall & Spring</option>
                <option value="single">Single Semester</option>
              </select>
            </div>


            {housing === "dorm" && (
              <>
                <div className="form-group">
                  <label htmlFor="residence-hall">Residence Hall</label>
                  <select
                    id="residence-hall"
                    value={selectedHall}
                    onChange={(e) => setSelectedHall(e.target.value)}
                  >
                    <option value="">Select a residence hall</option>
                    {residenceHalls.map(hall => (
                      <option key={hall["residence hall"]} value={hall["residence hall"]}>
                        {hall["residence hall"]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="meal-plan">Meal Plan</label>
                  <select
                    id="meal-plan"
                    value={selectedMeal}
                    onChange={(e) => setSelectedMeal(e.target.value)}
                  >
                    <option value="none">None</option>
                    {mealPlans.map(meal => (
                      <option key={meal["meal plan"]} value={meal["meal plan"]}>
                        {meal["meal plan"]}
                      </option>
                    ))}
                  </select>
                </div>
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
            <div className="estimated-cost">Estimated Cost: <br /><strong>${animatedCost}</strong></div>
            <button className="toggle-breakdown" onClick={() => setShowBreakdown(!showBreakdown)}>
              {showBreakdown ? "Hide Breakdown" : "Show Breakdown"}
            </button>
          </div>
        )}

      </div>
      {showBreakdown && breakdown && (
        <div className="breakdown-section">
          {/* <h2>Cost Breakdown</h2> */}
          {/* <button className="print-button" onClick={() => window.print()}>
          Print Breakdown
        </button> */}

          <div className="cost-columns">
            {/* Direct Costs */}
            <div className="cost-column">
              <div className="cost-heading">
                <p><strong>Direct Costs</strong></p>
                <Tooltip text="Direct costs may include tuition and fees, and on-campus food and housing. These are all items you pay directly to TAMUK">
                  <span className="tooltip-icon">ⓘ</span>
                </Tooltip>
              </div>
              <ul>
                {/* Tuition & Fees */}
                {Object.entries(breakdown.tuition).map(([key, value]) => {
                  if (key === "hours") return null;
                  if (key === "total")
                    return (
                      <li class="subtotals" key={key}>
                        <span>Tuition & Fees</span>
                        <span>${removeDecimalAndFormat(value)}</span>
                      </li>
                    );
                  return (
                    <li key={key}>
                      <span>{key.replace(/_/g, ' ')}</span>
                      <span>${removeDecimalAndFormat(value)}</span>
                    </li>
                  );
                })}
              </ul>
              <ul>

                {/* Food & Housing */}
                {Object.entries(breakdown.foodHousing).map(([key, value]) => {
                  if (key === "none") return (
                    <li key={key}>
                      <span>No Meal Plan</span>
                      <span>$0</span>
                    </li>
                  );
                  if (key === "Room & Board")
                    return (
                      <li class="subtotals" key={key}>
                        <span>{key}</span>
                        <span>${removeDecimalAndFormat(value)}</span>
                      </li>
                    );
                  if (key === "Food & Housing")
                    return (
                      <li class="subtotals" key={key}>
                        <span>{key}</span>
                        <span>${removeDecimalAndFormat(value)}</span>
                      </li>
                    );
                  return (
                    <li key={key}>
                      <span>{key}</span>
                      <span>${removeDecimalAndFormat(value)}</span>
                    </li>
                  )
                })}
              </ul>

              {/* Direct Costs Total */}
              <div className="cost-total">
                <strong>Total Direct Costs:</strong>
                <span>${removeDecimalAndFormat(directTotal)}</span>
              </div>
            </div>

            {/* Indirect Costs */}
            <div className="cost-column">
              <div className="cost-heading">
                <p><strong>Indirect Costs</strong></p>
                <Tooltip text=" Indirect costs are expenses incurred by you while you attend TAMUK, but not paid to TAMUK. Indirect costs can include transportation, personal expenses and books and supplies. These costs are estimated costs as your personal indirect costs may vary">
                  <span className="tooltip-icon">ⓘ</span>
                </Tooltip>
              </div>
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
