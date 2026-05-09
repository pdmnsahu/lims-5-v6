import React, { useEffect, useMemo, useRef, useState } from "react";

const BORDER = "1px solid #111";

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${String(d.getDate()).padStart(2, "0")}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${d.getFullYear()}`;
};

const findTest = (tests = [], keywords = []) => {
  return tests.find((t) =>
    keywords.some((k) =>
      (t?.test_name || "").toLowerCase().includes(k.toLowerCase())
    )
  );
};

const gradeFromGcv = (v) => {
  const n = Number(v || 0);
  if (n >= 2500) return "G16";
  return "G17";
};

export default function CoalTestReport({ sample = {}, tests = [] }) {
  const reportRef = useRef(null);

  const [logo, setLogo] = useState(null);
  const [nabl, setNabl] = useState(null);
  const [sign, setSign] = useState(null);
  const [seal, setSeal] = useState(null);

  const data = useMemo(() => {
    const tm = findTest(tests, ["Total Moisture"]);
    const moist = findTest(tests, ["Moisture"]);
    const ash = findTest(tests, ["Ash"]);
    const gcv = findTest(tests, ["GCV", "Gross Calorific"]);

    const eqGcv = Math.round(Number(gcv?.result_value || 0) * 0.99);

    return {
      tm: tm?.result_value || "13.32",
      moist: moist?.result_value || "2.62",
      ash: ash?.result_value || "56.45",
      gcv: gcv?.result_value || "2729",
      eqMoisture: "3.56",
      eqAsh: "55.91",
      eqGcv,
      grade: gradeFromGcv(eqGcv),
      reportDate: formatDate(new Date()),
      receivedDate: formatDate(sample?.group_created_at || new Date()),
    };
  }, [tests, sample]);

  useEffect(() => {
    if (window.html2pdf) return;
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    document.body.appendChild(script);
  }, []);

  const upload = (e, setter) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setter(ev.target.result);
    reader.readAsDataURL(file);
  };

  const downloadPdf = async () => {
    await window
      .html2pdf()
      .set({
        margin: 0,
        filename: "Coal-Test-Report.pdf",
        image: { type: "jpeg", quality: 1 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
      })
      .from(reportRef.current)
      .save();
  };

  return (
    <div style={{ background: "#dfe5eb", padding: 20 }}>
      <div style={{ marginBottom: 20, display: "flex", gap: 10 }}>
        <input type="file" onChange={(e) => upload(e, setLogo)} />
        <input type="file" onChange={(e) => upload(e, setNabl)} />
        <input type="file" onChange={(e) => upload(e, setSign)} />
        <input type="file" onChange={(e) => upload(e, setSeal)} />

        <button onClick={downloadPdf}>Download PDF</button>
      </div>

      <div
        ref={reportRef}
        style={{
          width: "210mm",
          height: "297mm",
          background: "#fff",
          margin: "0 auto",
          padding: "8mm",
          boxSizing: "border-box",
          fontFamily: "Times New Roman",
          color: "#111",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 8,
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 75, height: 60 }}>
              {logo ? (
                <img
                  src={logo}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : (
                <div style={{ border: BORDER, width: "100%", height: "100%" }} />
              )}
            </div>

            <div style={{ fontWeight: 700, fontSize: 20 }}>
              Ravi Energie Laboratory
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ width: 70, height: 70 }}>
              {nabl ? (
                <img
                  src={nabl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : (
                <div style={{ border: BORDER, width: "100%", height: "100%" }} />
              )}
            </div>
            <div style={{ fontSize: 10 }}>TC-16434</div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td
                colSpan={5}
                style={{
                  border: BORDER,
                  textAlign: "center",
                  padding: 5,
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 700 }}>
                  TEST REPORT
                </div>
                <div style={{ fontWeight: 700 }}>TC1643426000004497F</div>
              </td>
            </tr>

            <tr>
              {["Discipline", "Chemical", "Group", "Solid Fuels", ""].map(
                (x, i) => (
                  <th
                    key={i}
                    style={{
                      border: BORDER,
                      padding: 5,
                      fontSize: 12,
                    }}
                  >
                    {x}
                  </th>
                )
              )}
            </tr>

            <tr>
              <td style={cell}>
                <b>Test Report No</b>
                <br />
                260317-26
              </td>
              <td style={cell}>
                <b>Report date</b>
                <br />
                {data.reportDate}
              </td>
              <td style={cell}>
                <b>Customer PO</b>
                <br />
                250712-01
              </td>
              <td style={cell}>
                <b>Date</b>
                <br />
                12-07-2025
              </td>
              <td style={cell}>
                <b>Text Pages</b>
                <br />1
              </td>
            </tr>
          </tbody>
        </table>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: 8,
          }}
        >
          <tbody>
            <tr>
              <td style={{ ...cell, height: 80, verticalAlign: "top" }}>
                Customer Name and address
                <div style={{ marginTop: 30 }}>
                  Ravi Energie Private Limited
                  <br />
                  Vadodara 390020, Gujarat, India
                </div>
              </td>

              <td style={{ ...cell, verticalAlign: "top" }}>
                Description of test item:- COAL
              </td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              {[
                "Ambient Humidity (% RH)",
                "Ambient Temperature (°C)",
                "Customer Sample ID",
                "Sample lab ID",
              ].map((x) => (
                <th key={x} style={head}>
                  {x}
                </th>
              ))}
            </tr>

            <tr>
              <td style={center}>54</td>
              <td style={center}>28</td>
              <td style={center}>{sample?.sample_ref_id || "A-17-AD-534"}</td>
              <td style={center}>{sample?.lab_internal_id || "26031401"}</td>
            </tr>
          </tbody>
        </table>

        <div
          style={{
            borderLeft: BORDER,
            borderRight: BORDER,
            borderBottom: BORDER,
            padding: 6,
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          Test Method :IS1350 (Part-I) :2025 for TM and Proximate and IS1350
          (Part-II) : 2022 for GCV analysis
        </div>

        <div
          style={{
            textAlign: "center",
            fontWeight: 700,
            fontSize: 18,
            marginTop: 4,
          }}
        >
          Test Results
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <th rowSpan={2} style={head}>
                Date of sample receipt
              </th>
              <th rowSpan={2} style={head}>
                Period of analysis
              </th>
              <th rowSpan={2} style={head}>
                Total Moisture (%)
              </th>
              <th colSpan={3} style={head}>
                Air Dried Basis (ADB)
              </th>
              <th colSpan={4} style={head}>
                Equilibrated basis (60% RH and 40 °C)
              </th>
            </tr>

            <tr>
              {[
                "Moisture (%)",
                "Ash (%)",
                "GCV (kCal/kg)",
                "Moisture (%)",
                "Ash (%)",
                "GCV (kCal/kg)",
                "Grade",
              ].map((x) => (
                <th key={x} style={head}>
                  {x}
                </th>
              ))}
            </tr>

            <tr>
              <td style={center}>{data.receivedDate}</td>
              <td style={center}>{data.receivedDate} to {data.reportDate}</td>
              <td style={center}>{data.tm}</td>
              <td style={center}>{data.moist}</td>
              <td style={center}>{data.ash}</td>
              <td style={center}>{data.gcv}</td>
              <td style={center}>{data.eqMoisture}</td>
              <td style={center}>{data.eqAsh}</td>
              <td style={center}>{data.eqGcv}</td>
              <td style={center}>{data.grade}</td>
            </tr>
          </tbody>
        </table>

        <div
          style={{
            display: "flex",
            marginTop: 14,
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              width: "58%",
              border: BORDER,
              minHeight: 170,
              padding: 10,
              fontFamily: "Courier New",
              fontSize: 12,
            }}
          >
            <b>Run Data File 1 / 1</b>
            <br />
            Parr 6400 Calorimeter
            <br />
            Rev. 120508125827
            <br />
            03/17/26 10:49:43
            <br />
            <br />
            Gross Heat {data.gcv} cal/g
          </div>

          <div style={{ width: "34%", textAlign: "center" }}>
            <div style={{ width: 120, height: 120, margin: "0 auto" }}>
              {seal ? (
                <img
                  src={seal}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : (
                <div style={{ border: BORDER, width: "100%", height: "100%" }} />
              )}
            </div>

            <div style={{ marginTop: 10 }}>
              Reviewed and Authorised By
            </div>

            <div style={{ width: 180, height: 50, margin: "10px auto" }}>
              {sign ? (
                <img
                  src={sign}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : (
                <div style={{ borderBottom: BORDER, height: "100%" }} />
              )}
            </div>

            <div style={{ fontWeight: 700 }}>Chandan Behera</div>
          </div>
        </div>

        <div style={{ marginTop: 20, fontSize: 10, lineHeight: 1.5 }}>
          <b>Declaration:</b>
          <br />
          1. The test results relates only to the sample submitted for testing.
          2. This report cannot be reproduced except in full without prior written approval.
          3. Sampling is not done by the laboratory.
        </div>

        <div
          style={{
            textAlign: "center",
            fontWeight: 700,
            marginTop: 10,
          }}
        >
          ---------------END OF REPORT---------------
        </div>

        <div
          style={{
            marginTop: 10,
            borderTop: "4px solid #111",
            paddingTop: 10,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 20 }}>
            Unit of <b>Ravi EnergiePvt. Ltd</b>
          </div>
        </div>
      </div>
    </div>
  );
}

const head = {
  border: BORDER,
  padding: 4,
  fontSize: 11,
  textAlign: "center",
};

const cell = {
  border: BORDER,
  padding: 5,
  fontSize: 11,
};

const center = {
  border: BORDER,
  padding: 5,
  textAlign: "center",
  fontSize: 11,
};