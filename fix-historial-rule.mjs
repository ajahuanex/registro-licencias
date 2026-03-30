async function run() {
  try {
    const loginUrl = "http://localhost:8088/pb-api/api/collections/_superusers/auth-with-password";
    const loginRes = await fetch(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
    });
    if (!loginRes.ok) {
       console.log("Login fail:", await loginRes.text());
       return;
    }
    const { token } = await loginRes.json();
    const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

    const collUrl = "http://localhost:8088/pb-api/api/collections/historial_acciones";
    // parchear la listRule para permitir lectura a usuarios logueados
    const patchRes = await fetch(collUrl, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ 
         listRule: "@request.auth.id != ''" 
      })
    });
    
    if (patchRes.ok) {
       console.log("✔ listRule de historial_acciones actualizado existosamente.");
    } else {
       console.log("✘ Error parcheando:", await patchRes.text());
    }
  } catch(e) {
    console.error("Fetch error:", e);
  }
}
run();
