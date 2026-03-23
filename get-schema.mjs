async function run() {
  const loginRes = await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  const getRes = await fetch("http://127.0.0.1:8090/api/collections/expedientes", { headers });
  const collection = await getRes.json();
  console.log(JSON.stringify(collection.fields, null, 2));
}
run();
