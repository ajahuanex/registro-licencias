// Tests the reportes_generados collection using an OPERADORES auth token
// which is exactly what the Angular frontend uses.
async function run() {
  // 1. Authenticate as an operador
  const loginRes = await fetch("http://127.0.0.1:8090/api/collections/operadores/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin", password: "admin123" })
  });
  const loginData = await loginRes.json();
  console.log("Operador login status:", loginRes.status);
  if (!loginRes.ok) {
    // Try with another account
    console.log("Login error:", JSON.stringify(loginData));
    return;
  }

  const token = loginData.token;
  const userId = loginData.record?.id;
  console.log("Logged in as:", loginData.record?.nombre, "| ID:", userId);
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  // 2. Try listing from reportes_generados
  const listRes = await fetch("http://127.0.0.1:8090/api/collections/reportes_generados/records?perPage=5", { headers });
  console.log("GET reportes_generados (no expand):", listRes.status);
  if (!listRes.ok) console.log("Error:", await listRes.text());

  const listExpandRes = await fetch("http://127.0.0.1:8090/api/collections/reportes_generados/records?perPage=5&expand=generado_por", { headers });
  console.log("GET reportes_generados (with expand):", listExpandRes.status);
  if (!listExpandRes.ok) console.log("Error:", await listExpandRes.text());

  // 3. Try creating a record
  const createRes = await fetch("http://127.0.0.1:8090/api/collections/reportes_generados/records", {
    method: "POST",
    headers,
    body: JSON.stringify({
      generado_por: userId,
      tipo_reporte: "REPORTE_DIARIO",
      fecha_reporte: "2026-03-22",
      total_registros: 5,
      sede: "Puno",
      hash_verificacion: "TEST123"
    })
  });
  console.log("POST reportes_generados:", createRes.status);
  if (!createRes.ok) console.log("Error:", await createRes.text());
  else {
    const rec = await createRes.json();
    console.log("Created record ID:", rec.id);
    // clean up
    const adminLogin = await (await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
    })).json();
    await fetch(`http://127.0.0.1:8090/api/collections/reportes_generados/records/${rec.id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + adminLogin.token }
    });
    console.log("Test record deleted.");
  }
}
run();
