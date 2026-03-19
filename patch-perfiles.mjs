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

  // Check if perfil already exists to avoid duplication errors
  const hasPerfil = collection.fields.some(f => f.name === 'perfil');

  if (!hasPerfil) {
    const newFields = [
      { name: "perfil", type: "select", required: true, maxSelect: 1, values: ["OTI", "ADMINISTRADOR", "SUPERVISOR", "REGISTRADOR"] }
    ];

    collection.fields = [...collection.fields, ...newFields];

    const patchRes = await fetch("http://127.0.0.1:8090/api/collections/operadores", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ fields: collection.fields })
    });

    if (!patchRes.ok) {
        console.log("Error:", await patchRes.text());
    } else {
        console.log("Campo perfil agregado exitosamente a operadores.");
        
        // Let's set the first operator (admin) to OTI
        const opRes = await fetch("http://127.0.0.1:8090/api/collections/operadores/records?filter=(dni='12345678')", { headers });
        const ops = await opRes.json();
        if (ops.items && ops.items.length > 0) {
            const adminId = ops.items[0].id;
            await fetch("http://127.0.0.1:8090/api/collections/operadores/records/" + adminId, {
                method: "PATCH",
                headers,
                body: JSON.stringify({ perfil: "OTI" })
            });
            console.log("Administrador inicial actualizado a perfil OTI.");
        }
    }
  } else {
    console.log("El campo perfil ya existe.");
  }
}
run();
