async function run() {
  const loginRes = await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  const tests = [
    `estado = "ENTREGADO"`,
    `lugar_entrega = "Puno"`,
    `updated >= "2026-03-22 05:00:00.000Z"`,
    `fecha_registro >= "2026-03-22 05:00:00.000Z"`,
    `estado = 'ENTREGADO'`
  ];
  
  for (const filterStr of tests) {
    const url = `http://127.0.0.1:8090/api/collections/expedientes/records?filter=${encodeURIComponent(filterStr)}&perPage=1`;
    const res = await fetch(url, { headers });
    const data = await res.json();
    console.log(`Test [${filterStr}] -> Status: ${res.status}`);
    if(res.status !== 200) console.log(data);
  }
}
run();
