async function run() {
  const loginRes = await fetch("http://localhost:8088/pb-api/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  try {
    const getRes = await fetch("http://localhost:8088/pb-api/api/collections/historial_acciones", { headers });
    const col = await getRes.json();
    
    // Check if created already exists
    if (col.fields?.find(f => f.name === 'created')) {
       console.log("Ya existe el campo created.");
       return;
    }

    // Append created and updated (autodate type for >= 0.23)
    col.fields.push({
      name: "created",
      type: "autodate",
      onCreate: true,
      onUpdate: false,
      hidden: false
    });
    col.fields.push({
      name: "updated",
      type: "autodate",
      onCreate: true,
      onUpdate: true,
      hidden: false
    });

    const patchRes = await fetch("http://localhost:8088/pb-api/api/collections/historial_acciones", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ fields: col.fields })
    });

    if (patchRes.ok) {
       console.log("✔ Schema parcheado exitosamente con created y updated.");
    } else {
       console.log("Error:", await patchRes.text());
    }
  } catch(e) {
    console.error(e);
  }
}
run();
