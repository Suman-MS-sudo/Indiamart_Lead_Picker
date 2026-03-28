// index.js
// Node.js app to automate IndiaMART lead picking using Puppeteer

const puppeteer = require('puppeteer');

const INDIAMART_USERNAME = '8122378860';
const INDIAMART_PASSWORD = 'Ragav?123';
const LEADS_URL = 'http://seller.indiamart.com/bltxn/?pref=relevant';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: [
      '--remote-debugging-address=0.0.0.0',
      '--remote-debugging-port=9222',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });
  const page = await browser.newPage();

  // --- LOGIN ---
  await page.goto('http://seller.indiamart.com/', { waitUntil: 'networkidle2' });
  await page.waitForTimeout(2000);

  // Click login button if needed
  try {
    const loginBtn = await page.$x("//a[contains(text(),'Login')]");
    if (loginBtn.length > 0) {
      await loginBtn[0].click();
      await page.waitForTimeout(2000);
    }
  } catch (e) {}

  // Enter mobile number and click Login
  await page.waitForSelector('#mobNo', { timeout: 10000 });
  await page.type('#mobNo', INDIAMART_USERNAME);
  await page.waitForSelector('.login_btn', { timeout: 10000 });
  await page.click('.login_btn');
  await page.waitForTimeout(2000);

  // Wait for OTP/password page to load
  await page.waitForSelector('#reqOtpMobBtn, #usr_password', { timeout: 15000 });

  // Click 'Request OTP on Mobile' if present
  const reqOtpBtn = await page.$('#reqOtpMobBtn');
  if (reqOtpBtn) {
    await reqOtpBtn.click();
    await page.waitForTimeout(1000);
  }

  // Wait for OTP input fields to appear (first digit)
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
    // Try to fill OTP fields (assuming 4-6 digit OTP)
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

  // --- GO TO LEADS PAGE ---
  await page.goto(LEADS_URL, { waitUntil: 'networkidle2' });
  await page.waitForTimeout(3000);

  // --- READ LEADS PAGE MESSAGE ---
  try {
    const message = await page.$eval('.BuyLdC_wrapCont', el => el.innerText);
    console.log('Leads Page Message:');
    console.log(message);
  } catch (e) {
    console.log('No message found in .BuyLdC_wrapCont or selector missing.');
  }

  console.log('Monitoring for new leads...');

  // --- MONITOR AND PICK LEADS ---
  while (true) {
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);
    try {
      const pickButtons = await page.$x("//button[contains(text(),'Pick Lead')]");
      for (const btn of pickButtons) {
        const visible = await btn.boundingBox() !== null;
        if (visible) {
          await btn.click();
          console.log('Picked a lead!');
          await page.waitForTimeout(1000);
          break;
        }
      }
    } catch (e) {
      console.log('Error:', e);
    }
    await page.waitForTimeout(1000);
  }

  // await browser.close(); // Uncomment to close browser after script ends
})();
