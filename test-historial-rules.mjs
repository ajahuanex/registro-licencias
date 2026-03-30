async function run() {
  const loginRes = await fetch("http://localhost:8090/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  if (!loginRes.ok) {
     console.log("Login fail", await loginRes.text());
     return;
  }
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  const getRes = await fetch("http://localhost:8090/api/collections/historial_acciones", { headers });
  if (getRes.ok) {
     const collection = await getRes.json();
     console.log("listRule:", collection.listRule);
     console.log("viewRule:", collection.viewRule);
     console.log("createRule:", collection.createRule);
     console.log("schema:", collection.fields?.map(f => f.name).join(', '));
  } else {
     console.log("Error fetching collection:", await getRes.text());
  }
}
run();
