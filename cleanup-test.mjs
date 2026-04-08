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
  
  // Remove the test record we just created
  const delRes = await fetch(`${pbUrl}/api/collections/operadores/records/tnehzbl8cpvmvx3`, {
    method: 'DELETE', headers: H
  });
  console.log("Cleaned up test record, status:", delRes.status);
}
main();
