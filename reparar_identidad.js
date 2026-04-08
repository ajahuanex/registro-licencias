const POCKETBASE_URL = 'http://161.132.42.78:8095';
const ADMIN_EMAIL = 'admin@transportespuno.com';
const ADMIN_PASS = 'Unodostres123';

async function main() {
  console.log('--- REPARACIÓN DE IDENTIDAD OPERADORES ---');
  
  const authRes = await fetch(`${POCKETBASE_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
  });
  if (!authRes.ok) { console.error('❌ Error auth:', await authRes.text()); return; }
  const { token } = await authRes.json();
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  // 1. Asegurar que la colección operadores tenga habilitado DNI como identidad
  console.log('1. Verificando configuración de identidad...');
  const colRes = await fetch(`${POCKETBASE_URL}/api/collections/operadores`, { headers });
  const col = await colRes.json();
  
  // A. Asegurar unicidad de DNI (PASO 1)
  const dniField = col.fields.find(f => f.name === 'dni');
  if (dniField && !dniField.unique) {
    console.log('   ⚠️ Paso 1: Aplicando UNIQUE a campo dni...');
    dniField.unique = true;
    
    // Forzar creación de índice manual si no existe
    const idxName = `idx_dni_${col.id}`;
    if (!col.indexes.some(idx => idx.includes('dni'))) {
      col.indexes.push(`CREATE UNIQUE INDEX \`${idxName}\` ON \`operadores\` (\`dni\`)`);
    }

    const patch1 = await fetch(`${POCKETBASE_URL}/api/collections/operadores`, {
       method: 'PATCH', headers, body: JSON.stringify({ fields: col.fields, indexes: col.indexes })
    });
    if (patch1.ok) console.log('   ✅ Paso 1 completado.');
    else { console.error('   ❌ Fallo Paso 1:', await patch1.text()); return; }
  }
  
  // B. Añadir a identityFields (PASO 2)
  if (!col.passwordAuth.identityFields.includes('dni')) {
    console.log('   ⚠️ Paso 2: Añadiendo "dni" a identityFields...');
    col.passwordAuth.identityFields.push('dni');
    const patch2 = await fetch(`${POCKETBASE_URL}/api/collections/operadores`, {
       method: 'PATCH', headers, body: JSON.stringify({ passwordAuth: col.passwordAuth })
    });
    if (patch2.ok) console.log('   ✅ Paso 2 completado. Acceso por DNI habilitado.');
    else console.error('   ❌ Fallo Paso 2:', await patch2.text());
  } else {
    console.log('   ✅ Identidad ya configurada.');
  }

  // 2. Buscar/Actualizar el operador 12345678
  console.log('2. Buscando/Configurando operador 12345678...');
  const opRes = await fetch(`${POCKETBASE_URL}/api/collections/operadores/records?filter=dni="12345678"`, { headers });
  const opData = await opRes.json();
  
  const payload = {
    dni: '12345678',
    username: '12345678', // CRITICO: Para que authWithPassword(dni, pass) funcione
    email: 'admin@transportespuno.com',
    password: 'admin1234',
    passwordConfirm: 'admin1234',
    nombre: 'Administrador OTI',
    perfil: 'ADMINISTRADOR',
    emailVisibility: true
  };

  if (opData.totalItems > 0) {
    const operator = opData.items[0];
    console.log(`   Actualizando registro existente (${operator.id})...`);
    // Primero intentamos cambiar el username si es diferente
    const updateRes = await fetch(`${POCKETBASE_URL}/api/collections/operadores/records/${operator.id}`, {
      method: 'PATCH', headers, body: JSON.stringify(payload)
    });
    if (updateRes.ok) console.log('   ✅ Registro actualizado con username=12345678.');
    else console.error('   ❌ Error actualizando:', await updateRes.text());
  } else {
    console.log('   Creando nuevo registro...');
    const createRes = await fetch(`${POCKETBASE_URL}/api/collections/operadores/records`, {
      method: 'POST', headers, body: JSON.stringify(payload)
    });
    if (createRes.ok) console.log('   ✅ Registro creado con username=12345678.');
    else console.error('   ❌ Error creando:', await createRes.text());
  }

  console.log('--- FIN ---');
}
main();
