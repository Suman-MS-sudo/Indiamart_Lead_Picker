module.exports = {
  apps: [
    {
      name: "indiamart-lead-picker",
      script: "index.js",
      env: {
        DISPLAY: ":1"
      }
    },
    {
      name: "otp-webhook",
      script: "otp_webhook.js",
      env: {
        DISPLAY: ":1"
      }
    }
  ]
};
