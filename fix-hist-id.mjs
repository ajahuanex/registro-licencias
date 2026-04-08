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
  
  const getCol = await fetch(`${pbUrl}/api/collections/historial_expedientes`, reqOpts);
  const col = await getCol.json();
  let fields = [...col.fields];
  
  const idField = fields.find(f => f.name === 'id');
  if (idField) {
      console.log("Restoring autogeneratePattern for historial_expedientes ID...");
      idField.autogeneratePattern = "[a-z0-9]{15}";
      idField.min = 15;
      idField.max = 15;
  }

  await fetch(`${pbUrl}/api/collections/${col.id}`, {
      method: 'PATCH', ...reqOpts,
      body: JSON.stringify({ fields })
  });
  console.log("History schema fixed successfully.");
}
main();
