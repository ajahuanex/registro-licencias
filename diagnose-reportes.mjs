async function run() {
  const loginRes = await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  // Get all collection IDs to find operadores
  const colsRes = await fetch("http://127.0.0.1:8090/api/collections?perPage=50", { headers });
  const cols = await colsRes.json();
  cols.items.forEach(c => console.log(`${c.name} => ${c.id}`));

  // Check reportes_generados fields
  const repRes = await fetch("http://127.0.0.1:8090/api/collections/reportes_generados", { headers });
  const rep = await repRes.json();
  console.log("\nreportes_generados fields:");
  rep.fields?.forEach(f => console.log(` - ${f.name} (${f.type})${f.collectionId ? ' -> ' + f.collectionId : ''}`));

  // Try simple list without expand to see if the issue is the expand
  const listRes = await fetch("http://127.0.0.1:8090/api/collections/reportes_generados/records?perPage=5", { headers });
  console.log("\nList without expand status:", listRes.status);
  if (!listRes.ok) console.log(await listRes.text());

  // Try with expand
  const listExpandRes = await fetch("http://127.0.0.1:8090/api/collections/reportes_generados/records?perPage=5&expand=generado_por", { headers });
  console.log("List WITH expand status:", listExpandRes.status);
  if (!listExpandRes.ok) console.log(await listExpandRes.text());
}
run();
