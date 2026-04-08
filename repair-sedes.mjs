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
  const reqOpts = { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } };

  // 1. Update Schema
  const getCol = await fetch(`${pbUrl}/api/collections/sedes`, reqOpts);
  const col = await getCol.json();
  let fields = [...col.fields];
  if (!fields.find(f => f.name === 'es_centro_entrega')) {
      console.log("Adding es_centro_entrega to sedes...");
      fields.push({ name: 'es_centro_entrega', type: 'bool', required: false });
      await fetch(`${pbUrl}/api/collections/${col.id}`, {
          method: 'PATCH', ...reqOpts,
          body: JSON.stringify({ fields })
      });
  }

  // 2. Seed Records
  const getRecs = await fetch(`${pbUrl}/api/collections/sedes/records`, reqOpts);
  const recs = (await getRecs.json()).items || [];
  if (recs.length === 0) {
      console.log("Seeding initial sedes...");
      const sedesToSeed = ['PUNO', 'JULIACA'];
      for (const s of sedesToSeed) {
          await fetch(`${pbUrl}/api/collections/sedes/records`, {
              method: 'POST', ...reqOpts,
              body: JSON.stringify({ nombre: s, es_centro_entrega: true })
          });
      }
      console.log("Seeding complete.");
  } else {
      console.log("Sedes already has records.");
  }
}
main();
