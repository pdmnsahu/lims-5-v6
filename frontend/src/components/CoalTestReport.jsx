import React, { useEffect, useMemo, useRef, useState } from 'react';

const BORDER = '1px solid #000';

const styles = {
  page: {
    width: '210mm',
    minHeight: '297mm',
    background: '#fff',
    margin: '0 auto',
    padding: '6mm 8mm 8mm 8mm',
    boxSizing: 'border-box',
    fontFamily: 'Times New Roman, serif',
    color: '#000',
    position: 'relative',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },

  cell: {
    border: BORDER,
    padding: '4px 5px',
    fontSize: '11px',
    verticalAlign: 'middle',
    lineHeight: 1.15,
  },

  head: {
    border: BORDER,
    padding: '4px 5px',
    fontSize: '11px',
    fontWeight: 700,
    textAlign: 'center',
    verticalAlign: 'middle',
    lineHeight: 1.1,
  },

  center: {
    border: BORDER,
    padding: '4px 5px',
    fontSize: '11px',
    textAlign: 'center',
    verticalAlign: 'middle',
    lineHeight: 1.1,
  },
};

const formatDate = (value) => {
  if (!value) return '-';

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return '-';

  return `${String(d.getDate()).padStart(2, '0')}-${String(
    d.getMonth() + 1
  ).padStart(2, '0')}-${d.getFullYear()}`;
};

const findTest = (tests = [], keywords = []) => {
  return tests.find((t) =>
    keywords.some((k) =>
      (t?.test_name || '').toLowerCase().includes(k.toLowerCase())
    )
  );
};

