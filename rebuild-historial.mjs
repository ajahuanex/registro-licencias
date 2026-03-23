// Delete and recreate historial_expedientes with explicit `created` and `updated` fields
async function run() {
  const res = await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const { token } = await res.json();
  const h = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  console.log("Deleting broken historial_expedientes...");
  await fetch("http://127.0.0.1:8090/api/collections/historial_expedientes", { method: "DELETE", headers: h });

  console.log("Creating clean historial_expedientes...");
  const createRes = await fetch("http://127.0.0.1:8090/api/collections", {
    method: "POST", headers: h,
    body: JSON.stringify({
      name: "historial_expedientes",
      type: "base",
      fields: [
        { name: "id",               type: "text",     hidden: false, required: false, id: "textidid", system: true },
        { name: "created",          type: "autodate", hidden: false, required: false, id: "datecreated", system: true, onCreate: true, onUpdate: false },
        { name: "updated",          type: "autodate", hidden: false, required: false, id: "dateupdated", system: true, onCreate: true, onUpdate: true },
        { name: "expediente_id",    type: "text",     required: true  },
        { name: "expediente_dni",   type: "text",     required: false },
        { name: "operador_id",      type: "text",     required: true  },
        { name: "operador_nombre",  type: "text",     required: false },
        { name: "operador_perfil",  type: "text",     required: false },
        { name: "accion",           type: "text",     required: true  },
        { name: "estado_anterior",  type: "text",     required: false },
        { name: "estado_nuevo",     type: "text",     required: false },
        { name: "detalles",         type: "text",     required: false }
      ],
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''"
    })
  });
  if (createRes.ok) {
    console.log("✔ historial_expedientes recreated with autodate fields!");
  } else {
    console.log("✘ Error:", await createRes.text());
  }
}
run();
