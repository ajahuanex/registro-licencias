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
  
  // 1. lugar_entrega -> uppercase
  const leField = fields.find(f => f.name === 'lugar_entrega');
  if (leField) leField.values = ["PUNO", "JULIACA"];

  // 2. tramite -> uppercase
  const trField = fields.find(f => f.name === 'tramite');
  if (trField) trField.values = ["OBTENCIÓN", "REVALIDACIÓN", "DUPLICADO", "RECATEGORIZACIÓN"];

  // 3. categoria -> select + B-I
  const ctField = fields.find(f => f.name === 'categoria');
  if (ctField) {
      console.log("Updating categoria values to include B-I...");
      ctField.type = "select";
      ctField.values = ['A-I', 'A-IIa', 'A-IIb', 'A-IIIa', 'A-IIIb', 'A-IIIc', 'B-I', 'B-IIa', 'B-IIb', 'B-IIc'];
  }

  await fetch(`${pbUrl}/api/collections/${col.id}`, {
      method: 'PATCH', ...reqOpts,
      body: JSON.stringify({ fields })
  });
  console.log("Final schema patch successful.");
}
main();
