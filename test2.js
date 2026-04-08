const fetch = globalThis.fetch;

async function run() {
  const url = 'http://127.0.0.1:8095';
  
  console.log('1. Autenticando...');
  const authR = await fetch(url + '/api/collections/_superusers/auth-with-password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'admin@transportespuno.com', password: 'admin123456789' })
  });
  if (!authR.ok) {
    console.log('Fallo auth. Error PB:', await authR.text());
    return;
  }
  const token = (await authR.json()).token;

  console.log('2. Borrando colección si existe...');
  await fetch(url + '/api/collections/operadores_test_123', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }});

  console.log('3. Creando colección...');
  const createR = await fetch(url + '/api/collections', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: 'operadores_test_123',
      type: 'auth',
      manageRule: '@request.auth.id != ""'
    })
  });
  
  if (!createR.ok) { console.log('Error creando:', await createR.text()); return; }

  console.log('4. Obteniendo campos...');
  const getR = await fetch(url + '/api/collections/operadores_test_123', { headers: { Authorization: `Bearer ${token}` }});
  const colDef = await getR.json();

  console.log('COLDEF KEYS:', Object.keys(colDef));

  // Determine if it uses 'fields' or 'schema'
  const targetArray = colDef.fields || colDef.schema || [];
  const propertyName = colDef.fields ? 'fields' : 'schema';
  
  console.log(`Usando propiedad: ${propertyName}`);

  const customFields = [
    { name: 'dni', type: 'text', required: true },
    { name: 'nombre', type: 'text', required: true },
    { name: 'perfil', type: 'select', required: true, options: { maxSelect: 1, values: ['REGISTRADOR','OPERADOR'] } },
    { name: 'sede', type: 'text', required: false }
  ];
  
  targetArray.push(...customFields);
  
  console.log('5. Parcheando colección...');
  const patchR = await fetch(url + '/api/collections/operadores_test_123', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ [propertyName]: targetArray })
  });
  
  if (!patchR.ok) {
    console.log('Error parcheando:', await patchR.text());
    return;
  }

  console.log('6. Creando record de operador simulando Administrador...');
  const recR = await fetch(url + '/api/collections/operadores_test_123/records', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      dni: '12312312',
      nombre: 'Prueba Local',
      email: 'prueba@test.com',
      password: 'password123',
      passwordConfirm: 'password123',
      perfil: 'REGISTRADOR'
    })
  });
  
  if (!recR.ok) {
    console.log('ERROR CREANDO RECORD:', await recR.text());
  } else {
    console.log('EXITO CREANDO RECORD!');
  }
}
run();
