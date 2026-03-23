async function run() {
  const loginRes = await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  const url = `http://127.0.0.1:8090/api/collections/expedientes/records?sort=-updated`;
  const res = await fetch(url, { headers });
  console.log(`sort=-updated -> Status: ${res.status}`);
  if(res.status !== 200) console.log(await res.json());

  const url2 = `http://127.0.0.1:8090/api/collections/expedientes/records?sort=-fecha_registro`;
  const res2 = await fetch(url2, { headers });
  console.log(`sort=-fecha_registro -> Status: ${res2.status}`);
}
run();
