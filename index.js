// index.js
// Node.js app to automate IndiaMART lead picking using Puppeteer

const puppeteer = require('puppeteer');


// --- CONFIGURABLE SETTINGS ---
const INDIAMART_USERNAME = '8122378860';
const INDIAMART_PASSWORD = 'Ragav?123';
const LEADS_URL = 'https://seller.indiamart.com/bltxn/?pref=relevant';
const REFRESH_INTERVAL_MS = 30000; // 30 seconds (change as needed)
const KEYWORDS = [
  "Sanitary Vending Machine",
  "Sanitary Vending incinerator",
  "Sanitary Napkin Disposal Incinerator",
  "Sanitary Napkin Vending Machine",
  "Sanitary Pad Destroyer Machine",
  "Sanitary Napkin Disposal Incinerator",
  "Napkin Vending Machine"
];

// --- LOGIN/OTP HANDLER ---
async function doLogin(page) {
  await page.goto('https://seller.indiamart.com/', { waitUntil: 'networkidle2', timeout: 60000 });
  // Click login button if needed
  try {
    const loginBtn = await page.$x("//a[contains(text(),'Login')]");
    if (loginBtn.length > 0) {
      await loginBtn[0].click();
    }
  } catch (e) {}
  await page.waitForSelector('#mobNo', { timeout: 10000 });
  await page.type('#mobNo', INDIAMART_USERNAME);
  await page.waitForSelector('.login_btn', { timeout: 10000 });
  await page.click('.login_btn');
  await page.waitForSelector('#reqOtpMobBtn, #usr_password', { timeout: 15000 });
  const reqOtpBtn = await page.$('#reqOtpMobBtn');
  if (reqOtpBtn) {
    await reqOtpBtn.click();
  }
  await page.waitForSelector('#first', { timeout: 15000 }).catch(() => {});
  // --- HANDLE OTP (auto-fill from webhook) ---
  const axios = require('axios');
  let otp = null;
  console.log('Waiting for OTP from webhook (sent from your mobile)...');
  for (let i = 0; i < 60; i++) { // wait up to 60 seconds
    try {
      const resp = await axios.get('http://localhost:3000/otp');
      if (resp.data && resp.data.otp && resp.data.otp.length >= 4) {
        otp = resp.data.otp;
        break;
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 1000));
  }
  if (otp) {
    for (let i = 0; i < otp.length && i < 6; i++) {
      const fieldId = ['#first', '#second', '#third', '#fourth_num', '#fifth', '#sixth'][i];
      try {
        await page.type(fieldId, otp[i]);
      } catch (e) {}
    }
    console.log('OTP auto-filled:', otp);
  } else {
    console.log('OTP not received in 60 seconds. Please enter manually.');
    process.stdin.resume();
    await new Promise(resolve => process.stdin.once('data', resolve));
  }
  // Wait for leads page to load after login
  await page.goto(LEADS_URL, { waitUntil: 'networkidle2' });
}

// ...existing code...
// ...existing code...
