async function run() {
  const loginRes = await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  const start = new Date(2026, 2, 22, 0, 0, 0, 0); // March 22
  const end = new Date(2026, 2, 22, 23, 59, 59, 999);
  
  const filterStr = `fecha_registro >= "${start.toISOString().replace('T', ' ')}" && fecha_registro <= "${end.toISOString().replace('T', ' ')}"`;
  
  const url = `http://127.0.0.1:8090/api/collections/expedientes/records?filter=${encodeURIComponent(filterStr)}&sort=-fecha_registro`;
  console.log("Fetching URL:", url);
  
  const res = await fetch(url, { headers });
  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Total Items returned:", data.totalItems);
}
run();
