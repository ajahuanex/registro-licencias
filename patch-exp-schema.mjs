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
  
  const getCol = await fetch(`${pbUrl}/api/collections/expedientes`, reqOpts);
  const col = await getCol.json();
  let fields = [...col.fields];
  
  // Update lugar_entrega
  const leField = fields.find(f => f.name === 'lugar_entrega');
  if (leField) {
      console.log("Updating lugar_entrega values to UPPERCASE...");
      leField.values = ["PUNO", "JULIACA"];
  }

  // Update category and tramite to match common uppercase usage if needed
  const trField = fields.find(f => f.name === 'tramite');
  if (trField) {
      trField.values = ["OBTENCIÓN", "REVALIDACIÓN", "DUPLICADO", "RECATEGORIZACIÓN"];
  }

  await fetch(`${pbUrl}/api/collections/${col.id}`, {
      method: 'PATCH', ...reqOpts,
      body: JSON.stringify({ fields })
  });
  console.log("Schema patched successfully.");
}
main();
