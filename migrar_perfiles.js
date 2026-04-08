const POCKETBASE_URL = 'http://161.132.42.78:8095';
const ADMIN_EMAIL = 'admin@transportespuno.com';
const ADMIN_PASS = 'Unodostres123';

async function main() {
  console.log('--- MIGRACIÓN DE PERFILES DE OPERADOR ---');
  
  const authRes = await fetch(`${POCKETBASE_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
  });
  if (!authRes.ok) { console.error('❌ Error auth:', await authRes.text()); return; }
  const { token } = await authRes.json();
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  console.log('1. Buscando registros con perfil OPERADOR...');
  const opRes = await fetch(`${POCKETBASE_URL}/api/collections/operadores/records?filter=perfil="OPERADOR"`, { headers });
  const opData = await opRes.json();
  
  if (opData.totalItems > 0) {
    console.log(`   Se encontraron ${opData.totalItems} registros. Migrando...`);
    for (const operator of opData.items) {
      const updateRes = await fetch(`${POCKETBASE_URL}/api/collections/operadores/records/${operator.id}`, {
        method: 'PATCH', headers, body: JSON.stringify({ perfil: 'REGISTRADOR' })
      });
      if (updateRes.ok) console.log(`   ✅ ${operator.nombre} migrado a REGISTRADOR.`);
      else console.error(`   ❌ Error migrando ${operator.nombre}:`, await updateRes.text());
    }
  } else {
    console.log('   ✅ No hay registros con perfil OPERADOR.');
  }

  console.log('--- FIN ---');
}
main();
