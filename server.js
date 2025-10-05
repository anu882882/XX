const express = require('express');
const path = require('path');
const cors = require('cors');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// In-memory token store (for demo)
let REFRESH_TOKEN_MEMORY = "";

// Env
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://developers.google.com/oauthplayground';
const EMAIL_ADDRESS = process.env.EMAIL_ADDRESS;

// Helpers
function getOAuth2Client(refreshToken) {
  const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  oAuth2Client.setCredentials({ refresh_token: refreshToken });
  return oAuth2Client;
}

async function verifyRefreshToken(refreshToken) {
  try {
    const oAuth2Client = getOAuth2Client(refreshToken);
    const tokenResp = await oAuth2Client.getAccessToken();
    const accessToken = tokenResp?.token || tokenResp;
    if (!accessToken) throw new Error('No access token received');
    return true;
  } catch (e) {
    return false;
  }
}

// Routes
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/login', async (req, res) => {
  try {
    const { refresh_token } = req.body || {};
    if (!refresh_token || typeof refresh_token !== 'string') {
      return res.status(400).json({ success: false, message: 'Missing refresh_token in body' });
    }
    const ok = await verifyRefreshToken(refresh_token);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid or revoked refresh token' });
    }
    REFRESH_TOKEN_MEMORY = refresh_token;
    return res.json({ success: true, message: 'Login successful' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/logout', (_req, res) => {
  REFRESH_TOKEN_MEMORY = "";
  return res.json({ success: true, message: 'Logged out' });
});

app.post('/api/send', async (req, res) => {
  try {
    if (!REFRESH_TOKEN_MEMORY) {
      return res.status(401).json({ success: false, message: 'Not logged in. Set refresh token first.' });
    }
    const { to, subject, text } = req.body || {};
    if (!to || !subject) {
      return res.status(400).json({ success: false, message: 'Missing to or subject' });
    }

    // Get fresh access token
    const oAuth2Client = getOAuth2Client(REFRESH_TOKEN_MEMORY);
    const at = await oAuth2Client.getAccessToken();
    const accessToken = at?.token || at;
    if (!accessToken) {
      return res.status(401).json({ success: false, message: 'Failed to obtain access token. Token may be invalid.' });
    }

    // Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: EMAIL_ADDRESS,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN_MEMORY,
        accessToken
      }
    });

    // Cap 30 recipients
    let recipients = to.split(',').map(s => s.trim()).filter(Boolean);
    if (recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid recipients' });
    }
    if (recipients.length > 30) {
      recipients = recipients.slice(0, 30);
    }

    const info = await transporter.sendMail({
      from: `Bulk OAuth2 Sender <${EMAIL_ADDRESS}>`,
      to: recipients,
      subject,
      text: text || ''
    });

    return res.json({ success: true, accepted: info.accepted || [] });
  } catch (e) {
    // Provide more detailed error messages for OAuth errors
    return res.status(500).json({
      success: false,
      message: e.message || 'Send failed',
      code: e.code || undefined,
      response: e.response || undefined
    });
  }
});

// Healthcheck
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// Start
const port = process.env.PORT || 3000;
app.listen(port, ()
