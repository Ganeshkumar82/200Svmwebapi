// verification.js
const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

router.get('/', async (req, res) => {
  const actoken = req.query.acttoken;

  if (!actoken) {
    return res.status(400).json({ error: 'Missing or empty actoken' });
  }

  try {
    const verificationResponse = await fetch('http://192.168.0.198:8080/customer/verifyaccount', {
      method: 'POST',
      body: JSON.stringify({ querystring: actoken }),
      headers: { 'Content-Type': 'application/json' },
    });

    const json = await verificationResponse.json();

    if (json.errorcode && json.errormessage) {
      const errorMessage = `Error: ${json.errormessage}`;
      res.status(400).json({ error: errorMessage });
    } else {
      res.status(200).json({ success: 'Verification successful' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
