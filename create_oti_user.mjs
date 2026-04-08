const pbUrl = 'http://161.132.42.78:8088/pb-api';
// We will use local super-admin credentials
const email = 'admin@transportespuno.com';
const password = 'Unodostres123';

async function main() {
  console.log('Authenticating as Super Admin...');
  const authRes = await fetch(`${pbUrl}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password })
  });
  if (!authRes.ok) throw new Error('SuperAdmin Auth failed: ' + await authRes.text());
  const { token } = await authRes.json();

  console.log('Verificando coleccion "operadores"...');
  const createColRes = await fetch(`${pbUrl}/api/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
          name: 'operadores',
          type: 'auth',
          system: false,
          listRule: '@request.auth.id != ""', 
          viewRule: '@request.auth.id != ""', 
          manageRule: '@request.auth.id != ""',
          fields: [
            { name: 'dni', type: 'text', required: true },
            { name: 'nombre', type: 'text', required: true },
            { name: 'perfil', type: 'text', required: true },
            { name: 'sede', type: 'text', required: false }
          ]
      })
  });
  console.log('Collection creation response:', await createColRes.text());

  console.log('Restaurando cuenta OTI principal en la colección "operadores"...');
  
  const payload = {
      dni: '12345678',
      nombre: 'ADMINISTRADOR GENERAL OTI',
      email: 'oti_12345678@transportespuno.com',
      password: 'admin1234',
      passwordConfirm: 'admin1234',
      perfil: 'OTI',
      sede: 'PUNO'
  };

  const createRes = await fetch(`${pbUrl}/api/collections/operadores/records`, {
      method: 'POST',
      headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(payload)
  });

  if (createRes.ok) {
      console.log('✅ Cuenta OTI restaurada exitosamente!');
      console.log('Puedes iniciar sesión con: \nEmail: admin@transportespuno.com \nContraseña: Unodostres123');
  } else {
      const resp = await createRes.json();
      if (resp.data?.email?.code === 'validation_invalid_email' || resp.data?.email?.code === 'validation_not_unique') {
         console.log('⚠️ La cuenta OTI ya parece existir en la base de datos.');
      } else {
         console.log('❌ Error al restaurar cuenta:', resp);
      }
  }
}
main().catch(console.error);
