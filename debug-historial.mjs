// Debug what historial_expedientes looks like and why patch fails
async function run() {
  const res = await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const { token } = await res.json();
  const h = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  // Get historial and related IDs
  const histRes = await fetch("http://127.0.0.1:8090/api/collections/historial_expedientes", { headers: h });
  const hist = await histRes.json();
  console.log("historial fields:", JSON.stringify(hist.fields?.map(f => ({ name: f.name, type: f.type })), null, 2));

  const expRes = await fetch("http://127.0.0.1:8090/api/collections/expedientes", { headers: h });
  const { id: expId } = await expRes.json();

  const opRes = await fetch("http://127.0.0.1:8090/api/collections/operadores", { headers: h });
  const { id: opId } = await opRes.json();

  console.log("expedientes id:", expId);
  console.log("operadores id:", opId);

  // Try minimal patch with just one new field
  const newFields = [
    ...(hist.fields || []).filter(f => !['expediente','modificado_por','accion','estado_anterior','estado_nuevo','detalles'].includes(f.name)),
    { name: 'accion', type: 'text', required: true },
    { name: 'estado_anterior', type: 'text', required: false },
    { name: 'estado_nuevo', type: 'text', required: false },
    { name: 'detalles', type: 'text', required: false },
    { name: 'expediente', type: 'relation', required: false, options: { collectionId: expId, maxSelect: 1 } },
    { name: 'modificado_por', type: 'relation', required: false, options: { collectionId: opId, maxSelect: 1 } },
  ];

  const patchRes = await fetch("http://127.0.0.1:8090/api/collections/historial_expedientes", {
    method: "PATCH", headers: h,
    body: JSON.stringify({
      fields: newFields,
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''"
    })
  });

  if (patchRes.ok) {
    console.log("✔ historial_expedientes patched successfully");
  } else {
    const err = await patchRes.text();
    console.log("✘ Error:", err);
  }
}
run();
