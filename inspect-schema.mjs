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
  
  const getCol = await fetch(`${pbUrl}/api/collections/historial_acciones`, {
      headers: { 'Authorization': `Bearer ${token}` }
  });
  const col = await getCol.json();
  console.log(JSON.stringify(col, null, 2));
}
main();
