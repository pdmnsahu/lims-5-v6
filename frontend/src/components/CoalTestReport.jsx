
import React, { useEffect, useMemo, useRef, useState } from "react";

export default function CoalTestReport({ sample = {}, tests = [] }) {
  const reportRef = useRef(null);
  const [assets, setAssets] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem("report_assets");
    if (saved) setAssets(JSON.parse(saved));
  }, []);

  const getTest = (name) =>
    tests.find((t) =>
      (t?.test_name || "").toLowerCase().includes(name.toLowerCase())
    );

  const gcvTest = getTest("gcv") || getTest("gross calorific");

  const generatePdf = async () => {
    if (!window.html2pdf) {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      document.body.appendChild(script);

      await new Promise((r) => (script.onload = r));
    }

    await window
      .html2pdf()
      .set({
        margin: 0,
        filename: "coal-report.pdf",
        html2canvas: { scale: 2 },
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
    <div style={{ padding: 20 }}>
      <button onClick={generatePdf}>Download PDF</button>

      <div
        ref={reportRef}
        style={{
          width: "210mm",
          minHeight: "297mm",
          background: "#fff",
          margin: "20px auto",
          padding: 20,
          fontFamily: "Times New Roman",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <img src={assets.logo} alt="" style={{ height: 80 }} />
          <img src={assets.nabl} alt="" style={{ height: 80 }} />
        </div>

        <h1 style={{ textAlign: "center" }}>TEST REPORT</h1>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: 20,
          }}
        >
          <tbody>
            <tr>
              <td style={{ border: "1px solid #000", padding: 8 }}>
                Sample ID
              </td>
              <td style={{ border: "1px solid #000", padding: 8 }}>
                {sample?.sample_ref_id}
              </td>
            </tr>

            {tests.map((t, i) => (
              <tr key={i}>
                <td style={{ border: "1px solid #000", padding: 8 }}>
                  {t.test_name}
                </td>

                <td style={{ border: "1px solid #000", padding: 8 }}>
                  {t.result_value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 30 }}>
          <h3>Parr Calorimeter Run Data</h3>

          {gcvTest?.image_url ? (
            <img
              src={gcvTest.image_url}
              alt=""
              style={{
                width: "100%",
                border: "1px solid #000",
              }}
            />
          ) : (
            <div>No calorimeter image uploaded by chemist.</div>
          )}
        </div>

        <div
          style={{
            marginTop: 40,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <img src={assets.seal} alt="" style={{ height: 120 }} />

          <div style={{ textAlign: "center" }}>
            <img src={assets.signature} alt="" style={{ height: 70 }} />
            <div>Authorized Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
}
