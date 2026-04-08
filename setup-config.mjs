const pbUrl = 'https://lic.transportespuno.gob.pe/pb-api';
const email = 'admin@transportespuno.com';
const password = 'Unodostres123';

async function main() {
  const authRes = await fetch(`${pbUrl}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password })
  });
  const { token } = await authRes.json();
  const H = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 1. Check if configuracion_sistema exists
  const checkRes = await fetch(`${pbUrl}/api/collections/configuracion_sistema`, { headers: H });
  
  if (checkRes.ok) {
    console.log("configuracion_sistema already exists. Checking records...");
  } else {
    // Create it
    console.log("Creating configuracion_sistema collection...");
    const createRes = await fetch(`${pbUrl}/api/collections`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({
        name: 'configuracion_sistema',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: null,
        fields: [
          { name: 'clave', type: 'text', required: true },
          { name: 'valores', type: 'text', required: true }
        ]
      })
    });
    console.log("Created:", createRes.status);
  }

  // 2. Seed default values
  const tramites = ['OBTENCIÓN', 'REVALIDACIÓN', 'DUPLICADO', 'RECATEGORIZACIÓN'];
  const categorias = ['A-I', 'A-IIa', 'A-IIb', 'A-IIIa', 'A-IIIb', 'A-IIIc', 'B-I', 'B-IIa', 'B-IIb', 'B-IIc'];

  for (const [clave, valores] of [['tramites', tramites], ['categorias', categorias]]) {
    const listRes = await fetch(`${pbUrl}/api/collections/configuracion_sistema/records?filter=clave='${clave}'`, { headers: H });
    const list = await listRes.json();
    if (list.totalItems === 0) {
      console.log(`Seeding ${clave}...`);
      await fetch(`${pbUrl}/api/collections/configuracion_sistema/records`, {
        method: 'POST',
        headers: H,
        body: JSON.stringify({ clave, valores: JSON.stringify(valores) })
      });
    } else {
      console.log(`${clave} already seeded.`);
    }
  }
  console.log("Done.");
}
main();
