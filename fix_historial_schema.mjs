const pbUrl = 'https://lic.transportespuno.gob.pe/pb-api';
const email = 'admin@transportespuno.com';
const password = 'Unodostres123';

async function main() {
  const authRes = await fetch(`${pbUrl}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password })
  });
  const { token } = await authRes.json();

  if (!token) { console.error('Error autenticando con pb-api'); return; }

  const getCols = await fetch(`${pbUrl}/api/collections`, { headers: { 'Authorization': `Bearer ${token}` } });
  const allCols = (await getCols.json()).items || [];
  const histId = allCols.find(c => c.name === 'historial_acciones')?.id;

  if (histId) {
      console.log('Parcheando historial_acciones a schema actualizado...');
      const p = await fetch(`${pbUrl}/api/collections/${histId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
              fields: [
                { name: 'expediente_id', type: 'text', required: false },
                { name: 'expediente_dni', type: 'text', required: false },
                { name: 'operador_id', type: 'text', required: true },
                { name: 'operador_nombre', type: 'text', required: false },
                { name: 'operador_perfil', type: 'text', required: false },
                { name: 'accion', type: 'text', required: true },
                { name: 'estado_anterior', type: 'text', required: false },
                { name: 'estado_nuevo', type: 'text', required: false },
                { name: 'detalles', type: 'text', required: false },
                { name: 'ip_publica', type: 'text', required: false },
                { name: 'user_agent', type: 'text', required: false }
              ]
          })
      });
      console.log(await p.text());
  } else {
      console.log("No se encontró la colección historial_acciones.");
  }
}
main();
main();
