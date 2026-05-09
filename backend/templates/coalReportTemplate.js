function coalReportTemplate(data) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">

<style>

@page {
  size: A4;
  margin: 0;
}

body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
  background: white;
}

.page {
  width: 210mm;
  height: 297mm;
  padding: 10mm;
  box-sizing: border-box;
}

.title {
  text-align: center;
  font-size: 24px;
  font-weight: bold;
  margin-top: 5mm;
}

.table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 5mm;
}

.table td,
.table th {
  border: 1px solid black;
  padding: 2mm;
  font-size: 10pt;
}

.section-title {
  font-size: 14pt;
  font-weight: bold;
  margin-top: 5mm;
}

.footer {
  position: absolute;
  bottom: 10mm;
  left: 10mm;
  right: 10mm;
  font-size: 8pt;
}

</style>
</head>

<body>

<div class="page">

  <div class="title">
    TEST REPORT
  </div>

  <table class="table">
    <tr>
      <th>Report No</th>
      <th>Date</th>
      <th>Customer</th>
    </tr>

    <tr>
      <td>${data.reportNo}</td>
      <td>${data.date}</td>
      <td>${data.customer}</td>
    </tr>
  </table>

  <div class="section-title">
    Test Results
  </div>

  <table class="table">

    <tr>
      <th>Total Moisture</th>
      <th>Ash</th>
      <th>GCV</th>
      <th>Grade</th>
    </tr>

    <tr>
      <td>${data.moisture}</td>
      <td>${data.ash}</td>
      <td>${data.gcv}</td>
      <td>${data.grade}</td>
    </tr>

  </table>

  <div class="footer">
    END OF REPORT
  </div>

</div>

</body>
</html>
`;
}

module.exports = coalReportTemplate;