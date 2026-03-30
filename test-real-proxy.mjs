async function run() {
  const loginRes = await fetch("http://localhost:8088/pb-api/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  if (!loginRes.ok) return console.log("Login fail", await loginRes.text());
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  const getRes = await fetch("http://localhost:8088/pb-api/api/collections/historial_acciones", { headers });
  if (getRes.ok) {
     const collection = await getRes.json();
     console.log("historial_acciones listRule:", collection.listRule);
     console.log("fields:", collection.fields?.map(f => `${f.name} (${f.type})`).join(', '));
  } else {
     console.log("Error fetching historial_acciones:", await getRes.text());
  }
}
run();
