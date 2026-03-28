# IndiaMART Lead Picker (Node.js)

This Node.js app automates the process of picking leads from IndiaMART using Puppeteer.

## Features
- Logs in to IndiaMART Seller Panel
- Waits for manual OTP entry
- Monitors the leads page
- Automatically clicks "Pick Lead" buttons

## Setup
1. Install dependencies:
   ```sh
   npm install
   ```
2. Update credentials in `index.js` if needed.
3. Run the app:
   ```sh
   npm start
   ```
4. After login, enter OTP manually in the browser, then press Enter in the terminal to continue.

## Notes
- The browser runs in non-headless mode for manual OTP entry.
- Script will keep monitoring and picking new leads automatically.
- To stop, close the terminal or browser window.
