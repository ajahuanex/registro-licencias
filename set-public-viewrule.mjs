// Updates reportes_generados viewRule to allow public (unauthenticated) reads
// so the QR verification page works without login.
async function run() {
  const loginRes = await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  const patchRes = await fetch("http://127.0.0.1:8090/api/collections/reportes_generados", {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      viewRule: "",      // empty = public, no auth needed
      listRule: "@request.auth.id != ''"  // listing still requires auth
    })
  });

  if (patchRes.ok) {
    console.log("✔ viewRule actualizado: lectura individual ahora es pública (para QR verification)");
  } else {
    console.log("✘ Error:", await patchRes.text());
  }
}
run();
