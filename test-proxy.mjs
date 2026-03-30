async function run() {
  const loginRes = await fetch("http://127.0.0.1:4200/pb-api/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  if (!loginRes.ok) {
     console.log("Login fail", await loginRes.text());
     return;
  }
  const { token } = await loginRes.json();
  console.log("Logged in!");
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  const getRes = await fetch("http://127.0.0.1:4200/pb-api/api/collections/historial_acciones", { headers });
  if (getRes.ok) {
     const collection = await getRes.json();
     console.log("historial_acciones listRule:", collection.listRule);
     console.log("fields:", collection.fields?.map(f => f.name).join(', '));
  } else {
     console.log("Error fetching historial_acciones:", await getRes.text());
  }

  const getRes2 = await fetch("http://127.0.0.1:4200/pb-api/api/collections/historial_expedientes", { headers });
  if (getRes2.ok) {
     const collection = await getRes2.json();
     console.log("historial_expedientes listRule:", collection.listRule);
     console.log("fields:", collection.fields?.map(f => f.name).join(', '));
  } else {
     console.log("Error fetching historial_expedientes:", await getRes2.text());
  }
}
run();
