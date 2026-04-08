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

  // Helper to patch field
  const patchCollection = async (name) => {
    const res = await fetch(`${pbUrl}/api/collections/${name}`, reqOpts);
    if (!res.ok) { console.log(`Collection ${name} not found.`); return; }
    const col = await res.json();
    let fields = [...col.fields];
    if (!fields.find(f => f.name === 'fecha')) {
        console.log(`Adding 'fecha' to ${name}...`);
        fields.push({ name: 'fecha', type: 'date', required: false });
        const patchRes = await fetch(`${pbUrl}/api/collections/${col.id}`, {
            method: 'PATCH', ...reqOpts,
            body: JSON.stringify({ fields })
        });
        console.log(`Result for ${name}:`, patchRes.status);
    } else {
        console.log(`'fecha' already exists in ${name}.`);
    }
  };

  await patchCollection('historial_acciones');
  await patchCollection('historial_expedientes');
}
main();
