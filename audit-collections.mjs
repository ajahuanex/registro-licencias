// Lists all PocketBase collections and their fields for audit
async function run() {
  const res = await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const { token } = await res.json();
  const headers = { Authorization: "Bearer " + token };

  const colRes = await fetch("http://127.0.0.1:8090/api/collections?perPage=100", { headers });
  const { items } = await colRes.json();

  console.log("\n===== COLECCIONES EN POCKETBASE =====\n");
  for (const col of items) {
    if (col.system) continue;
    console.log(`📦 ${col.name} (${col.type})`);
    const fields = col.fields?.map(f => `  - ${f.name} [${f.type}]${f.required ? ' *' : ''}`).join('\n') || '  (sin campos extra)';
    console.log(fields);
    console.log();
  }
}
run();
