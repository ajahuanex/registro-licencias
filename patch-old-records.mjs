/**
 * Patches old expediente records that are missing required fields:
 * - estado (default: "EN PROCESO")
 * - dni_solicitante (default: "00000000")
 */
async function run() {
  const loginRes = await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  // Get all records missing estado or dni_solicitante
  const res = await fetch("http://127.0.0.1:8090/api/collections/expedientes/records?perPage=200&sort=fecha_registro", { headers });
  const data = await res.json();
  console.log(`Total records: ${data.totalItems}`);

  let fixed = 0;
  for (const record of data.items) {
    const needsFix = !record.estado || !record.dni_solicitante;
    if (needsFix) {
      const payload = {};
      if (!record.estado) payload.estado = "EN PROCESO";
      if (!record.dni_solicitante) payload.dni_solicitante = "00000000";

      const patchRes = await fetch(`http://127.0.0.1:8090/api/collections/expedientes/records/${record.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload)
      });
      if (patchRes.ok) {
        console.log(`  ✔ Patched ${record.id} (${record.apellidos_nombres}) -> ${JSON.stringify(payload)}`);
        fixed++;
      } else {
        console.log(`  ✘ Error patching ${record.id}: ${await patchRes.text()}`);
      }
    }
  }
  console.log(`\nDone. Patched ${fixed} records.`);
}
run();
