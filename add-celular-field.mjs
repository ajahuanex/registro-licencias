// Adds celular (text, optional) field to expedientes collection
async function run() {
  const loginRes = await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  const colRes = await fetch("http://127.0.0.1:8090/api/collections/expedientes", { headers });
  const col = await colRes.json();

  if (col.fields?.some(f => f.name === 'celular')) {
    console.log("✔ celular field already exists"); return;
  }

  const patchRes = await fetch("http://127.0.0.1:8090/api/collections/expedientes", {
    method: "PATCH", headers,
    body: JSON.stringify({
      fields: [...(col.fields || []), { name: 'celular', type: 'text', required: false }]
    })
  });
  console.log(patchRes.ok ? "✔ celular field added to expedientes" : "✘ " + await patchRes.text());
}
run();