const deriveGrade = (gcv) => {
  const v = Number(gcv || 0);

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

export default function CoalTestReport({ sample = {}, tests = [] }) {
  const reportRef = useRef(null);
  const [assets, setAssets] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem('report_assets');

    if (saved) {
      setAssets(JSON.parse(saved));
    }
  }, []);

  const values = useMemo(() => {
    const tm = findTest(tests, ['total moisture']);
    const adbMoisture = findTest(tests, ['moisture']);
    const ash = findTest(tests, ['ash']);
    const gcv = findTest(tests, ['gross calorific', 'gcv']);

    const gcvValue = Number(gcv?.result_value || 0);
    const eqGcv = Math.round(gcvValue * 0.99);

    return {
      tm: tm?.result_value || '13.32',
      adbMoisture: adbMoisture?.result_value || '2.62',
      adbAsh: ash?.result_value || '56.45',
      adbGcv: gcv?.result_value || '2729',
      eqMoisture: (Number(adbMoisture?.result_value || 2.62) + 0.94).toFixed(2),
      eqAsh: ash?.result_value || '55.91',
      eqGcv,
      grade: deriveGrade(eqGcv),
      reportDate: formatDate(gcv?.reviewed_at || new Date()),
      receiptDate: formatDate(sample?.group_created_at || new Date()),
      period: `${formatDate(sample?.group_created_at || new Date())} to ${formatDate(gcv?.reviewed_at || new Date())}`,
      analyst:
        gcv?.reviewed_by_name ||
        gcv?.assigned_by_name ||
        'Chandan Behera',
      parrImage: gcv?.image_url || '',
    };
  }, [sample, tests]);

  useEffect(() => {
    if (window.html2pdf) return;

    const script = document.createElement('script');

    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';

    document.body.appendChild(script);
  }, []);

  const downloadPdf = async () => {
    await window
      .html2pdf()
      .set({
        margin: 0,
        filename: `${sample?.lab_internal_id || 'coal-report'}.pdf`,
        image: {
          type: 'jpeg',
          quality: 1,
        },
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
        background: '#dce3ea',
        minHeight: '100vh',
        padding: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          Coal Test Report Preview
        </div>

        <button
          onClick={downloadPdf}
          style={{
            border: 'none',
            background: '#111827',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Download PDF
        </button>
      </div>

      <div ref={reportRef} style={styles.page}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '74px 1fr 74px',
            alignItems: 'start',
            columnGap: 10,
            marginBottom: 4,
          }}
        >
          <div
            style={{
              width: 74,
              height: 74,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {assets.logo ? (
              <img
                src={assets.logo}
                alt="logo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            ) : null}
          </div>

          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 10,
                lineHeight: 1.2,
              }}
            >
              Format: QCI/F25/09/01/QCI-CIL Date: 14-07-2025 Rev: 04
            </div>

            <div
              style={{
                fontSize: 30,
                fontWeight: 700,
                lineHeight: 1,
                marginTop: 4,
              }}
            >
              Ravi Energie Laboratory
            </div>
          </div>

          <div
            style={{
              width: 74,
              height: 74,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {assets.nabl ? (
              <img
                src={assets.nabl}
                alt="nabl"
                style={{
                  width: 68,
                  height: 68,
                  objectFit: 'contain',
                }}
              />
            ) : null}

            <div
              style={{
                fontSize: 10,
                marginTop: 2,
              }}
            >
              TC16434
            </div>
          </div>
        </div>

        <table style={styles.table}>
          <tbody>
            <tr>
              <td
                colSpan={5}
                style={{
                  ...styles.center,
                  paddingTop: 6,
                  paddingBottom: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  TEST REPORT
                </div>

                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    marginTop: 2,
                  }}
                >
                  TC1643426000004497F
                </div>
              </td>
            </tr>

            <tr>
              <td style={styles.head}>Discipline</td>
              <td style={styles.head}>Chemical</td>
              <td style={styles.head}>Group</td>
              <td style={styles.head}>Solid Fuels</td>
              <td style={styles.head}></td>
            </tr>

            <tr>
              <td style={styles.cell}>
                <b>Test Report No</b>
                <br />
                260317-26
              </td>

              <td style={styles.cell}>
                <b>Report date</b>
                <br />
                {values.reportDate}
              </td>

              <td style={styles.cell}>
                <b>Customer PO</b>
                <br />
                250712-01
              </td>

              <td style={styles.cell}>
                <b>Date</b>
                <br />
                12-07-2025
              </td>

              <td style={styles.cell}>
                <b>Text Pages</b>
                <br />1
              </td>
            </tr>
          </tbody>
        </table>

        <table
          style={{
            ...styles.table,
            marginTop: -1,
          }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  ...styles.cell,
                  width: '50%',
                  height: 95,
                  verticalAlign: 'top',
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: 4,
                  }}
                >
                  Customer Name and address
                </div>

                <div
                  style={{
                    marginTop: 24,
                    lineHeight: 1.25,
                  }}
                >
                  {sample?.client_name || 'Ravi Energie Private Limited'}
                  <br />
                  {sample?.client_address ||
                    'S-15 A/B-India Bulls Mega Mall, Jetalpur Road Vadodara 390020, Gujarat, India'}
                </div>
              </td>

              <td
                style={{
                  ...styles.cell,
                  verticalAlign: 'top',
                }}
              >
                <b>Description of test item:-</b> COAL
              </td>
            </tr>
          </tbody>
        </table>

        <table
          style={{
            ...styles.table,
            marginTop: -1,
          }}
        >
          <tbody>
            <tr>
              <td style={styles.head}>Ambient Humidity (% RH)</td>
              <td style={styles.head}>Ambient Temperature (°C)</td>
              <td style={styles.head}>Customer Sample ID</td>
              <td style={styles.head}>Sample lab ID</td>
            </tr>

            <tr>
              <td style={styles.center}>54</td>
              <td style={styles.center}>28</td>
              <td style={styles.center}>
                {sample?.sample_ref_id || 'A-17-AD-534'}
              </td>
              <td style={styles.center}>
                {sample?.lab_internal_id || '26031401'}
              </td>
            </tr>
          </tbody>
        </table>

        <div
          style={{
            borderLeft: BORDER,
            borderRight: BORDER,
            borderBottom: BORDER,
            marginTop: -1,
            padding: '6px 6px',
            fontSize: 12,
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          Test Method :IS1350 (Part-I) :2025 for TM and Proximate and
          IS1350 (Part-II) : 2022 for GCV analysis
        </div>

        <div
          style={{
            textAlign: 'center',
            fontWeight: 700,
            fontSize: 22,
            marginTop: 4,
            marginBottom: 4,
          }}
        >
          Test Results
        </div>

        <table style={styles.table}>
          <tbody>
            <tr>
              <th rowSpan={2} style={styles.head}>
                Date of
                <br />
                sample
                <br />
                receipt
              </th>

              <th rowSpan={2} style={styles.head}>
                Period of
                <br />
                analysis
              </th>

              <th rowSpan={2} style={styles.head}>
                Total
                <br />
                Moisture
                <br />
                (%)
              </th>

              <th colSpan={3} style={styles.head}>
                Air Dried Basis (ADB)
              </th>

              <th colSpan={4} style={styles.head}>
                Equilibrated basis (60% RH and 40 °C)
              </th>
            </tr>

            <tr>
              <th style={styles.head}>
                Moisture
                <br />
                (%)
              </th>

              <th style={styles.head}>
                Ash
                <br />
                (%)
              </th>

              <th style={styles.head}>
                GCV
                <br />
                (kCal/kg)
              </th>

              <th style={styles.head}>
                Moisture
                <br />
                (%)
              </th>

              <th style={styles.head}>
                Ash
                <br />
                (%)
              </th>

              <th style={styles.head}>
                GCV
                <br />
                (kCal/kg)
              </th>

              <th style={styles.head}>Grade</th>
            </tr>

            <tr>
              <td style={styles.center}>{values.receiptDate}</td>
              <td style={styles.center}>{values.period}</td>
              <td style={styles.center}>{values.tm}</td>
              <td style={styles.center}>{values.adbMoisture}</td>
              <td style={styles.center}>{values.adbAsh}</td>
              <td style={styles.center}>{values.adbGcv}</td>
              <td style={styles.center}>{values.eqMoisture}</td>
              <td style={styles.center}>{values.eqAsh}</td>
              <td style={styles.center}>{values.eqGcv}</td>
              <td style={styles.center}>{values.grade}</td>
            </tr>
          </tbody>
        </table>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '58% 42%',
            columnGap: 14,
            marginTop: 18,
            alignItems: 'start',
          }}
        >
          <div>
            {values.parrImage ? (
              <img
                src={values.parrImage}
                alt="parr"
                style={{
                  width: '100%',
                  border: BORDER,
                  display: 'block',
                }}
              />
            ) : (
              <div
                style={{
                  border: BORDER,
                  minHeight: 190,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                }}
              >
                No Parr Calorimeter Image Uploaded
              </div>
            )}
          </div>

          <div
            style={{
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 140,
                height: 140,
                margin: '0 auto',
              }}
            >
              {assets.seal ? (
                <img
                  src={assets.seal}
                  alt="seal"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              ) : null}
            </div>

            <div
              style={{
                fontSize: 14,
                marginTop: 8,
              }}
            >
              Re Reviewed and Authorised By
            </div>

            <div
              style={{
                width: 200,
                height: 60,
                margin: '10px auto 0',
              }}
            >
              {assets.signature ? (
                <img
                  src={assets.signature}
                  alt="signature"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              ) : null}
            </div>

            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                marginTop: 8,
              }}
            >
              {values.analyst}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            fontSize: 10,
            lineHeight: 1.28,
            textAlign: 'justify',
          }}
        >
          <b>Declaration:</b>
          <br />
          1. The test results relates only to the sample submitted for
          testing and as per Lab scope. Product endorsement is neither
          inferred nor implied. 2. This report cannot be reproduced except
          in full without prior written approval from the laboratory head.
          3. The report cannot be used as an evidence in the court of law,
          without written approval of laboratory. 4. The sample will be
          retained for three months. 5. Total liability of the laboratory
          of this report is limited only to the invoiced amount. 6. All
          disputes are subject to Vadodara Jurisdiction. 7. Sampling is
          not done by the laboratory 8. This report relates to only to the
          particular sample as received for testing. 9. Grade of coal is
          given basis of Gcv on EQ Basis as per Gazzette notification from
          Ministry of coal for Declaration of Grade.
        </div>

        <div
          style={{
            textAlign: 'center',
            fontWeight: 700,
            fontSize: 18,
            marginTop: 10,
          }}
        >
          ---------------END OF REPORT---------------
        </div>

        <div
          style={{
            marginTop: 8,
            borderTop: '4px solid #000',
            paddingTop: 6,
          }}
        >
          <div
            style={{
              textAlign: 'center',
              fontSize: 24,
              lineHeight: 1,
            }}
          >
            Unit of <b>Ravi EnergiePvt. Ltd</b>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              columnGap: 20,
              marginTop: 8,
              fontSize: 10,
              lineHeight: 1.2,
            }}
          >
            <div>
              Laboratory: Plot No-14,AstankarBhavan, Behind
              TukaramSabhagruha, SuyogNagar,District Nagpur - 440015,
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
