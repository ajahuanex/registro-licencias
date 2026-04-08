const POCKETBASE_URL = 'http://161.132.42.78:8095';
const ADMIN_EMAIL = 'admin@transportespuno.com';

const passwords = [
  'admin123456789',
  'admin12345678',
  'admin1234',
  'password123',
  '12345678',
  '123123123',
  'admin'
];

async function tryAuth() {
  for (const pass of passwords) {
    console.log(`Intentando: ${pass}...`);
    try {
      const res = await fetch(`${POCKETBASE_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: pass })
      });
      if (res.ok) {
        console.log(`✅ ¡ÉXITO! La contraseña es: ${pass}`);
        return;
      } else {
        console.log(`❌ Fallido (HTTP ${res.status})`);
      }
    } catch (e) {
      console.log(`🔥 Error: ${e.message}`);
    }
  }
  console.log('🏁 Ninguna contraseña funcionó.');
}

tryAuth();
