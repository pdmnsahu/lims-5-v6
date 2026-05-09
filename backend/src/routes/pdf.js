const express = require('express');

const router = express.Router();

const { generatePdf } = require('../services/pdfService');

const coalReportTemplate = require('../templates/coalReportTemplate');

router.get('/coal-report/:id', async (req, res) => {

  try {

    // Replace with DB fetch later
    const reportData = {
      reportNo: '260317-26',
      date: '17-03-2026',
      customer: 'Ravi Energie',
      moisture: '13.32',
      ash: '56.45',
      gcv: '2729',
      grade: 'G16'
    };

    const html = coalReportTemplate(reportData);

    const pdf = await generatePdf(html);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename=report.pdf',
      'Content-Length': pdf.length
    });

    res.send(pdf);

  } catch (err) {

    console.error(err);

    res.status(500).send('PDF generation failed');

  }

});

module.exports = router;