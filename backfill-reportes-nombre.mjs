// Backfill generado_por_nombre for existing reportes_generados records
async function run() {
  const loginRes = await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  // Get all reportes missing the name
  const rRes = await fetch("http://127.0.0.1:8090/api/collections/reportes_generados/records?perPage=200", { headers });
  const rData = await rRes.json();
  console.log(`Total reportes: ${rData.totalItems}`);

  let fixed = 0;
  for (const r of rData.items) {
    if (!r.generado_por_nombre && r.generado_por) {
      // Fetch the operador record
      const opRes = await fetch(`http://127.0.0.1:8090/api/collections/operadores/records/${r.generado_por}`, { headers });
      if (!opRes.ok) { console.log(`  ✘ No pudo obtener operador ${r.generado_por}`); continue; }
      const op = await opRes.json();
      const nombre = op.nombre || op.username || 'Desconocido';

      const patchRes = await fetch(`http://127.0.0.1:8090/api/collections/reportes_generados/records/${r.id}`, {
        method: "PATCH", headers,
        body: JSON.stringify({ generado_por_nombre: nombre })
      });
      if (patchRes.ok) { console.log(`  ✔ ${r.id} → ${nombre}`); fixed++; }
      else console.log(`  ✘ Error:`, await patchRes.text());
    }
  }
  console.log(`\nDone. Patched ${fixed} records.`);
}
run();
