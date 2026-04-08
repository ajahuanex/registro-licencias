const POCKETBASE_URL = 'http://161.132.42.78:8095';
const ADMIN_EMAIL = 'admin@transportespuno.com';
const ADMIN_PASS = 'Unodostres123';

async function main() {
  console.log('--- AÑADIENDO CAMPOS DE AUDITORÍA ---');
  
  const authRes = await fetch(`${POCKETBASE_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
  });
  if (!authRes.ok) { console.error('❌ Error auth:', await authRes.text()); return; }
  const { token } = await authRes.json();
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  console.log('1. Obteniendo colección historial_acciones...');
  const colRes = await fetch(`${POCKETBASE_URL}/api/collections/historial_acciones`, { headers });
  const col = await colRes.json();
  
  const newFields = [
    { name: 'ip_publica', type: 'text', required: false, system: false },
    { name: 'user_agent', type: 'text', required: false, system: false }
  ];

  let changed = false;
  for (const f of newFields) {
    if (!col.fields.some(existing => existing.name === f.name)) {
      console.log(`   ➕ Añadiendo campo: ${f.name}`);
      col.fields.push(f);
      changed = true;
    }
  }

  if (changed) {
    const patchRes = await fetch(`${POCKETBASE_URL}/api/collections/historial_acciones`, {
      method: 'PATCH', headers, body: JSON.stringify({ fields: col.fields })
    });
    if (patchRes.ok) console.log('   ✅ Colección historial_acciones actualizada.');
    else console.error('   ❌ Error al actualizar:', await patchRes.text());
  } else {
    console.log('   ✅ Los campos ya existen.');
  }

  console.log('--- FIN ---');
}
main();
