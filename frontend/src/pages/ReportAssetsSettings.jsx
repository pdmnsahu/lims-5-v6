
import React, { useEffect, useState } from "react";

export default function ReportAssetsSettings() {
  const [assets, setAssets] = useState({
    logo: "",
    nabl: "",
    signature: "",
    seal: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem("report_assets");

    if (saved) {
      setAssets(JSON.parse(saved));
    }
  }, []);

  const upload = (e, key) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (ev) => {
      const updated = {
        ...assets,
        [key]: ev.target.result,
      };

      setAssets(updated);

      localStorage.setItem(
        "report_assets",
        JSON.stringify(updated)
      );
    };

    reader.readAsDataURL(file);
  };

  return (
    <div style={{ padding: 30 }}>
      <h1>Report Asset Settings</h1>

      <p>
        Super admin can upload reusable report assets here.
      </p>

      {["logo", "nabl", "signature", "seal"].map((key) => (
        <div key={key} style={{ marginBottom: 20 }}>
          <label>
            <b>{key.toUpperCase()}</b>
          </label>

          <br />

          <input
            type="file"
            accept="image/*"
            onChange={(e) => upload(e, key)}
          />

          {assets[key] && (
            <div style={{ marginTop: 10 }}>
              <img
                src={assets[key]}
                alt=""
                style={{
                  maxHeight: 100,
                  border: "1px solid #ccc",
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
