import React, { useEffect, useMemo, useRef, useState } from 'react';

const getTest = (tests = [], names = []) => {
  const arr = Array.isArray(names) ? names : [names];

  return tests.find((t) =>
    arr.some((n) =>
      (t?.test_name || '').toLowerCase().includes(n.toLowerCase())
    )
  );
};

const formatDate = (value) => {
  if (!value) return '-';

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return value;

  return `${String(d.getDate()).padStart(2, '0')}-${String(
    d.getMonth() + 1
  ).padStart(2, '0')}-${d.getFullYear()}`;
};

const deriveGrade = (value) => {
  const v = Number(value || 0);

  if (v >= 7000) return 'G1';
  if (v >= 6700) return 'G2';
  if (v >= 6400) return 'G3';
  if (v >= 6100) return 'G4';
  if (v >= 5800) return 'G5';
  if (v >= 5500) return 'G6';
  if (v >= 5200) return 'G7';
  if (v >= 4900) return 'G8';
  if (v >= 4600) return 'G9';
  if (v >= 4300) return 'G10';
  if (v >= 4000) return 'G11';
  if (v >= 3700) return 'G12';
  if (v >= 3400) return 'G13';
  if (v >= 3100) return 'G14';
  if (v >= 2800) return 'G15';
  if (v >= 2500) return 'G16';

  return 'G17';
};

const border = '1px solid #111';

