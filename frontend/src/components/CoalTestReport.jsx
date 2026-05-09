import React, { useMemo } from 'react';

const byName = (tests = [], name) =>
  tests.find((t) => t.test_name === name);

const dd = (date) => {
  if (!date) return '—';

  try {
    return new Date(date)
      .toLocaleDateString('en-GB')
      .replace(/\//g, '-');
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

  const eqGcv = useMemo(() => {
    if (!tGCV?.result_value) return null;

    return Math.round(
      parseFloat(tGCV.result_value) * 0.99
    );
  }, [tGCV]);

  const grade = deriveGrade(eqGcv);

  const reportNo =
    sample.lab_internal_id ||
    sample.sample_ref_id ||
    '—';

  return (
    <div
      style={{
        width: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        background: '#fff',
        padding: '12mm',
        fontFamily: 'Times New Roman',
        color: '#000',
        boxSizing: 'border-box',
        fontSize: '12px',
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
        }}
      >
        <img
          src={settings.logo_url}
          alt=""
          style={{
            width: '90px',
            objectFit: 'contain',
          }}
        />

        <div
          style={{
            flex: 1,
            paddingLeft: '10px',
          }}
        >
          <div
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
            }}
          >
            {settings.lab_name ||
              'Ravi Energie Laboratory'}
          </div>
        </div>

        <img
          src={settings.accreditation_url}
          alt=""
          style={{
            width: '90px',
            objectFit: 'contain',
          }}
        />
      </div>

      {/* TITLE */}
      <div
        style={{
          border: '1px solid black',
          textAlign: 'center',
          padding: '6px',
        }}
      >
        <div
          style={{
            fontSize: '30px',
            fontWeight: 'bold',
          }}
        >
          TEST REPORT
        </div>

        <div
          style={{
            fontWeight: 'bold',
            fontSize: '14px',
          }}
        >
          {sample.sample_ref_id}
        </div>
      </div>

      {/* META TABLE */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: '8px',
        }}
      >
        <tbody>
          <tr>
            {[
              'Discipline',
              'Group',
              'Customer PO',
              'Date',
              'Text Pages',
            ].map((h) => (
              <th
                key={h}
                style={{
                  border: '1px solid black',
                  padding: '6px',
                }}
              >
                {h}
              </th>
            ))}
          </tr>

          <tr>
            <td style={td}>Chemical</td>
            <td style={td}>Solid Fuels</td>
            <td style={td}>
              {sample.customer_po || '—'}
            </td>
            <td style={td}>
              {dd(sample.group_created_at)}
            </td>
            <td style={td}>1</td>
          </tr>
        </tbody>
      </table>

      {/* CUSTOMER BLOCK */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: '12px',
        }}
      >
        <tbody>
          <tr>
            <td
              style={{
                ...td,
                width: '50%',
                height: '120px',
                verticalAlign: 'top',
              }}
            >
              <div>
                Customer Name and address
              </div>

              <div style={{ marginTop: '40px' }}>
                <strong>
                  {sample.customer_name}
                </strong>

                <br />

                {sample.customer_address}
              </div>
            </td>

            <td
              style={{
                ...td,
                width: '50%',
                verticalAlign: 'top',
              }}
            >
              Description of test item:- COAL
            </td>
          </tr>

          <tr>
            <th style={th}>
              Ambient Humidity (% RH)
            </th>

            <th style={th}>
              Ambient Temperature (°C)
            </th>

            <th style={th}>
              Customer Sample ID
            </th>

            <th style={th}>
              Sample lab ID
            </th>
          </tr>

          <tr>
            <td style={td}>
              {sample.ambient_humidity || '54'}
            </td>

            <td style={td}>
              {sample.ambient_temperature || '28'}
            </td>

            <td style={td}>
              {sample.customer_sample_id || '—'}
            </td>

            <td style={td}>{reportNo}</td>
          </tr>
        </tbody>
      </table>

      {/* METHOD */}
      <div
        style={{
          border: '1px solid black',
          borderTop: 'none',
          padding: '6px',
          fontWeight: 'bold',
        }}
      >
        Test Method :IS1350 (Part-I) :2025 for TM and
        Proximate and IS1350 (Part-II) : 2022 for GCV
        analysis
      </div>

      {/* RESULTS */}
      <div
        style={{
          border: '1px solid black',
          borderTop: 'none',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '22px',
          padding: '4px',
        }}
      >
        Test Results
      </div>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
        }}
      >
        <thead>
          <tr>
            <th style={th} rowSpan={2}>
              Date of sample receipt
            </th>

            <th style={th} rowSpan={2}>
              Period of analysis
            </th>

            <th style={th} rowSpan={2}>
              Total Moisture (%)
            </th>

            <th style={th} colSpan={3}>
              Air Dried Basis (ADB)
            </th>

            <th style={th} colSpan={4}>
              Equilibrated basis
            </th>
          </tr>

          <tr>
            <th style={th}>Moisture</th>
            <th style={th}>Ash</th>
            <th style={th}>GCV</th>

            <th style={th}>Moisture</th>
            <th style={th}>Ash</th>
            <th style={th}>GCV</th>
            <th style={th}>Grade</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td style={td}>
              {dd(sample.group_created_at)}
            </td>

            <td style={td}>
              {dd(tTM?.submitted_at)}
              <br />
              to
              <br />
              {dd(tGCV?.reviewed_at)}
            </td>

            <td style={td}>
              {tTM?.result_value || '—'}
            </td>

            <td style={td}>
              {tAM?.result_value || '—'}
            </td>

            <td style={td}>
              {tAA?.result_value || '—'}
            </td>

            <td style={td}>
              {tGCV?.result_value || '—'}
            </td>

            <td style={td}>
              {tEQM?.result_value || '—'}
            </td>

            <td style={td}>
              {tAA?.result_value || '—'}
            </td>

            <td style={td}>
              {eqGcv || '—'}
            </td>

            <td style={td}>{grade}</td>
          </tr>
        </tbody>
      </table>

      {/* LOWER SECTION */}
      <div
        style={{
          display: 'flex',
          marginTop: '18px',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ width: '68%' }}>
          <img
            src={tGCV?.image_url}
            alt=""
            style={{
              width: '100%',
              objectFit: 'contain',
            }}
          />
        </div>

        <div
          style={{
            width: '28%',
            textAlign: 'center',
          }}
        >
          <img
            src={settings.stamp_url}
            alt=""
            style={{
              width: '120px',
            }}
          />

          <div
            style={{
              marginTop: '10px',
            }}
          >
            Reviewed and Authorised By
          </div>

          <img
            src={settings.signature_url}
            alt=""
            style={{
              width: '120px',
              marginTop: '10px',
            }}
          />

          <div
            style={{
              marginTop: '10px',
              fontWeight: 'bold',
            }}
          >
            {tGCV?.assigned_by_name || '—'}
          </div>
        </div>
      </div>
    </div>
  );
}

const td = {
  border: '1px solid black',
  padding: '4px',
  textAlign: 'center',
};

const th = {
  border: '1px solid black',
  padding: '4px',
  fontWeight: 'bold',
  textAlign: 'center',
};