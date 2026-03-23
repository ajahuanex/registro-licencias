async function run() {
  const loginRes = await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  const res = await fetch("http://127.0.0.1:8090/api/collections", { headers });
  const data = await res.json();
  console.log("Colecciones existentes:");
  (data.items || []).forEach(c => console.log(` - ${c.name} (${c.type})`));
}
run();
