async function run() {
  const loginRes = await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  // let's fetch one operator's logs
  const logsRes = await fetch("http://127.0.0.1:8090/api/collections/historial_acciones/records?filter=" + encodeURIComponent(`(accion = "MARCADO_RAPIDO_IMPRESO" || accion = "MARCADO_MASIVO_IMPRESO" || accion = "PROCESO_MASIVO_IMPRESOR")`) + "&perPage=500", { headers });
  const logs = await logsRes.json();
  console.log("Found logs:", logs.items?.length);

  if (logs.items?.length > 0) {
    const ids = [...new Set(logs.items.map(l => l.expediente_id))].filter(Boolean);
    console.log("Unique IDs:", ids.length);
    if (ids.length > 0) {
      const filter = ids.map(id => `id = "${id}"`).join(' || ');
      console.log("Filter length:", filter.length);
      const url = `http://127.0.0.1:8090/api/collections/expedientes/records?filter=${encodeURIComponent(filter)}&perPage=500`;
      const expsRes = await fetch(url, { headers });
      console.log("Exps fetch status:", expsRes.status);
      if (!expsRes.ok) {
        console.log("Error:", await expsRes.text());
      } else {
        const exps = await expsRes.json();
        console.log("Exps found:", exps.items?.length);
      }
    }
  }
}
run();
