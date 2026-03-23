// Using real credentials from the browser debug log
async function run() {
  // Auth as operador with real credentials visible in debug log
  const loginRes = await fetch("http://127.0.0.1:8090/api/collections/operadores/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "12345678", password: "admin1234" })
  });
  const loginData = await loginRes.json();
  console.log("Login status:", loginRes.status, loginData.record?.nombre || loginData.message);
  if (!loginRes.ok) return;

  const token = loginData.token;
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  // Test 1: simple list no extras
  const t1 = await fetch("http://127.0.0.1:8090/api/collections/reportes_generados/records?page=1&perPage=200", { headers });
  console.log("T1 simple list:", t1.status);
  if (!t1.ok) { console.log(await t1.text()); return; }
  const d1 = await t1.json();
  console.log("  Records:", d1.totalItems, d1.items?.map(r => r.id));

  // Test 2: with sort=-created
  const t2 = await fetch("http://127.0.0.1:8090/api/collections/reportes_generados/records?page=1&perPage=200&sort=-created", { headers });
  console.log("T2 with sort=-created:", t2.status);
  if (!t2.ok) console.log(await t2.text());

  // Test 3: with sort=-fecha_generacion (our autodate field)
  const t3 = await fetch("http://127.0.0.1:8090/api/collections/reportes_generados/records?page=1&perPage=200&sort=-fecha_generacion", { headers });
  console.log("T3 with sort=-fecha_generacion:", t3.status);
  if (!t3.ok) console.log(await t3.text());
}
run();
