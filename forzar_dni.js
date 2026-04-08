const POCKETBASE_URL = 'http://161.132.42.78:8095';
const ADMIN_EMAIL = 'admin@transportespuno.com';
const ADMIN_PASS = 'Unodostres123';

async function main() {
  console.log('--- REPARACIÓN DE IDENTIDAD DNI (v0.23) ---');
  
  const authRes = await fetch(`${POCKETBASE_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
  });
  if (!authRes.ok) { console.error('❌ Error auth:', await authRes.text()); return; }
  const { token } = await authRes.json();
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  console.log('1. Forzando identityFields en operadores...');
  const res = await fetch(`${POCKETBASE_URL}/api/collections/operadores`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      authOptions: {
        identityFields: ['email', 'dni'],
        allowPasswordAuth: true
      }
    })
  });
  
  if (res.ok) console.log('   ✅ identityFields actualizados: [email, dni]');
  else console.error('   ❌ Error al actualizar:', await res.text());

  console.log('2. Verificando password de 12345678...');
  const findRes = await fetch(`${POCKETBASE_URL}/api/collections/operadores/records?filter=dni="12345678"`, { headers });
  const findData = await findRes.json();
  if (findData.totalItems > 0) {
    const op = findData.items[0];
    const passRes = await fetch(`${POCKETBASE_URL}/api/collections/operadores/records/${op.id}`, {
      method: 'PATCH', headers, body: JSON.stringify({ password: 'admin1234', passwordConfirm: 'admin1234' })
    });
    if (passRes.ok) console.log('   ✅ Password reseteado a admin1234 por seguridad.');
  }

  console.log('--- FIN ---');
}
main();
