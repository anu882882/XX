const express = require('express');
const path = require('path');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(express.static('public'));
app.use(express.json());

let refresh_token = "";

const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, EMAIL_ADDRESS } = process.env;

function getOAuth2Client(token) {
  const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  oAuth2Client.setCredentials({ refresh_token: token });
  return oAuth2Client;
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/login', (req, res) => {
  refresh_token = req.body.refresh_token;
  res.json({ success: true });
});

app.post('/api/logout', (req, res) => {
  refresh_token = "";
  res.json({ success: true });
});

app.post('/api/send', async (req, res) => {
  try {
    if (!refresh_token) return res.status(401).json({ success: false, message: "Login first" });
    const { to, subject, text } = req.body;
    const oAuth2Client = getOAuth2Client(refresh_token);
    const accessTokenObj = await oAuth2Client.getAccessToken();
    const accessToken = accessTokenObj?.token || accessTokenObj;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: EMAIL_ADDRESS,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: refresh_token,
        accessToken,
      },
    });

    let recipients = to.split(',').map(t => t.trim()).slice(0, 30);
    let info = await transporter.sendMail({ from: EMAIL_ADDRESS, to: recipients, subject, text });
    res.json({ success: true, accepted: info.accepted });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('App running on port', process.env.PORT || 3000));
