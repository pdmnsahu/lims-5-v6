import React, { useMemo } from 'react';
import './CoalTestReport.css';

const byName = (tests = [], name) =>
  tests.find((t) => t.test_name === name);

const dd = (date) => {
  if (!date) return '—';

  try {
    const d = new Date(date);

    return d.toLocaleDateString('en-GB').replace(/\//g, '-');
  } catch {
    return '—';
  }
};

const deriveGrade = (gcv) => {
  if (!gcv) return '—';

  const value = Number(gcv);

  if (value >= 7000) return 'G1';
  if (value >= 6700) return 'G2';
  if (value >= 6400) return 'G3';
  if (value >= 6100) return 'G4';
  if (value >= 5800) return 'G5';
  if (value >= 5500) return 'G6';
  if (value >= 5200) return 'G7';
  if (value >= 4900) return 'G8';
  if (value >= 4600) return 'G9';
  if (value >= 4300) return 'G10';
  if (value >= 4000) return 'G11';
  if (value >= 3700) return 'G12';
  if (value >= 3400) return 'G13';
  if (value >= 3100) return 'G14';
  if (value >= 2800) return 'G15';

  return 'G16';
};

export default function CoalTestReport({
  sample = {},
  tests = [],
  settings = {},
}) {
  const tTM = byName(tests, 'Total Moisture (TM)');
  const tAM = byName(tests, 'Moisture (ADB)');
  const tAA = byName(tests, 'Ash (ADB)');
  const tGCV = byName(tests, 'Gross Calorific Value');
  const tEQM = byName(tests, 'Moisture (EQ)');
  const tVM = byName(tests, 'Volatile Matter (ADB)');

  const eqGcv = useMemo(() => {
    if (!tGCV?.result_value) return null;

    return Math.round(parseFloat(tGCV.result_value) * 0.99);
  }, [tGCV]);

  const grade = deriveGrade(eqGcv);

  const reportNo =
    sample.lab_internal_id ||
    sample.sample_ref_id ||
    '—';

  const customerName =
    sample.customer_name ||
    sample.client_name ||
    '—';

  const customerAddress =
    sample.customer_address ||
    sample.address ||
    '—';

  const analysisFrom = dd(tTM?.submitted_at);
  const analysisTo = dd(tGCV?.reviewed_at);

  return (
    <div className="report-page">
      {/* HEADER */}
      <div className="header-row">
        <div className="header-logo-left">
          {settings.logo_url ? (
            <img
              src={settings.logo_url}
              alt="Lab Logo"
              className="lab-logo"
            />
          ) : null}
        </div>

        <div className="header-title">
          <h1>
            {settings.lab_name || 'Ravi Energie Laboratory'}
          </h1>
        </div>

        <div className="header-logo-right">
          {settings.accreditation_url ? (
            <img
              src={settings.accreditation_url}
              alt="Accreditation"
              className="nabl-logo"
            />
          ) : null}
        </div>
      </div>

      {/* REPORT TITLE */}
      <div className="report-title-box">
        <div className="report-title">TEST REPORT</div>

        <div className="report-sub-code">
          {sample.sample_ref_id || 'TC1643426000004497F'}
        </div>
      </div>

      {/* TOP META TABLE */}
      <table className="meta-table">
        <tbody>
          <tr>
            <th>Discipline</th>
            <th>Group</th>
            <th>Customer PO</th>
            <th>Date</th>
            <th>Text Pages</th>
          </tr>

          <tr>
            <td>
              <div>Chemical</div>
            </td>

            <td>
              <div>Solid Fuels</div>
            </td>

            <td>
              <div>{sample.customer_po || '—'}</div>
            </td>

            <td>
              <div>{dd(sample.group_created_at)}</div>
            </td>

            <td>
              <div>1</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* CUSTOMER BLOCK */}
      <table className="customer-table">
        <tbody>
          <tr>
            <td className="customer-left">
              <div className="section-label">
                Customer Name and address
              </div>

              <div className="customer-content">
                <strong>{customerName}</strong>
                <br />
                {customerAddress}
              </div>
            </td>

            <td className="customer-right">
              <div className="section-label">
                Description of test item:- COAL
              </div>
            </td>
          </tr>

          <tr>
            <th>Ambient Humidity (% RH)</th>
            <th>Ambient Temperature (°C)</th>
            <th>Customer Sample ID</th>
            <th>Sample lab ID</th>
          </tr>

          <tr>
            <td>{sample.ambient_humidity || '54'}</td>
            <td>{sample.ambient_temperature || '28'}</td>
            <td>{sample.customer_sample_id || '—'}</td>
            <td>{reportNo}</td>
          </tr>
        </tbody>
      </table>

      {/* METHOD */}
      <div className="method-strip">
        Test Method :IS1350 (Part-I) :2025 for TM and Proximate and
        IS1350 (Part-II) : 2022 for GCV analysis
      </div>

      {/* RESULTS */}
      <div className="results-title">
        Test Results
      </div>

      <table className="results-table">
        <thead>
          <tr>
            <th rowSpan="3">Date of sample receipt</th>
            <th rowSpan="3">Period of analysis</th>
            <th rowSpan="3">Total Moisture (%)</th>
            <th colSpan="3">Air Dried Basis (ADB)</th>
            <th colSpan="4">
              Equilibrated basis (60% RH and 40 °C)
            </th>
          </tr>

          <tr>
            <th>Moisture (%)</th>
            <th>Ash (%)</th>
            <th>GCV (kCal/kg)</th>
            <th>Moisture (%)</th>
            <th>Ash (%)</th>
            <th>GCV (kCal/kg)</th>
            <th>Grade</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>{dd(sample.group_created_at)}</td>

            <td>
              {analysisFrom}
              <br />
              to
              <br />
              {analysisTo}
            </td>

            <td>{tTM?.result_value || '—'}</td>
            <td>{tAM?.result_value || '—'}</td>
            <td>{tAA?.result_value || '—'}</td>
            <td>{tGCV?.result_value || '—'}</td>
            <td>{tEQM?.result_value || '—'}</td>
            <td>{tAA?.result_value || '—'}</td>
            <td>{eqGcv || '—'}</td>
            <td>{grade}</td>
          </tr>
        </tbody>
      </table>

      {/* INSTRUMENT + SIGNATURE */}
      <div className="bottom-section">
        <div className="instrument-panel">
          {tGCV?.image_url ? (
            <img
              src={tGCV.image_url}
              alt="Instrument Data"
              className="instrument-image"
            />
          ) : (
            <div className="instrument-placeholder">
              Instrument data image not available
            </div>
          )}
        </div>

        <div className="signature-panel">
          {settings.stamp_url ? (
            <img
              src={settings.stamp_url}
              alt="Stamp"
              className="stamp-image"
            />
          ) : null}

          <div className="auth-text">
            Reviewed and Authorised By
          </div>

          {settings.signature_url ? (
            <img
              src={settings.signature_url}
              alt="Signature"
              className="signature-image"
            />
          ) : null}

          <div className="signatory-name">
            {tGCV?.assigned_by_name || '—'}
          </div>
        </div>
      </div>

      {/* DECLARATION */}
      <div className="declaration">
        <strong>Declaration:</strong>
        <br />
        1. The test results relates only to the sample submitted for testing and as per Lab scope.
        Product endorsement is neither inferred nor implied.
        2. This report cannot be reproduced except in full without prior written approval from the laboratory head.
        3. The report cannot be used as an evidence in the court of law, without written approval of laboratory.
        4. The sample will be retained for three months.
        5. Total liability of the laboratory of this report is limited only to the invoiced amount.
        6. All disputes are subject to Vadodara Jurisdiction.
        7. Sampling is not done by the laboratory.
        8. This report relates to only the particular sample as received for testing.
        9. Grade of coal is given basis of Gcv on EQ Basis as per Gazette notification from Ministry of coal for Declaration of Grade.
      </div>

      {/* END LINE */}
      <div className="end-report">
        ----------------END OF REPORT----------------
      </div>

      {/* FOOTER */}
      <div className="footer-line" />

      <div className="footer-brand">
        Unit of
        <span>
          Ravi Energie Pvt. Ltd
        </span>
      </div>

      <div className="footer-grid">
        <div>
          <strong>Laboratory:</strong>
          <br />
          {settings.lab_address || 'Plot No-14'}
        </div>

        <div>
          <strong>Corporate Office:</strong>
          <br />
          {settings.corp_office || 'Vadodara'}
        </div>

        <div>
          <strong>Phone:</strong>
          {' '}
          {settings.lab_phone || '—'}
          <br />

          <strong>Email:</strong>
          {' '}
          {settings.lab_email || '—'}
          <br />

          <strong>Website:</strong>
          {' '}
          {settings.lab_website || '—'}
        </div>
      </div>
    </div>
  );
}