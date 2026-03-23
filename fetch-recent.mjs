async function run() {
  const loginRes = await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  const url = `http://127.0.0.1:8090/api/collections/expedientes/records?sort=-fecha_registro&perPage=5`;
  const res = await fetch(url, { headers });
  const data = await res.json();
  console.log("Total Items:", data.totalItems);
  if (data.items.length > 0) {
    data.items.forEach(item => {
      console.log(`ID: ${item.id}, fecha_registro: "${item.fecha_registro}", estado: ${item.estado}`);
    });
  } else {
    console.log("No records found.");
  }
}
run();
