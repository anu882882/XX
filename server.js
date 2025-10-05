const express = require('express');
const path = require('path');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(express.static('public'));
app.use(express.json());

let oauthTokens = {};

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || "https://developers.google.com/oauthplayground";
const EMAIL_ADDRESS = process.env.EMAIL_ADDRESS;

const getOAuth2Client = (refresh_token) => {
  const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID, CLIENT_SECRET, REDIRECT_URI
  );
  oAuth2Client.setCredentials({ refresh_token });
  return oAuth2Client;
};

// Serve login.html as root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Login (OAuth2 setup page forwards code here)
app.post('/api/login', async (req, res) => {
  // To simplify: client sends refresh_token directly
  // (In prod: do proper OAuth2 code exchange flow)
  const { refresh_token } = req.body;
  oauthTokens.refresh_token = refresh_token;
  res.json({ success: true });
});

// Logout/clear tokens
app.post('/api/logout', (req, res) => {
  oauthTokens = {};
  res.json({ success: true });
});

// Bulk email send
app.post('/api/send', async (req, res) => {
  try {
    const { to, subject, text } = req.body;
    if (!oauthTokens.refresh_token) {
      return res.status(401).json({ message: 'Login required (no auth token)' });
    }
    const oAuth2Client = getOAuth2Client(oauthTokens.refresh_token);
    const accessTokenObj = await oAuth2Client.getAccessToken();
    const accessToken = accessTokenObj?.token || accessTokenObj;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: EMAIL_ADDRESS,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: oauthTokens.refresh_token,
        accessToken,
      },
    });

    // batch send (30 max per batch)
    let emails = to.split(',').map(x => x.trim()).filter(x => x);
    if (emails.length > 30) emails = emails.slice(0,30);

    const info = await transporter.sendMail({
      from: `Bulk OAuth2 Sender <${EMAIL_ADDRESS}>`,
      to: emails,
      subject,
      text,
    });

    res.json({ success: true, accepted: info.accepted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(3000, () => console.log('App running: http://localhost:3000'));

app.post('/api/send', async (req, res) => {
  try {
    if (!oauthTokens.refresh_token) return res.status(401).json({ message: 'Login required' });

    // rest of code...

  } catch (err) {
    console.error('Send error:', err);
    res.status(500).json({ message: 'Error sending email', error: err.message });
  }
});

