const POCKETBASE_URL = 'http://161.132.42.78:8095';
const ADMIN_EMAIL = 'admin@transportespuno.com';
const ADMIN_PASS = 'admin123456789'; // Probando contraseña de test2.js

async function diagnose() {
  console.log(`🚀 Iniciando diagnóstico en ${POCKETBASE_URL}...`);
  
  try {
    // 1. Intentar Login Admin
    console.log(`\n1. Intentando autenticación admin...`);
    const authRes = await fetch(`${POCKETBASE_URL}/api/collections/_superusers/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    
    if (!authRes.ok) {
      const err = await authRes.json();
      console.error(`❌ Fallo Login: HTTP ${authRes.status}`, err);
      if (authRes.status === 400) console.log("   (Posible contraseña incorrecta)");
      return;
    }
    
    const authData = await authRes.json();
    const token = authData.token;
    console.log(`✅ Login Exitoso. Token obtenido.`);

    // 2. Listar Colecciones
    console.log(`\n2. Listando colecciones...`);
    const colRes = await fetch(`${POCKETBASE_URL}/api/collections?perPage=100`, {
      headers: { 'Authorization': token }
    });
    const colData = await colRes.json();
    console.log(`📦 Colecciones encontradas: ${colData.items.length}`);
    
    for (const col of colData.items) {
      console.log(`   - [${col.type}] ${col.name} (ID: ${col.id})`);
      if (col.name === 'operadores') {
        console.log(`     Rules: list="${col.listRule}", view="${col.viewRule}", manage="${col.manageRule}"`);
        console.log(`     Fields:`, col.fields.map(f => f.name).join(', '));
      }
    }

    // 3. Probar GET operadores
    console.log(`\n3. Probando GET /operadores/records...`);
    const recRes = await fetch(`${POCKETBASE_URL}/api/collections/operadores/records?perPage=1&sort=-created`, {
      headers: { 'Authorization': token }
    });
    
    if (!recRes.ok) {
      const recErr = await recRes.json();
      console.error(`❌ Fallo GET Records: HTTP ${recRes.status}`, recErr);
    } else {
      const recData = await recRes.json();
      console.log(`✅ GET Records OK. Total items: ${recData.totalItems}`);
    }

  } catch (e) {
    console.error(`❌ Error inesperado:`, e);
  }
}

diagnose();
