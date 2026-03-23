async function run() {
  const loginRes = await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  if (!loginRes.ok) {
    console.log("Login failed", await loginRes.text());
    return;
  }
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  const getRes = await fetch("http://127.0.0.1:8090/api/collections/expedientes", { headers });
  const collection = await getRes.json();
  
  const hasUpdated = collection.fields.some(f => f.name === 'updated');
  if (!hasUpdated) {
    collection.fields.push({
      name: "updated",
      type: "autodate",
      onCreate: true,
      onUpdate: true,
      required: false,
      system: false
    });
    
    collection.fields.push({
      name: "created",
      type: "autodate",
      onCreate: true,
      onUpdate: false,
      required: false,
      system: false
    });

    const patchRes = await fetch("http://127.0.0.1:8090/api/collections/expedientes", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ fields: collection.fields })
    });

    if (!patchRes.ok) {
      console.log("Error patch:", await patchRes.text());
    } else {
      console.log("Campos updated y created agregados exitosamente!");
    }
  } else {
    console.log("El campo updated ya existe.");
  }
}
run();
