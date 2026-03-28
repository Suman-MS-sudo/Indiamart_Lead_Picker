// otp_webhook.js
// Simple Express server to receive OTP via webhook

const express = require('express');
const bodyParser = require('body-parser');

let latestOTP = null;

const app = express();
app.use(bodyParser.json());

// Endpoint to receive OTP
app.post('/otp', (req, res) => {
  const { otp } = req.body;
  if (otp) {
    latestOTP = otp;
    console.log('Received OTP:', otp);
    res.status(200).send('OTP received');
  } else {
    res.status(400).send('No OTP found in request');
  }
});

// Endpoint to get latest OTP
app.get('/otp', (req, res) => {
  res.json({ otp: latestOTP });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`OTP webhook server running on port ${PORT}`);
});

module.exports = { getLatestOTP: () => latestOTP };
