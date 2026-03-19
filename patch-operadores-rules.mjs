async function run() {
  const loginRes = await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  // Get current operadores collection
  const getRes = await fetch("http://127.0.0.1:8090/api/collections/operadores", { headers });
  const collection = await getRes.json();

  // Change API rules to allow any authenticated user to manage operators
  const newRules = "@request.auth.id != ''";
  collection.listRule = newRules;
  collection.viewRule = newRules;
  collection.createRule = newRules;
  collection.updateRule = newRules;
  // Let's also allow delete if an operator leaves
  collection.deleteRule = newRules;

  const patchRes = await fetch("http://127.0.0.1:8090/api/collections/operadores", {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      listRule: collection.listRule,
      viewRule: collection.viewRule,
      createRule: collection.createRule,
      updateRule: collection.updateRule,
      deleteRule: collection.deleteRule
    })
  });

  if (!patchRes.ok) {
    console.log("Error:", await patchRes.text());
  } else {
    console.log("Reglas de API de la colección operadores actualizadas exitosamente.");
  }
}
run();
