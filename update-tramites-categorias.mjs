/**
 * Updates the `expedientes` collection fields:
 * - tramite: OBTENCIÓN, REVALIDACIÓN, DUPLICADO, RECATEGORIZACIÓN
 * - categoria: Full MTC classification A-I through B-IIc including A-IV
 */
async function run() {
  const loginRes = await fetch("http://127.0.0.1:8090/api/collections/_superusers/auth-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: "admin@transportespuno.com", password: "Unodostres123" })
  });
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  const colRes = await fetch("http://127.0.0.1:8090/api/collections/expedientes", { headers });
  const col = await colRes.json();

  // Update tramite and categoria field values
  const updatedFields = col.fields.map(f => {
    if (f.name === 'tramite') {
      return {
        ...f,
        values: ['Obtención', 'Revalidación', 'Duplicado', 'Recategorización']
      };
    }
    if (f.name === 'categoria') {
      return {
        ...f,
        values: [
          // Clase A — Ordinarias
          'A-I', 'A-IIa', 'A-IIb', 'A-IIIa', 'A-IIIb', 'A-IIIc',
          // Clase A — Especial
          'A-IV',
          // Clase B — Menores
          'B-IIa', 'B-IIb', 'B-IIc'
        ]
      };
    }
    return f;
  });

  const patchRes = await fetch("http://127.0.0.1:8090/api/collections/expedientes", {
    method: "PATCH",
    headers,
    body: JSON.stringify({ fields: updatedFields })
  });

  if (patchRes.ok) {
    console.log("✔ Campos actualizados correctamente");
    const updated = await patchRes.json();
    updated.fields.forEach(f => {
      if (['tramite', 'categoria'].includes(f.name)) {
        console.log(`  ${f.name}: ${f.values?.join(', ')}`);
      }
    });
  } else {
    console.log("✘ Error:", await patchRes.text());
  }
}
run();
