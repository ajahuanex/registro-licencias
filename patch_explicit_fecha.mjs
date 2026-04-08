const pbUrl = 'http://161.132.42.78:8088/pb-api';
const email = 'admin@transportespuno.com';
const password = 'Unodostres123';

async function main() {
  const authRes = await fetch(`${pbUrl}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password })
  });
  const { token } = await authRes.json();

  const getCols = await fetch(`${pbUrl}/api/collections/historial_acciones`, { 
      headers: { 'Authorization': `Bearer ${token}` } 
  });
  const col = await getCols.json();
  
  if (!col.fields.find(f => f.name === 'fecha')) {
      col.fields.push({
        "hidden": false,
        "name": "fecha",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      });

      console.log("Patching collection with explicit 'fecha' date field...");
      const patchRes = await fetch(`${pbUrl}/api/collections/${col.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields: col.fields })
      });

      if (!patchRes.ok) throw await patchRes.json();
  }

  // Backfill `fecha` for all records
  console.log("Backfilling 'fecha' for existing records...");
  const pb = await import('pocketbase').then(m => new m.default(pbUrl));
  pb.authStore.save(token, null);
  
  const logs = await pb.collection('historial_acciones').getFullList();
  let updatedCount = 0;
  const now = new Date().toISOString();
  
  for (const log of logs) {
    if (!log.fecha) {
        await pb.collection('historial_acciones').update(log.id, { fecha: now });
        updatedCount++;
    }
  }
  
  console.log(`Successfully backed-up explicit fecha field for ${updatedCount} logs.`);
}

main().catch(console.error);
