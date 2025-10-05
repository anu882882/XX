const express = require('express');
const path = require('path');
const cors = require('cors');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Simple in-memory token store for demo
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
    return !!accessToken;
  } catch {
    return false;
  }
}

// Routes
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/login', async (req, res) => {
  const { refresh_token } = req.body || {};
  if (!refresh_token) return res.status(400).json({ success: false, message: 'Missing refresh_token' });
  const ok = await verifyRefreshToken(refresh_token);
  if (!ok) return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  REFRESH_TOKEN_MEMORY = refresh_token;
  res.json({ success: true, message: 'Login successful' });
});

app.post('/api/logout', (_req, res) => {
  REFRESH_TOKEN_MEMORY = "";
  res.json({ success: true, message: 'Logged out' });
});

app.post('/api/send', async (req, res) => {
  try {
    if (!REFRESH_TOKEN_MEMORY) return res.status(401).json({ success: false, message: 'Not logged in' });

    const { to, subject, text } = req.body || {};
    if (!to || !subject) return res.status(400).json({ success: false, message: 'Missing to or subject' });

    const oAuth2Client = getOAuth2Client(REFRESH_TOKEN_MEMORY);
    const at = await oAuth2Client.getAccessToken();
    const accessToken = at?.token || at;
    if (!accessToken) return res.status(401).json({ success: false, message: 'Access token fetch failed' });

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

    let recipients = to.split(',').map(s => s
