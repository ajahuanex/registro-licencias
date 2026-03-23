async function run() {
  // 1. Login as admin to get a token
  const loginRes = await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  // 2. Check historial_expedientes schema & rules
  const colRes = await fetch("http://127.0.0.1:8090/api/collections/historial_expedientes", { headers });
  const col = await colRes.json();
  console.log("historial_expedientes createRule:", col.createRule);
  console.log("historial_expedientes fields:", col.fields?.map(f => `${f.name}(${f.type})`).join(', '));

  // 3. Try to update a record from 19/3 using admin token (simulates what Angular does)
  // First, get an old record
  const exRes = await fetch("http://127.0.0.1:8090/api/collections/expedientes/records?filter=fecha_registro<'2026-03-22 00:00:00'&perPage=1", { headers });
  const exData = await exRes.json();
  if (exData.items?.length > 0) {
    const record = exData.items[0];
    console.log("\nTrying to update record:", record.id, "estado:", record.estado);
    const patchRes = await fetch(`http://127.0.0.1:8090/api/collections/expedientes/records/${record.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ estado: record.estado }) // Keep same, just test
    });
    console.log("Update status:", patchRes.status);
    if (!patchRes.ok) console.log("Error:", await patchRes.text());
    else console.log("OK updated successfully");
    
    // 4. Now try creating history log entry
    const histRes = await fetch("http://127.0.0.1:8090/api/collections/historial_expedientes/records", {
      method: "POST",
      headers,
      body: JSON.stringify({
        expediente: record.id,
        modificado_por: "testuser",
        accion: "TEST",
        detalles: "Test log",
        fecha: new Date().toISOString()
      })
    });
    console.log("Create history status:", histRes.status);
    if (!histRes.ok) {
      const err = await histRes.json();
      console.log("History Error:", JSON.stringify(err, null, 2));
    } else {
      console.log("History created OK");
    }
  } else {
    console.log("No old records found to test");
  }
}
run();
