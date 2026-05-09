import React, { useEffect, useMemo, useRef, useState } from 'react';

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';

  return `${String(d.getDate()).padStart(2, '0')}-${String(
    d.getMonth() + 1
  ).padStart(2, '0')}-${d.getFullYear()}`;
};

const getTest = (tests = [], name) =>
  tests.find((t) => t?.test_name === name);

const deriveGrade = (value) => {
  const v = Number(value);

  if (Number.isNaN(v)) return '—';
  if (v > 7000) return 'G1';
  if (v > 6700) return 'G2';
  if (v > 6400) return 'G3';
  if (v > 6100) return 'G4';
  if (v > 5800) return 'G5';
  if (v > 5500) return 'G6';
  if (v > 5200) return 'G7';
  if (v > 4900) return 'G8';
  if (v > 4600) return 'G9';
  if (v > 4300) return 'G10';
  if (v > 4000) return 'G11';
  if (v > 3700) return 'G12';
  if (v > 3400) return 'G13';
  if (v > 3100) return 'G14';
  if (v > 2800) return 'G15';
  if (v > 2500) return 'G16';
  return 'G17';
};

const imagePlaceholder = {
  border: '1px dashed #94a3b8',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#64748b',
  fontSize: 10,
  width: '100%',
  height: '100%',
  background: '#f8fafc',
};

