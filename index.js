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
    // --- Submit OTP ---
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    // Wait for navigation after OTP submit
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  } else {
    console.log('OTP not received in 60 seconds. Please enter manually.');
    process.stdin.resume();
    await new Promise(resolve => process.stdin.once('data', resolve));
  }
  // Only go to leads page if not already there
  if (!page.url().includes('bltxn')) {
    await page.goto(LEADS_URL, { waitUntil: 'networkidle2' });
  }
}

// --- MAIN SCRIPT ---
async function main() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  let leadCount = 0;
  const processedLeads = new Set();

  // Helper to check if logged in (looks for login form)
  async function isLoggedOut() {
    try {
      const loginBtn = await page.$x("//a[contains(text(),'Login')]");
      const mobNo = await page.$('#mobNo');
      return (loginBtn.length > 0 && mobNo) || (await page.url()).includes('login');
    } catch (e) { return false; }
  }

  // Initial login
  await doLogin(page);

  while (true) {
    // Check if logged out
    if (await isLoggedOut()) {
      console.log('Detected logout. Re-logging in...');
      await doLogin(page);
    }
    // Try to access the leads page
    let leadsPageOk = true;
    try {
      const resp = await page.goto(LEADS_URL, { waitUntil: 'networkidle2' });
      const currentUrl = page.url();
      if (!resp || !resp.ok() || currentUrl.includes('login')) {
        console.log('Could not access leads page, redirecting to login...');
        await doLogin(page);
        leadsPageOk = false;
      }
    } catch (e) {
      console.log('Error loading leads page, redirecting to login...', e);
      await doLogin(page);
      leadsPageOk = false;
    }
    if (!leadsPageOk) {
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }
    try {
      const leadCards = await page.$$('.BuyLdC_wrapCont');
      let found = false;
      let activeLeads = [];
      let newLeads = [];
      for (const card of leadCards) {
        const text = await card.evaluate(el => el.innerText);
        // Use the full card text as a unique identifier
        const cardKey = text.trim();
        // Only consider leads that match keywords (case-insensitive)
        const isMatch = KEYWORDS.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()));
        if (isMatch) {
          activeLeads.push(cardKey);
          if (!processedLeads.has(cardKey)) {
            // Pick only new, matching leads
            let contactBtn = await card.$('.BuyLdC_btn');
            if (!contactBtn) {
              // Fallback to XPath if class selector fails
              const btns = await card.$x(".//button[contains(text(),'Contact Buyer Now')]");
              if (btns.length > 0) contactBtn = btns[0];
            }
            if (contactBtn) {
              // Scroll button into view before clicking
              await card.evaluate(btn => btn.scrollIntoView({behavior: 'smooth', block: 'center'}), contactBtn);
              await page.waitForTimeout(200); // Small delay for UI
              await contactBtn.click();
              leadCount++;
              processedLeads.add(cardKey);
              newLeads.push(cardKey);
              console.log('[NEW LEAD PICKED]', cardKey);
              found = true;
            } else {
              // Log card text for debugging
              console.log(`[WARN] 'Contact Buyer Now' button not found for card:`);
              console.log(text);
            }
          }
        }
      }
      // Print all active leads and highlight new ones
      if (activeLeads.length > 0) {
        console.log('Active matching leads:');
        activeLeads.forEach(l => {
          if (newLeads.includes(l)) {
            console.log('  [NEW]', l);
          } else {
            console.log('      ', l);
          }
        });
      } else {
        console.log('No active matching leads at', new Date().toLocaleTimeString());
      }
      if (newLeads.length === 0) {
        console.log('No new matching leads found at', new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.log('Error:', e);
    }
    await new Promise(r => setTimeout(r, REFRESH_INTERVAL_MS));
  }

  // await browser.close(); // Uncomment to close browser after script ends
}

main();
