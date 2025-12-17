import React, { useCallback, useState } from "react";
import "./App.css";

const ROWS = 10;
const COLS = 10;
const COL_LABELS = Array.from({ length: COLS }, (_, i) => String.fromCharCode(65 + i));

function cellId(row, col) {
  return `${COL_LABELS[col]}${row + 1}`;
}

function parseRefs(formula) {
  // Matches A1..J10
  const regex = /([A-J](?:10|[1-9]))/g;
  return formula.match(regex) || [];
}

export default function App() {
  const [cells, setCells] = useState({}); 
  const [active, setActive] = useState("A1");

  const evaluateCell = useCallback((snapshot, id, visited = new Set()) => {
    if (visited.has(id)) return { value: "#CIRCULAR", error: true };

    const cell = snapshot[id];
    const raw = cell?.raw ?? "";

    if (!raw.startsWith("=")) return { value: raw, error: false };

    visited.add(id);
    let expr = raw.slice(1);

    try {
      const refs = parseRefs(expr);

      for (const ref of refs) {
        const res = evaluateCell(snapshot, ref, visited);
        if (res.error) return res;

        const num = res.value === "" ? 0 : Number(res.value);
        if (Number.isNaN(num)) throw new Error("Invalid reference");

        expr = expr.replaceAll(ref, String(num));
      }

      const computed = eval(expr);

      return { value: computed, error: false };
    } catch {
      return { value: "#ERROR", error: true };
    } finally {
      visited.delete(id);
    }
  }, []);

  const recomputeAll = useCallback(
    (snapshot) => {
      const next = { ...snapshot };
      for (const id of Object.keys(next)) {
        const res = evaluateCell(next, id, new Set());
        next[id] = { ...next[id], value: res.value, error: res.error };
      }
      return next;
    },
    [evaluateCell]
  );

  const setRaw = (id, raw) => {
    setCells((prev) => {
      const next = { ...prev, [id]: { ...(prev[id] || {}), raw } };
      return recomputeAll(next);
    });
  };

  const activeRaw = cells[active]?.raw ?? "";

  return (
    <div className="app">
      <div className="header">
        <div className="title">
          <h1>Spreadsheet Engine</h1>
          <p>
            Type values or formulas (start with <b>=</b>). Example: <b>=A1+3</b> or{" "}
            <b>(C1+D1)/3</b>.
          </p>
        </div>
        <div className="badge">10×10 • A–J • 1–10</div>
      </div>

      <div className="bar">
        <div className="namePill">{active}</div>
        <input
          className="formula"
          value={activeRaw}
          onChange={(e) => setRaw(active, e.target.value)}
          placeholder="Enter value or formula (e.g. =A1*2)"
        />
      </div>

      <div className="gridWrap">
        <div className="scroller">
          <table>
            <thead>
              <tr>
                <th className="corner"></th>
                {COL_LABELS.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {Array.from({ length: ROWS }, (_, r) => (
                <tr key={r}>
                  <th className="rowHead">{r + 1}</th>

                  {Array.from({ length: COLS }, (_, c) => {
                    const id = cellId(r, c);
                    const cell = cells[id] || {};
                    const isActive = id === active;
                    const display = cell.value ?? "";
                    const isError = !!cell.error;

                    return (
                      <td key={id}>
                        <div className={`cellBox ${isActive ? "cellActive" : ""}`}>
                          <div className="cell">
                            <input
                              value={cell.raw || ""}
                              onFocus={() => setActive(id)}
                              onClick={() => setActive(id)}
                              onChange={(e) => setRaw(id, e.target.value)}
                              placeholder={id}
                            />
                          </div>
                          <div className={`value ${isError ? "error" : ""}`}>{display}</div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
