async function run() {
  const res = await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const { token } = await res.json();
  const h = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  console.log("Fetching records...");
  const recordsRes = await fetch("http://127.0.0.1:8090/api/collections/historial_expedientes/records?sort=-created", { headers: h });
  if (!recordsRes.ok) {
     console.log("Error body:", await recordsRes.text());
  } else {
     console.log("OK:", await recordsRes.json());
  }
}
run();
