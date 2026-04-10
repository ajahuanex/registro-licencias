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
  
  // Check reportes_generados collection schema
  const res = await fetch(`${pbUrl}/api/collections/reportes_generados`, { headers: H });
  const col = await res.json();
  
  if (col.code && col.code !== 200) {
    console.error("Error fetching collection:", col);
    return;
  }

  console.log("Collection fields:", JSON.stringify(col.fields.map(f => ({ name: f.name, type: f.type, required: f.required })), null, 2));
}
main();