export default function CoalTestReport({ sample = {}, tests = [] }) {
  const reportRef = useRef(null);

  const [logoImage, setLogoImage] = useState(null);
  const [nablImage, setNablImage] = useState(null);
  const [signatureImage, setSignatureImage] = useState(null);
  const [stampImage, setStampImage] = useState(null);

  const values = useMemo(() => {
    const tm = getTest(tests, ['Total Moisture']);
    const adbMoisture = getTest(tests, ['Moisture']);
    const ash = getTest(tests, ['Ash']);
    const gcv = getTest(tests, ['Gross Calorific', 'GCV']);

    const gcvVal = Number(gcv?.result_value || 0);
    const eqGcv = Math.round(gcvVal * 0.99);

    return {
      tm: tm?.result_value || '-',
      adbMoisture: adbMoisture?.result_value || '-',
      ash: ash?.result_value || '-',
      adbGcv: gcv?.result_value || '-',
      eqMoisture: (Number(adbMoisture?.result_value || 0) + 0.94).toFixed(2),
      eqAsh: ash?.result_value || '-',
      eqGcv,
      grade: deriveGrade(eqGcv),
      reportDate: formatDate(gcv?.reviewed_at || new Date()),
      receivedDate: formatDate(sample?.group_created_at || new Date()),
      period: `${formatDate(sample?.group_created_at || new Date())} to ${formatDate(gcv?.reviewed_at || new Date())}`,
      analyst: gcv?.reviewed_by_name || gcv?.assigned_by_name || 'Chandan Behera',
      sampleImage: gcv?.image_url || null,
    };
  }, [tests, sample]);

  useEffect(() => {
    if (window.html2pdf) return;

    const script = document.createElement('script');
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';

    document.body.appendChild(script);
  }, []);

  const handleImage = (e, setter) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => setter(ev.target.result);
    reader.readAsDataURL(file);
  };

  const generatePdf = async () => {
    await window
      .html2pdf()
      .set({
        margin: 0,
        filename: `${sample?.lab_internal_id || 'coal-report'}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: {
          scale: 2,
          useCORS: true,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
      })
      .from(reportRef.current)
      .save();
  };

  return (
    <div
      style={{
        background: '#dbe2ea',
        minHeight: '100vh',
        padding: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <input type="file" accept="image/*" onChange={(e) => handleImage(e, setLogoImage)} />
        <input type="file" accept="image/*" onChange={(e) => handleImage(e, setNablImage)} />
        <input type="file" accept="image/*" onChange={(e) => handleImage(e, setSignatureImage)} />
        <input type="file" accept="image/*" onChange={(e) => handleImage(e, setStampImage)} />

        <button
          onClick={generatePdf}
          style={{
            padding: '10px 18px',
            background: '#111827',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Download PDF
        </button>
      </div>

      <div
        ref={reportRef}
        style={{
          width: '210mm',
          height: '297mm',
          margin: '0 auto',
          background: '#fff',
          padding: '8mm 10mm',
          boxSizing: 'border-box',
          fontFamily: 'Times New Roman, serif',
          color: '#111',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 80, height: 60 }}>
              {logoImage ? (
                <img
                  src={logoImage}
                  alt="logo"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ border: border, width: '100%', height: '100%' }} />
              )}
            </div>

            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                Ravi Energie Laboratory
              </div>
            </div>
          </div>

          <div style={{ width: 80, textAlign: 'center' }}>
            {nablImage ? (
              <img
                src={nablImage}
                alt="nabl"
                style={{ width: 70, height: 70, objectFit: 'contain' }}
              />
            ) : (
              <div style={{ border: border, width: 70, height: 70, margin: '0 auto' }} />
            )}

            <div style={{ fontSize: 10, marginTop: 4 }}>TC-16434</div>
          </div>
        </div>

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: 8,
          }}
        >
          <tbody>
            <tr>
              <td
                colSpan={5}
                style={{
                  border: border,
                  textAlign: 'center',
                  padding: 2,
                }}
              >
                <div style={{ fontSize: 26, fontWeight: 700 }}>TEST REPORT</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  TC1643426000004497F
                </div>
              </td>
            </tr>

            <tr>
              <th style={head}>Discipline</th>
              <th style={head}>Chemical</th>
              <th style={head}>Group</th>
              <th style={head}>Solid Fuels</th>
              <th style={head}></th>
            </tr>

            <tr>
              <td style={cell}><b>Test Report No</b><br />260317-26</td>
              <td style={cell}><b>Report date</b><br />{values.reportDate}</td>
              <td style={cell}><b>Customer PO</b><br />250712-01</td>
              <td style={cell}><b>Date</b><br />12-07-2025</td>
              <td style={cell}><b>Text Pages</b><br />1</td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ ...cell, width: '50%', height: 90, verticalAlign: 'top' }}>
                <div style={{ marginBottom: 6 }}>
                  Customer Name and address
                </div>

                <div style={{ marginTop: 30 }}>
                  {sample?.client_name || 'Ravi Energie Private Limited'}
                  <br />
                  {sample?.client_address ||
                    'S-15 A/B-India Bulls Mega Mall, Jetalpur Road Vadodara 390020, Gujarat, India'}
                </div>
              </td>

              <td style={{ ...cell, verticalAlign: 'top' }}>
                Description of test item:- COAL
              </td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <th style={head}>Ambient Humidity (% RH)</th>
              <th style={head}>Ambient Temperature (°C)</th>
              <th style={head}>Customer Sample ID</th>
              <th style={head}>Sample lab ID</th>
            </tr>

            <tr>
              <td style={center}>54</td>
              <td style={center}>28</td>
              <td style={center}>{sample?.sample_ref_id || '-'}</td>
              <td style={center}>{sample?.lab_internal_id || '-'}</td>
            </tr>
          </tbody>
        </table>

        <div
          style={{
            borderLeft: border,
            borderRight: border,
            borderBottom: border,
            padding: 6,
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          Test Method :IS1350 (Part-I) :2025 for TM and Proximate and IS1350 (Part-II) : 2022 for GCV analysis
        </div>

        <div
          style={{
            textAlign: 'center',
            fontSize: 18,
            fontWeight: 700,
            marginTop: 4,
          }}
        >
          Test Results
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <th rowSpan={2} style={head}>Date of sample receipt</th>
              <th rowSpan={2} style={head}>Period of analysis</th>
              <th rowSpan={2} style={head}>Total Moisture (%)</th>
              <th colSpan={3} style={head}>Air Dried Basis (ADB)</th>
              <th colSpan={4} style={head}>Equilibrated basis (60% RH and 40 °C)</th>
            </tr>

            <tr>
              <th style={head}>Moisture (%)</th>
              <th style={head}>Ash (%)</th>
              <th style={head}>GCV (kCal/kg)</th>
              <th style={head}>Moisture (%)</th>
              <th style={head}>Ash (%)</th>
              <th style={head}>GCV (kCal/kg)</th>
              <th style={head}>Grade</th>
            </tr>

            <tr>
              <td style={center}>{values.receivedDate}</td>
              <td style={center}>{values.period}</td>
              <td style={center}>{values.tm}</td>
              <td style={center}>{values.adbMoisture}</td>
              <td style={center}>{values.ash}</td>
              <td style={center}>{values.adbGcv}</td>
              <td style={center}>{values.eqMoisture}</td>
              <td style={center}>{values.eqAsh}</td>
              <td style={center}>{values.eqGcv}</td>
              <td style={center}>{values.grade}</td>
            </tr>
          </tbody>
        </table>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginTop: 14,
          }}
        >
          <div
            style={{
              width: '58%',
              minHeight: 160,
              border: border,
              padding: 10,
              fontFamily: 'Courier New, monospace',
              fontSize: 12,
              lineHeight: 1.4,
            }}
          >
            <div><b>Run Data File 1 / 1</b></div>
            <div>Parr 6400 Calorimeter Rev. 120508125827</div>
            <div>03/17/26 10:49:43</div>
            <br />
            <div>Mode: Determination</div>
            <div>Method: Dynamic</div>
            <div>Type: Final</div>
            <br />
            <div>Sample ID: {sample?.lab_internal_id || '-'}</div>
            <div>Gross Heat {values.adbGcv} cal/g</div>
          </div>

          <div style={{ width: '35%', textAlign: 'center' }}>
            <div style={{ width: 120, height: 120, margin: '0 auto' }}>
              {stampImage ? (
                <img
                  src={stampImage}
                  alt="stamp"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ border: border, width: '100%', height: '100%' }} />
              )}
            </div>

            <div style={{ marginTop: 10 }}>Reviewed and Authorised By</div>

            <div style={{ width: 180, height: 50, margin: '10px auto 0' }}>
              {signatureImage ? (
                <img
                  src={signatureImage}
                  alt="signature"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ borderBottom: border, height: '100%' }} />
              )}
            </div>

            <div style={{ marginTop: 10, fontWeight: 700 }}>
              {values.analyst}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            fontSize: 10,
            lineHeight: 1.45,
          }}
        >
          <b>Declaration:</b>
          <br />
          1. The test results relates only to the sample submitted for testing and as per Lab scope. Product endorsement is neither inferred nor implied.
          2. This report cannot be reproduced except in full without prior written approval from the laboratory head.
          3. The report cannot be used as an evidence in the court of law, without written approval of laboratory.
          4. The sample will be retained for three months.
          5. Total liability of the laboratory of this report is limited only to the invoiced amount.
          6. All disputes are subject to Vadodara Jurisdiction.
          7. Sampling is not done by the laboratory.
          8. This report relates only to the particular sample as received for testing.
          9. Grade of coal is given basis of GCV on EQ Basis as per Gazette notification from Ministry of coal for Declaration of Grade.
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: 8,
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          ---------------END OF REPORT---------------
        </div>

        <div
          style={{
            borderTop: '4px solid #111',
            marginTop: 8,
            paddingTop: 6,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 20 }}>
            Unit of <b>Ravi EnergiePvt. Ltd</b>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              marginTop: 10,
              fontSize: 10,
              lineHeight: 1.3,
            }}
          >
            <div>
              Laboratory: Plot No-14, AstankarBhavan,
              Behind TukaramSabhagruha,
              SuyogNagar,District Nagpur - 440015,
              Maharastra, India.
            </div>

            <div>
              Corporate Office: S15 A/B India Bulls Mega Mall,
              Jetalpur Road, Vadodara – 390 020, India
            </div>

            <div>
              Phone:+91 8320021741
              <br />
              Email: lab@ravienergie.com
              <br />
              Website: www.ravienergie.com
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const head = {
  border: border,
  padding: 4,
  fontSize: 11,
  fontWeight: 700,
  textAlign: 'center',
};

const cell = {
  border: border,
  padding: 5,
  fontSize: 11,
};

const center = {
  border: border,
  padding: 5,
  fontSize: 11,
  textAlign: 'center',
  fontWeight: 700,
};
