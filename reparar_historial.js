const POCKETBASE_URL = 'http://161.132.42.78:8095';
const ADMIN_EMAIL = 'admin@transportespuno.com';
const ADMIN_PASS = 'Unodostres123';

async function main() {
  console.log('--- REPARACIÓN FINAL HISTORIAL ---');
  
  const authRes = await fetch(`${POCKETBASE_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
  });
  if (!authRes.ok) { console.error('❌ Error auth:', await authRes.text()); return; }
  const { token } = await authRes.json();
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const colRes = await fetch(`${POCKETBASE_URL}/api/collections/historial_acciones`, { headers });
  const col = await colRes.json();
  
  // 1. Quitar required de expediente_id
  const expId = col.fields.find(f => f.name === 'expediente_id');
  if (expId) {
    console.log('   🛠️ Haciendo expediente_id opcional...');
    expId.required = false;
  }

  // 2. Asegurar campos de auditoría
  const auditFields = [
    { name: 'ip_publica', type: 'text', required: false },
    { name: 'user_agent', type: 'text', required: false }
  ];
  for (const f of auditFields) {
    if (!col.fields.some(existing => existing.name === f.name)) {
      console.log(`   ➕ Añadiendo campo: ${f.name}`);
      col.fields.push(f);
    }
  }

  const patchRes = await fetch(`${POCKETBASE_URL}/api/collections/historial_acciones`, {
    method: 'PATCH', headers, body: JSON.stringify({ fields: col.fields })
  });
  
  if (patchRes.ok) console.log('   ✅ Historial reparado con éxito.');
  else console.error('   ❌ Error reparando:', await patchRes.text());

  console.log('--- FIN ---');
}
main();
