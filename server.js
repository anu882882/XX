const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

let transporter;

function createTransporter(user, pass, host = 'smtp.gmail.com', port = 465, useProxy = false, proxyUrl = '') {
  let options = {
    host: host,
    port: port,
    secure: true,
    auth: { user, pass },
  };
  // Optional proxy setup (use 'socks-proxy-agent' for proxying if needed)
  if (useProxy && proxyUrl) {
    const SocksProxyAgent = require('socks-proxy-agent');
    options.agent = new SocksProxyAgent(proxyUrl);
  }
  return nodemailer.createTransport(options);
}

app.post('/login', (req, res) => {
  const { email, password, host, port, useProxy, proxyUrl } = req.body;
  transporter = createTransporter(email, password, host, port, useProxy, proxyUrl);
  res.send({ message: 'Logged in with provided credentials' });
});

app.post('/logout', (req, res) => {
  transporter = null;
  res.send({ message: 'Logged out' });
});

app.post('/send-bulk', async (req, res) => {
  if (!transporter) return res.status(401).send({ message: 'Not logged in' });
  const { subject, clients, name, text } = req.body; // clients: array
  let results = [];
  for (let i = 0; i < clients.length; i += 30) {
    let batch = clients.slice(i, i + 30);
    const mailOptions = {
      from: `"${name}" <${transporter.options.auth.user}>`,
      to: batch.join(','),
      subject,
      text,
    };
    try {
      let info = await transporter.sendMail(mailOptions);
      results.push(info.accepted);
    } catch (err) {
      return res.status(500).send({ message: 'Sending error', err });
    }
  }
  res.send({ message: 'Emails sent', results });
});

app.listen(5000, () => console.log('Server running on port 5000'));
