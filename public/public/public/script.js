document.getElementById("mailForm").onsubmit = async function(e) {
  e.preventDefault();
  const subject = document.getElementById("subject").value;
  const emails = document.getElementById("emails").value;
  const text = document.getElementById("text").value;
  let r = await fetch('/api/send', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject, to: emails, text })
  });
  let res = await r.json();
  document.getElementById("output").innerText = res.success ? "Mail sent to: " + res.accepted.join(", ") : "Failed: " + (res.message || "Unknown error");
};

function logout() {
  fetch('/api/logout', { method: "POST" })
    .then(() => {
      document.getElementById("output").innerText = "Logged out! Please login again.";
    })
}
