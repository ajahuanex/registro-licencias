const POCKETBASE_URL = 'http://161.132.42.78:8095';
const ADMIN_EMAIL = 'admin@transportespuno.com';
const ADMIN_PASS = 'Unodostres123';

async function main() {
  console.log('--- MANTENIMIENTO REMOTO DRTC PUNO (V2) ---');
  
  const authRes = await fetch(`${POCKETBASE_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
  });
  if (!authRes.ok) { console.error('❌ Error auth:', await authRes.text()); return; }
  const { token } = await authRes.json();
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  // 1. Reset Operator Pass
  const opRes = await fetch(`${POCKETBASE_URL}/api/collections/operadores/records?filter=dni="12345678"`, { headers });
  const opData = await opRes.json();
  if (opData.totalItems > 0) {
    const operator = opData.items[0];
    await fetch(`${POCKETBASE_URL}/api/collections/operadores/records/${operator.id}`, {
      method: 'PATCH', headers, body: JSON.stringify({ password: 'admin1234', passwordConfirm: 'admin1234' })
    });
    console.log('✅ Contraseña de 12345678 reseteada a "admin1234"');
  }

  // 2. Get Operadores Collection ID for relations
  const opColRes = await fetch(`${POCKETBASE_URL}/api/collections/operadores`, { headers });
  const opCol = await opColRes.json();
  const opColId = opCol.id;

  // 3. Fix Schemes
  const fixCollection = async (name, newFields) => {
    console.log(`   Analizando ${name}...`);
    const res = await fetch(`${POCKETBASE_URL}/api/collections/${name}`, { headers });
    const col = await res.json();
    const existingFields = col.fields || col.schema || [];
    const propName = col.fields ? 'fields' : 'schema';
    
    let changed = false;
    for (const f of newFields) {
      if (!existingFields.some(ef => ef.name === f.name)) {
        console.log(`     + Añadiendo campo: ${f.name}`);
        // Inject collectionId for relations
        if (f.type === 'relation' && !f.options.collectionId) f.options.collectionId = opColId;
        existingFields.push(f);
        changed = true;
      }
    }
    
    if (changed) {
      const patchRes = await fetch(`${POCKETBASE_URL}/api/collections/${name}`, {
        method: 'PATCH', headers, body: JSON.stringify({ [propName]: existingFields })
      });
      if (patchRes.ok) console.log(`     ✅ ${name} actualizado.`);
      else console.log(`     ❌ Error en ${name}:`, await patchRes.text());
    } else {
      console.log(`     ✅ ${name} ya está al día.`);
    }
  };

  await fixCollection('reportes_generados', [
    { name: 'generado_por', type: 'relation', required: true, options: { collectionId: opColId, maxSelect: 1 } },
    { name: 'tipo_reporte', type: 'select', required: true, options: { values: ['REPORTE_DIARIO', 'REPORTE_MENSUAL'] } },
    { name: 'fecha_reporte', type: 'date', required: true },
    { name: 'ruta_pdf', type: 'text' },
    { name: 'total_registros', type: 'number' },
    { name: 'sede', type: 'text' },
    { name: 'metadata', type: 'json' },
    { name: 'nombre_archivo', type: 'text' }
  ]);

  await fixCollection('expedientes', [
     { name: 'operador_id', type: 'text' }
  ]);

  console.log('\n--- FIN ---');
}
main();
