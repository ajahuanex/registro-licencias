async function run() {
  const loginRes = await fetch("http://localhost:8088/pb-api/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  try {
    const getRes = await fetch("http://localhost:8088/pb-api/api/collections/expedientes", { headers });
    const c = await getRes.json();
    console.log("Expedientes Fields:");
    c.fields?.forEach(f => console.log(`  - ${f.name} (${f.type})`));
  } catch(e) {
    console.error(e);
  }
}
run();
