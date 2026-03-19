async function run() {
  const loginRes = await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  // Get current expedientes collection
  const getRes = await fetch("http://127.0.0.1:8090/api/collections/expedientes", { headers });
  const collection = await getRes.json();

  // Add new fields
  const newFields = [
    { name: "dni_solicitante", type: "text", required: true, max: 8 },
    { name: "estado", type: "select", required: true, maxSelect: 1, values: ["EN PROCESO", "ATENDIDO", "OBSERVADO", "RECHAZADO"] }
  ];

  collection.fields = [...collection.fields, ...newFields];

  const patchRes = await fetch("http://127.0.0.1:8090/api/collections/expedientes", {
    method: "PATCH",
    headers,
    body: JSON.stringify({ fields: collection.fields })
  });

  if (!patchRes.ok) {
    console.log("Error:", await patchRes.text());
  } else {
    console.log("Colección expedientes actualizada satisfactoriamente con dni_solicitante y estado.");
  }
}
run();
