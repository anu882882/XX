document.getElementById("mailForm").onsubmit = async function(e) {
  e.preventDefault();
  const subject = document.getElementById("subject").value.trim();
  const emails = document.getElementById("emails").value.trim();
  const text = document.getElementById("text").value;
  const r = await fetch('/api/send', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject, to: emails, text })
  });
  const res = await r.json();
  document.getElementById("output").innerText = res.success
    ? ("Mail sent to: " + (res.accepted || []).join(", "))
    : ("Failed: " + (res.message || "Unknown error"));
};

document.getElementById('btnLogout').onclick = async function() {
  await fetch('/api/logout', { method: "POST" });
  document.getElementById("output").innerText = "Logged out! Please login again.";
};