export default function CoalTestReport({ sample = {}, tests = [], onClose }) {
  const reportRef = useRef(null);

  const [busy, setBusy] = useState(false);

  const [logoImage, setLogoImage] = useState(null);
  const [nablImage, setNablImage] = useState(null);
  const [signatureImage, setSignatureImage] = useState(null);
  const [stampImage, setStampImage] = useState(null);

  const logoInputRef = useRef(null);
  const nablInputRef = useRef(null);
  const signatureInputRef = useRef(null);
  const stampInputRef = useRef(null);

  useEffect(() => {
    if (window.html2pdf) return;

    const script = document.createElement('script');
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';

    document.body.appendChild(script);
  }, []);

  const uploadImage = (event, setter) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => setter(e.target.result);
    reader.readAsDataURL(file);
  };

  const values = useMemo(() => {
    const tm = getTest(tests, 'Total Moisture (TM)');
    const adbMoisture = getTest(tests, 'Moisture (ADB)');
    const ash = getTest(tests, 'Ash (ADB)');
    const vm = getTest(tests, 'Volatile Matter (ADB)');
    const gcv = getTest(tests, 'Gross Calorific Value');
    const eqMoisture = getTest(tests, 'Moisture (EQ)');

    const gcvValue = Number(gcv?.result_value || 0);
    const eqGcv = Math.round(gcvValue * 0.99);

    return {
      tm: tm?.result_value || '—',
      adbMoisture: adbMoisture?.result_value || '—',
      ash: ash?.result_value || '—',
      vm: vm?.result_value || '—',
      gcv: gcv?.result_value || '—',
      eqMoisture: eqMoisture?.result_value || '—',
      eqGcv: eqGcv || '—',
      grade: deriveGrade(eqGcv),
      reportDate:
        formatDate(gcv?.reviewed_at || adbMoisture?.reviewed_at) ||
        formatDate(new Date()),
      receivedDate: formatDate(sample?.group_created_at),
      testedDate: formatDate(gcv?.reviewed_at || adbMoisture?.reviewed_at),
      analyst:
        gcv?.assigned_by_name ||
        adbMoisture?.assigned_by_name ||
        tm?.assigned_by_name ||
        '—',
      image: gcv?.image_url || null,
    };
  }, [sample, tests]);

  const generatePdf = async () => {
    if (!reportRef.current) return;

    setBusy(true);

    try {
      await new Promise((resolve) => {
        if (window.html2pdf) {
          resolve();
          return;
        }

        const interval = setInterval(() => {
          if (window.html2pdf) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
      });

      await window
        .html2pdf()
        .set({
          margin: [0, 0, 0, 0],
          filename: `${sample?.lab_internal_id || 'Coal_Report'}.pdf`,
          image: {
            type: 'jpeg',
            quality: 1,
          },
          html2canvas: {
            scale: 2,
            useCORS: true,
            scrollY: 0,
          },
          jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait',
          },
          pagebreak: {
            mode: ['avoid-all'],
          },
        })
        .from(reportRef.current)
        .save();
    } catch (error) {
      console.error(error);
      alert(`PDF generation failed: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const UploadCard = ({ label, image, inputRef, onChange }) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#334155',
        }}
      >
        {label}
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        style={{
          width: 150,
          height: 80,
          cursor: 'pointer',
          overflow: 'hidden',
          borderRadius: 6,
          border: '1px solid #cbd5e1',
        }}
      >
        {image ? (
          <img
            src={image}
            alt={label}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              background: '#fff',
            }}
          />
        ) : (
          <div style={imagePlaceholder}>Click to Upload</div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onChange}
        style={{ display: 'none' }}
      />
    </div>
  );

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#e2e8f0',
        padding: 24,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <UploadCard
            label="Company Logo"
            image={logoImage}
            inputRef={logoInputRef}
            onChange={(e) => uploadImage(e, setLogoImage)}
          />

          <UploadCard
            label="NABL / Accreditation"
            image={nablImage}
            inputRef={nablInputRef}
            onChange={(e) => uploadImage(e, setNablImage)}
          />

          <UploadCard
            label="Authorized Signature"
            image={signatureImage}
            inputRef={signatureInputRef}
            onChange={(e) => uploadImage(e, setSignatureImage)}
          />

          <UploadCard
            label="Laboratory Stamp"
            image={stampImage}
            inputRef={stampInputRef}
            onChange={(e) => uploadImage(e, setStampImage)}
          />
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
          }}
        >
          {onClose && (
            <button
              onClick={onClose}
              style={{
                border: 'none',
                background: '#0f172a',
                color: '#fff',
                padding: '12px 20px',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Close
            </button>
          )}

          <button
            onClick={generatePdf}
            disabled={busy}
            style={{
              border: 'none',
              background: '#15803d',
              color: '#fff',
              padding: '12px 20px',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {busy ? 'Generating PDF...' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div
        ref={reportRef}
        style={{
          width: '210mm',
          height: '297mm',
          background: '#fff',
          margin: '0 auto',
          boxSizing: 'border-box',
          overflow: 'hidden',
          color: '#000',
          fontFamily: 'Times New Roman, serif',
          position: 'relative',
          padding: '10mm',
        }}
      >
        <div
          style={{
            border: '2px solid #000',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              borderBottom: '2px solid #000',
              padding: '8px 12px 6px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr 120px',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 120,
                  height: 70,
                  overflow: 'hidden',
                }}
              >
                {logoImage ? (
                  <img
                    src={logoImage}
                    alt="logo"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <div style={imagePlaceholder}>LOGO</div>
                )}
              </div>

              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    letterSpacing: 1,
                  }}
                >
                  RAVI ENERGIE LABORATORY
                </div>

                <div
                  style={{
                    fontSize: 12,
                    marginTop: 4,
                    lineHeight: 1.5,
                  }}
                >
                  Plot No-14, Astankar Bhavan, Behind Tukaram Sabhagruha,
                  Suyog Nagar, Nagpur - 440015, Maharashtra, India
                </div>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                  }}
                >
                  Phone: +91 8320021741 | Email: lab@ravienergie.com
                </div>
              </div>

              <div
                style={{
                  width: 120,
                  height: 70,
                  overflow: 'hidden',
                  marginLeft: 'auto',
                }}
              >
                {nablImage ? (
                  <img
                    src={nablImage}
                    alt="nabl"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <div style={imagePlaceholder}>NABL</div>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              textAlign: 'center',
              borderBottom: '2px solid #000',
              padding: '10px 0',
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 3,
              }}
            >
              TEST REPORT
            </div>

            <div
              style={{
                marginTop: 4,
                fontSize: 13,
              }}
            >
              Report No: {sample?.lab_internal_id || sample?.sample_ref_id || '—'}
            </div>
          </div>

          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 11,
            }}
          >
            <tbody>
              <tr>
                <td style={cellHeading}>Customer Name</td>
                <td style={cellValue}>
                  {sample?.client_name || '—'}
                </td>
                <td style={cellHeading}>Report Date</td>
                <td style={cellValue}>{values.reportDate}</td>
              </tr>

              <tr>
                <td style={cellHeading}>Customer Address</td>
                <td style={cellValue}>
                  {sample?.client_address || '—'}
                </td>
                <td style={cellHeading}>Received Date</td>
                <td style={cellValue}>{values.receivedDate}</td>
              </tr>

              <tr>
                <td style={cellHeading}>Sample ID</td>
                <td style={cellValue}>
                  {sample?.sample_ref_id || '—'}
                </td>
                <td style={cellHeading}>Lab ID</td>
                <td style={cellValue}>
                  {sample?.lab_internal_id || '—'}
                </td>
              </tr>

              <tr>
                <td style={cellHeading}>Commodity</td>
                <td style={cellValue}>COAL</td>
                <td style={cellHeading}>Analyst</td>
                <td style={cellValue}>{values.analyst}</td>
              </tr>

              <tr>
                <td style={cellHeading}>Test Method</td>
                <td colSpan={3} style={cellValue}>
                  IS 1350 (Part-I):2025 for Proximate Analysis and IS 1350
                  (Part-II):2022 for GCV Analysis
                </td>
              </tr>
            </tbody>
          </table>

          <div
            style={{
              padding: '10px 12px 0',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginBottom: 16,
              }}
            >
              <thead>
                <tr>
                  <th style={tableHead}>Sl. No.</th>
                  <th style={tableHead}>Parameter</th>
                  <th style={tableHead}>Result</th>
                  <th style={tableHead}>Unit</th>
                  <th style={tableHead}>Basis</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td style={tableCell}>1</td>
                  <td style={tableCell}>Total Moisture</td>
                  <td style={tableCell}>{values.tm}</td>
                  <td style={tableCell}>%</td>
                  <td style={tableCell}>TM</td>
                </tr>

                <tr>
                  <td style={tableCell}>2</td>
                  <td style={tableCell}>Moisture</td>
                  <td style={tableCell}>{values.adbMoisture}</td>
                  <td style={tableCell}>%</td>
                  <td style={tableCell}>ADB</td>
                </tr>

                <tr>
                  <td style={tableCell}>3</td>
                  <td style={tableCell}>Ash</td>
                  <td style={tableCell}>{values.ash}</td>
                  <td style={tableCell}>%</td>
                  <td style={tableCell}>ADB</td>
                </tr>

                <tr>
                  <td style={tableCell}>4</td>
                  <td style={tableCell}>Volatile Matter</td>
                  <td style={tableCell}>{values.vm}</td>
                  <td style={tableCell}>%</td>
                  <td style={tableCell}>ADB</td>
                </tr>

                <tr>
                  <td style={tableCell}>5</td>
                  <td style={tableCell}>Gross Calorific Value</td>
                  <td style={tableCell}>{values.gcv}</td>
                  <td style={tableCell}>kcal/kg</td>
                  <td style={tableCell}>ADB</td>
                </tr>

                <tr>
                  <td style={tableCell}>6</td>
                  <td style={tableCell}>Equilibrated Moisture</td>
                  <td style={tableCell}>{values.eqMoisture}</td>
                  <td style={tableCell}>%</td>
                  <td style={tableCell}>EQ</td>
                </tr>

                <tr>
                  <td style={tableCell}>7</td>
                  <td style={tableCell}>Equivalent GCV</td>
                  <td style={tableCell}>{values.eqGcv}</td>
                  <td style={tableCell}>kcal/kg</td>
                  <td style={tableCell}>ARB</td>
                </tr>

                <tr>
                  <td style={tableCell}>8</td>
                  <td style={tableCell}>Coal Grade</td>
                  <td style={tableCell}>{values.grade}</td>
                  <td style={tableCell}>—</td>
                  <td style={tableCell}>—</td>
                </tr>
              </tbody>
            </table>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 240px',
                gap: 16,
                alignItems: 'stretch',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  border: '1px solid #000',
                  padding: 10,
                  fontSize: 11,
                  lineHeight: 1.7,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: 6,
                    fontSize: 12,
                  }}
                >
                  Remarks
                </div>

                <div>
                  1. Results relate only to the sample tested.
                </div>

                <div>
                  2. This report shall not be reproduced except in full without
                  written approval from the laboratory.
                </div>

                <div>
                  3. Moisture loss due to storage and transportation is beyond
                  laboratory control.
                </div>

                <div>
                  4. Sample condition received: Satisfactory.
                </div>
              </div>

              <div
                style={{
                  border: '1px solid #000',
                  padding: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 12,
                    marginBottom: 8,
                    textAlign: 'center',
                  }}
                >
                  Sample Image
                </div>

                <div
                  style={{
                    flex: 1,
                    border: '1px solid #000',
                    overflow: 'hidden',
                    minHeight: 130,
                  }}
                >
                  {values.image ? (
                    <img
                      src={values.image}
                      alt="sample"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <div style={imagePlaceholder}>No Sample Image</div>
                  )}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 'auto',
                borderTop: '1px solid #000',
                paddingTop: 16,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 20,
                alignItems: 'end',
              }}
            >
              <div>
                <div
                  style={{
                    width: 150,
                    height: 70,
                    marginBottom: 8,
                    overflow: 'hidden',
                  }}
                >
                  {stampImage ? (
                    <img
                      src={stampImage}
                      alt="stamp"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  ) : (
                    <div style={imagePlaceholder}>STAMP</div>
                  )}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  Laboratory Seal
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    width: 180,
                    height: 70,
                    marginLeft: 'auto',
                    marginBottom: 8,
                    overflow: 'hidden',
                  }}
                >
                  {signatureImage ? (
                    <img
                      src={signatureImage}
                      alt="signature"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  ) : (
                    <div style={imagePlaceholder}>SIGNATURE</div>
                  )}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  Authorized Signatory
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const cellHeading = {
  border: '1px solid #000',
  padding: '8px',
  fontWeight: 700,
  width: '18%',
  background: '#f8fafc',
};

const cellValue = {
  border: '1px solid #000',
  padding: '8px',
};

const tableHead = {
  border: '1px solid #000',
  padding: '8px',
  background: '#e2e8f0',
  fontSize: 11,
  fontWeight: 700,
};

const tableCell = {
  border: '1px solid #000',
  padding: '8px',
  fontSize: 11,
  textAlign: 'center',
};