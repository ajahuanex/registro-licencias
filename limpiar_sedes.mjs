const pbUrl = 'http://161.132.42.78:8088/pb-api';
const email = 'admin@transportespuno.com';
const password = 'Unodostres123';

async function main() {
  console.log('Authenticating as Admin...');
  const authRes = await fetch(`${pbUrl}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password })
  });
  if (!authRes.ok) throw new Error('Auth failed');
  const { token } = await authRes.json();

  console.log('Fetching sedes...');
  const getRes = await fetch(`${pbUrl}/api/collections/sedes/records`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await getRes.json();
  const sedes = data.items || [];
  
  const seen = new Set();
  for (const s of sedes) {
      const name = s.nombre.toUpperCase();
      if (seen.has(name)) {
          console.log(`Deleting duplicate: ${name} (${s.id})`);
          await fetch(`${pbUrl}/api/collections/sedes/records/${s.id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });
      } else {
          seen.add(name);
      }
  }
  console.log('Done!');
}
main().catch(console.error);
