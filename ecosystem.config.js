module.exports = {
  apps: [
    // 1. Start Xvfb (virtual X server)
    {
      name: "xvfb",
      script: "/usr/bin/Xvfb",
      args: ":1 -screen 0 1280x800x24",
      autorestart: true,
      watch: false,
      max_restarts: 5,
      env: {
        DISPLAY: ":1"
      }
    },
    // 2. Start fluxbox (window manager)
    {
      name: "fluxbox",
      script: "/usr/bin/fluxbox",
      args: "-display :1",
      autorestart: true,
      watch: false,
      max_restarts: 5,
      env: {
        DISPLAY: ":1"
      },
      wait_ready: true,
      kill_timeout: 5000
    },
    // 3. Start x11vnc (VNC server)
    {
      name: "x11vnc",
      script: "/usr/bin/x11vnc",
      args: "-display :1 -forever -nopw -shared -rfbport 5901",
      autorestart: true,
      watch: false,
      max_restarts: 5,
      env: {
        DISPLAY: ":1"
      },
      wait_ready: true,
      kill_timeout: 5000
    },
    // 4. Start indiamart-lead-picker (Puppeteer)
    {
      name: "indiamart-lead-picker",
      script: "index.js",
      env: {
        DISPLAY: ":1"
      },
      autorestart: true,
      watch: false
    },
    // 5. Start otp-webhook
    {
      name: "otp-webhook",
      script: "otp_webhook.js",
      env: {
        DISPLAY: ":1"
      },
      autorestart: true,
      watch: false
    }
  ]
};
