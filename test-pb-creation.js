const fetch = require('node-fetch'); // we'll use native fetch if available, but Node 18+ has it.

async function testPb() {
  const pbUrl = 'http://127.0.0.1:8095';
  let token = '';

  const authRes = await fetch(pbUrl + '/api/collections/_superusers/auth-with-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'admin@drtc.gob.pe', password: 'admin123456789' }) // assuming default dev password? Or let's just test without auth? No, we need auth.
  });

  if (!authRes.ok) {
    console.log('Cannot auth to PB local. Maybe password is different.');
    // Let's print the error anyway
    console.log(await authRes.text());
    return;
  }
  const authData = await authRes.json();
  token = authData.token;

  // Let's try to CREATE the operators collection
  console.log("Creating operadores collection...");
  const createRes = await fetch(`${pbUrl}/api/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      name: 'operadores_test_123',
      type: 'auth',
      system: false,
      listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: ''
    })
  });
  
  if (!createRes.ok) {
     console.log("Create failed:", await createRes.text());
     return;
  }
  
  const getColRes = await fetch(`${pbUrl}/api/collections/operadores_test_123`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const colDef = await getColRes.json();
  
  console.log("Got colDef, fields length:", colDef.fields.length);
  
  const customFields = [
          { name: 'dni', type: 'text', required: true },
          { name: 'nombre', type: 'text', required: true },
          { name: 'perfil', type: 'select', required: true, maxSelect: 1, values: [
            'REGISTRADOR','OPERADOR','IMPRESOR','SUPERVISOR','ENTREGADOR','ADMINISTRADOR','OTI'
          ] },
          { name: 'sede', type: 'text', required: false }
  ];
  
  colDef.fields.push(...customFields);
  
  console.log("Patching collection...");
  const patchRes = await fetch(`${pbUrl}/api/collections/operadores_test_123`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ fields: colDef.fields })
  });
  
  if (!patchRes.ok) {
    console.log("🔥 PATCH FAILED:", await patchRes.text());
  } else {
    console.log("✅ PATCH SUCCESS!");
  }
  
  // Cleanup
  await fetch(`${pbUrl}/api/collections/operadores_test_123`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
}

testPb().catch(console.error);
