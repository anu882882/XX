import React, { useState } from "react";

export default function App() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    pass: "",
    subject: "",
    clients: "",
    text: "",
    host: "smtp.gmail.com",
    port: 465,
    useProxy: false,
    proxyUrl: "",
  });
  const [popup, setPopup] = useState("");

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleLogin = async () => {
    await fetch("http://localhost:5000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email,
        password: form.pass,
        host: form.host,
        port: form.port,
        useProxy: form.useProxy,
        proxyUrl: form.proxyUrl,
      }),
    });
    setPopup("Login success!");
  };

  const handleLogout = async () => {
    await fetch("http://localhost:5000/logout", { method: "POST" });
    setPopup("Logged out, IP/session cleared.");
  };

  const handleSend = async e => {
    e.preventDefault();
    const resp = await fetch("http://localhost:5000/send-bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        subject: form.subject,
        clients: form.clients.split(',').map(x => x.trim()),
        text: form.text
      }),
    });
    if (resp.ok) setPopup("All mails sent!");
    else setPopup("Error sending mail!");
  };

  return (
    <div style={{ maxWidth: 500, margin: "auto" }}>
      <h2>Bulk Email Sender</h2>
      <input name="name" placeholder="Name" onChange={handleChange} value={form.name} /><br/>
      <input name="email" placeholder="Sender Email" onChange={handleChange} value={form.email} /><br/>
      <input name="pass" placeholder="Email Password" type="password" onChange={handleChange} value={form.pass} /><br/>
      <input name="subject" placeholder="Subject" onChange={handleChange} value={form.subject} /><br/>
      <textarea name="clients" placeholder="Recipient Emails, comma separated (min 30)" onChange={handleChange} value={form.clients} /><br/>
      <textarea name="text" placeholder="Message Body" onChange={handleChange} value={form.text} /><br/>
      {/* Optional: host/port/proxy fields */}
      <button onClick={handleLogin}>Login</button>
      <button onClick={handleLogout}>Logout (Change IP)</button>
      <button onClick={handleSend}>Send Bulk Emails</button>
      {popup && <div style={{
        backgroundColor: "#91ffa8", padding: 20, margin: 10, border: "1px solid #999"
      }}>{popup}</div>}
    </div>
  );
}
