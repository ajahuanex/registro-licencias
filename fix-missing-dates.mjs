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

  const getRecs = await fetch(`${pbUrl}/api/collections/expedientes/records?perPage=500`, reqOpts);
  const data = await getRecs.json();
  const items = data.items || [];

  for (const item of items) {
    if (!item.fecha_registro) {
      console.log(`Record ${item.id} is missing fecha_registro. Fixing...`);
      await fetch(`${pbUrl}/api/collections/expedientes/records/${item.id}`, {
        method: 'PATCH',
        ...reqOpts,
        body: JSON.stringify({ fecha_registro: item.created || new Date().toISOString() })
      });
    }
  }
}
main();
