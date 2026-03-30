async function run() {
  const loginRes = await fetch("http://127.0.0.1:8095/api/collections/operadores/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "12345678", password: "admin1234" })
  });
  
  console.log("Status:", loginRes.status);
  const data = await loginRes.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

run();
