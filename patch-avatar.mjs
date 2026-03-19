async function run() {
  const loginRes = await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  const getRes = await fetch("http://127.0.0.1:8090/api/collections/operadores", { headers });
  const collection = await getRes.json();

  const hasAvatar = collection.fields.some(f => f.name === 'avatar');

  if (!hasAvatar) {
    const newFields = [
      { name: "avatar", type: "file", required: false, maxSelect: 1, maxSize: 5242880, mimeTypes: ["image/jpeg", "image/png", "image/webp"] }
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
        console.log("Campo avatar (file) agregado exitosamente a operadores.");
    }
  } else {
    console.log("El campo avatar ya existe.");
  }
}
run();
