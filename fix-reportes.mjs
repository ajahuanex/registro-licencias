async function run() {
  const loginRes = await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  // Check operadores collection rules
  const opRes = await fetch("http://127.0.0.1:8090/api/collections/operadores", { headers });
  const op = await opRes.json();
  console.log("operadores rules:");
  console.log("  listRule:", JSON.stringify(op.listRule));
  console.log("  viewRule:", JSON.stringify(op.viewRule));
  console.log("  createRule:", JSON.stringify(op.createRule));
  console.log("  updateRule:", JSON.stringify(op.updateRule));

  // Get first operador to use real credentials
  const opListRes = await fetch("http://127.0.0.1:8090/api/collections/operadores/records?perPage=5", { headers });
  const opList = await opListRes.json();
  console.log("\nOperadores found:", opList.items?.length);
  opList.items?.forEach(o => console.log(`  - ${o.username} (${o.nombre}) id: ${o.id}`));

  // Fix: Update operadores viewRule to allow authenticated users to view others (for expand)
  // AND add generado_por_nombre text field to reportes_generados to avoid needing expand
  
  // Option A: Add text field to store operator name directly (simpler, no expand needed)
  const repRes = await fetch("http://127.0.0.1:8090/api/collections/reportes_generados", { headers });
  const rep = await repRes.json();
  
  // Add generado_por_nombre field
  const updatedFields = [
    ...rep.fields.filter(f => f.name !== 'id'),
    { name: "generado_por_nombre", type: "text", required: false }
  ];
  
  const patchRes = await fetch("http://127.0.0.1:8090/api/collections/reportes_generados", {
    method: "PATCH",
    headers,
    body: JSON.stringify({ fields: updatedFields })
  });
  console.log("\nPatch reportes_generados to add generado_por_nombre:", patchRes.status);
  if (!patchRes.ok) console.log(await patchRes.text());
  else console.log("✔ field added successfully");
}
run();
