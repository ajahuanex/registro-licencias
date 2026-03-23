// Adds a `snapshot` JSON field to reportes_generados collection
async function run() {
  const loginRes = await fetch("http://127.0.0.1:8090/pb-api/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const loginData = await loginRes.json();
  // fallback: try direct port if proxy not available in scripts
  const token = loginData.token || await (async () => {
    const r2 = await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
    });
    return (await r2.json()).token;
  })();

  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  const colRes = await fetch("http://127.0.0.1:8090/api/collections/reportes_generados", { headers });
  const col = await colRes.json();

  // Check if snapshot field already exists
  const hasSnapshot = col.fields?.some(f => f.name === 'snapshot');
  if (hasSnapshot) { console.log("✔ snapshot field already exists"); return; }

  const updatedFields = [
    ...(col.fields || []),
    {
      name: 'snapshot',
      type: 'json',
      required: false,
      system: false,
      options: {}
    }
  ];

  const patchRes = await fetch("http://127.0.0.1:8090/api/collections/reportes_generados", {
    method: "PATCH", headers,
    body: JSON.stringify({ fields: updatedFields })
  });

  if (patchRes.ok) {
    console.log("✔ snapshot (json) field added to reportes_generados");
  } else {
    console.log("✘ Error:", await patchRes.text());
  }
}
run();
