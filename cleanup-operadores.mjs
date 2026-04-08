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

  // 1. Remove legacy field from schema
  const getCol = await fetch(`${pbUrl}/api/collections/operadores`, reqOpts);
  const col = await getCol.json();
  let fields = [...col.fields];
  const legacyIdx = fields.findIndex(f => f.name === 'sede_legacy_select_sync');
  if (legacyIdx !== -1) {
    console.log("Removing legacy field from operators schema...");
    fields.splice(legacyIdx, 1);
    await fetch(`${pbUrl}/api/collections/${col.id}`, {
      method: 'PATCH', ...reqOpts,
      body: JSON.stringify({ fields })
    });
  }

  // 2. Set default sede to PUNO for all records
  const getRecs = await fetch(`${pbUrl}/api/collections/operadores/records`, reqOpts);
  const ops = (await getRecs.json()).items || [];
  console.log(`Setting default sede to PUNO for ${ops.length} operators...`);
  for (const op of ops) {
    if (!op.sede || op.sede.trim() === '') {
      await fetch(`${pbUrl}/api/collections/operadores/records/${op.id}`, {
        method: 'PATCH', ...reqOpts,
        body: JSON.stringify({ sede: 'PUNO' })
      });
    }
  }
  console.log("Cleanup complete.");
}
main();
