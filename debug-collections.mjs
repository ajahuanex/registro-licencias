async function run() {
  const loginRes = await fetch("http://127.0.0.1:8095/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  
  if (!loginRes.ok) {
    console.error("Error de login:", await loginRes.text());
    // Try standard admins auth if _superusers fails
    const loginRes2 = await fetch("http://127.0.0.1:8095/api/admins/auth-with-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
    });
    if (!loginRes2.ok) {
        console.error("Error de login (admins):", await loginRes2.text());
        return;
    }
    const { token } = await loginRes2.json();
    processCollections(token);
  } else {
    const { token } = await loginRes.json();
    processCollections(token);
  }
}

async function processCollections(token) {
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };
  const res = await fetch("http://127.0.0.1:8095/api/collections", { headers });
  const data = await res.json();
  console.log("Colecciones existentes:");
  (data.items || []).forEach(c => console.log(` - ${c.name} (${c.type})`));
}

run();
