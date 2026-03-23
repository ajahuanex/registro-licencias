// Tests reading a reportes_generados record WITHOUT auth token (simulates QR scan)
async function run() {
  const adminLogin = await (await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  })).json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + adminLogin.token };

  // Get the first record ID
  const listRes = await fetch("http://127.0.0.1:8090/api/collections/reportes_generados/records?perPage=1", { headers });
  const listData = await listRes.json();
  const firstId = listData.items?.[0]?.id;
  console.log("First record ID:", firstId);
  
  if (!firstId) { console.log("No records found!"); return; }

  // Check current viewRule
  const colRes = await fetch("http://127.0.0.1:8090/api/collections/reportes_generados", { headers });
  const col = await colRes.json();
  console.log("viewRule:", JSON.stringify(col.viewRule));

  // Test WITHOUT auth (simulating QR scan from browser)
  const publicRes = await fetch(`http://127.0.0.1:8090/api/collections/reportes_generados/records/${firstId}`);
  console.log("Public read status:", publicRes.status);
  if (!publicRes.ok) console.log("Error:", await publicRes.text());
  else {
    const rec = await publicRes.json();
    console.log("✔ Public read works! Record:", rec.id, "|", rec.tipo_reporte);
  }
}
run();
