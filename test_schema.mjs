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

  const getCols = await fetch(`${pbUrl}/api/collections/expedientes`, { 
      headers: { 'Authorization': `Bearer ${token}` } 
  });
  const col = await getCols.json();
  const createdField = col.fields.find(f => f.name === 'created' || f.name === 'fecha_registro');
  const updatedField = col.fields.find(f => f.name === 'updated');
  console.log("Expedientes AuthDate fields:", JSON.stringify({createdField, updatedField}, null, 2));
}
main();
