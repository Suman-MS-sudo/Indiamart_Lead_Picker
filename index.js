// index.js
// Node.js app to automate IndiaMART lead picking using Puppeteer

const puppeteer = require('puppeteer');

const INDIAMART_USERNAME = '8122378860';
const INDIAMART_PASSWORD = 'Ragav?123';
const LEADS_URL = 'https://seller.indiamart.com/bltxn/?pref=relevant';

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // Enable UI
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });
  // Forward browser console messages to Node.js console
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));



  // --- LOGIN ---
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.goto('https://seller.indiamart.com/', { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'step1-login.png' });

  // Click login button if needed
  try {
    const loginBtn = await page.$x("//a[contains(text(),'Login')]");
    if (loginBtn.length > 0) {
      await loginBtn[0].click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'step2-after-login-btn.png' });
    }
  } catch (e) {}

  // Enter mobile number and click Login
  await page.waitForSelector('#mobNo', { timeout: 10000 });
  await page.type('#mobNo', INDIAMART_USERNAME);
  await page.waitForSelector('.login_btn', { timeout: 10000 });
  await page.click('.login_btn');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'step3-after-login-submit.png' });

  // Wait for OTP/password page to load
  await page.waitForSelector('#reqOtpMobBtn, #usr_password', { timeout: 15000 });
  await page.screenshot({ path: 'step4-otp-or-password.png' });

  // Click 'Request OTP on Mobile' if present
  const reqOtpBtn = await page.$('#reqOtpMobBtn');
  if (reqOtpBtn) {
    await reqOtpBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'step5-request-otp.png' });
  }

  // Wait for OTP input fields to appear (first digit)
  await page.waitForSelector('#first', { timeout: 15000 }).catch(() => {});
  await page.screenshot({ path: 'step6-otp-input.png' });

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
    await page.screenshot({ path: 'step7-otp-filled.png' });
  } else {
    console.log('OTP not received in 60 seconds. Please enter manually.');
    process.stdin.resume();
    await new Promise(resolve => process.stdin.once('data', resolve));
    await page.screenshot({ path: 'step7b-manual-otp.png' });
  }

  // --- GO TO LEADS PAGE ---
  await page.goto(LEADS_URL, { waitUntil: 'networkidle2' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'step8-leads-page.png' });

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
  let leadCount = 0;
  while (true) {
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);
    try {
      const pickButtons = await page.$x("//button[contains(text(),'Pick Lead')]");
      for (const btn of pickButtons) {
        const visible = await btn.boundingBox() !== null;
        if (visible) {
          await btn.click();
          leadCount++;
          console.log('Picked a lead! Total:', leadCount);
          await page.screenshot({ path: `lead_picked_${leadCount}.png` });
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
