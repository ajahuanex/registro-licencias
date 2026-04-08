const pbUrl = 'http://161.132.42.78:8088/pb-api';
// We will use local admin credentials
const email = 'admin@transportespuno.com';
const password = 'Unodostres123';

async function main() {
  console.log('Authenticating as Admin...');
  const authRes = await fetch(`${pbUrl}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password })
  });

  if (!authRes.ok) throw new Error('Auth failed: ' + await authRes.text());
  const { token } = await authRes.json();

  console.log('Creating "sedes" collection...');
  const createColRes = await fetch(`${pbUrl}/api/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      name: 'sedes',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        {
          name: 'nombre',
          type: 'text',
          required: true,
          unique: true
        }
      ]
    })
  });

  if (createColRes.ok) {
    console.log('✅ "sedes" collection created!');
  } else {
    console.log('⚠️ "sedes" creation error (might already exist):', await createColRes.text());
  }

  // Insert initial values
  const sedesList = ['PUNO', 'JULIACA', 'PATALLANI'];
  for (const s of sedesList) {
    console.log(`Inserting Sede: ${s}...`);
    const insertRes = await fetch(`${pbUrl}/api/collections/sedes/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ nombre: s })
    });
    if (insertRes.ok) {
      console.log(`✅ ${s} inserted!`);
    } else {
      console.log(`⚠️ ${s} insertion error (might already exist):`, await insertRes.text());
    }
  }

  console.log('Patching "operadores" collection to revert sede to text...');
  const r = await fetch(`${pbUrl}/api/collections/operadores`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const opCol = await r.json();
  if (opCol.fields) {
      const sField = opCol.fields.find(f => f.name === 'sede');
      if (sField && sField.type !== 'text') {
          sField.name = 'sede_legacy_select'; // Rename existing select field
          opCol.fields.push({
              name: 'sede',
              type: 'text',
              required: false
          });
          const patchRes = await fetch(`${pbUrl}/api/collections/${opCol.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ fields: opCol.fields })
          });
          if (patchRes.ok) {
              console.log('✅ Operadores "sede" field reverted to "text" successfully using rename workaround!');
          } else {
              console.log('❌ Failed to patch operadores "sede":', await patchRes.text());
          }
      } else {
          console.log('⚠️ Operadores "sede" is already text or missing.');
      }
  }

  console.log('Done.');
}
main().catch(console.error);
