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
  const reqOpts = { headers: { 'Authorization': `Bearer ${token}` } };
  
  const getCol = await fetch(`${pbUrl}/api/collections/historial_expedientes`, reqOpts);
  console.log(JSON.stringify(await getCol.json(), null, 2));
}
main();
