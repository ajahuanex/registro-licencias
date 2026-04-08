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
  
  // Check operadores collection schema
  const res = await fetch(`${pbUrl}/api/collections/operadores`, { headers: H });
  const col = await res.json();
  
  // Find what auth fields are configured
  const authFields = col.fields?.filter((f) => f.system || f.type === 'text');
  console.log("Collection type:", col.type);
  console.log("Auth fields:", JSON.stringify(authFields?.map(f => ({ name: f.name, required: f.required, unique: f.unique })), null, 2));

  // Try creating a test record to see the real error
  const testRes = await fetch(`${pbUrl}/api/collections/operadores/records`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({
      dni: '29999999',
      nombre: 'DIRECTIVO 01',
      email: '29999999@drtc.gob.pe',
      perfil: 'DIRECTIVO',
      sede: 'PUNO',
      password: 'test12345678',
      passwordConfirm: 'test12345678',
      emailVisibility: true
    })
  });
  const result = await testRes.json();
  console.log("Test create result:", JSON.stringify(result, null, 2));
}
main();
