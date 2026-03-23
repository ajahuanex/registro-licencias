/**
 * Creates the `reportes_generados` collection in PocketBase.
 * Run once: node create-reportes-collection.mjs
 */
async function run() {
  const loginRes = await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  // Check if collection already exists
  const checkRes = await fetch("http://127.0.0.1:8090/api/collections/reportes_generados", { headers });
  if (checkRes.ok) {
    console.log("Colección reportes_generados ya existe.");
    return;
  }

  const payload = {
    name: "reportes_generados",
    type: "base",
    fields: [
      { name: "generado_por",   type: "relation", required: true, collectionId: "pbc_3556118385", maxSelect: 1 },
      { name: "tipo_reporte",   type: "select",   required: true, values: ["REPORTE_DIARIO", "ENTREGA_DIARIA"], maxSelect: 1 },
      { name: "fecha_reporte",  type: "date",     required: true },
      { name: "fecha_generacion", type: "autodate", onCreate: true, onUpdate: false },
      { name: "total_registros", type: "number",  required: true },
      { name: "sede",           type: "select",   required: false, values: ["Puno", "Juliaca", "Ambas"], maxSelect: 1 },
      { name: "hash_verificacion", type: "text",  required: true }
    ],
    listRule: "@request.auth.id != ''",
    viewRule:  "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: null,
    deleteRule: null
  };

  const createRes = await fetch("http://127.0.0.1:8090/api/collections", {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  if (createRes.ok) {
    const col = await createRes.json();
    console.log("✔ Colección reportes_generados creada! ID:", col.id);
  } else {
    const err = await createRes.json();
    console.log("✘ Error:", JSON.stringify(err, null, 2));
  }
}
run();
