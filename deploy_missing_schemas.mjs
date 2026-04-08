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
  if (!token) { console.error('Failed to authenticate'); return; }

  const reqOpts = { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } };
  
  // 1. SEDES COLLECTION (Create if missing)
  const sedesChek = await fetch(`${pbUrl}/api/collections/sedes`, reqOpts);
  if (sedesChek.status === 404) {
      console.log('Creando coleccion sedes...');
      await fetch(`${pbUrl}/api/collections`, {
          method: 'POST', ...reqOpts,
          body: JSON.stringify({
              name: 'sedes',
              type: 'base',
              listRule: '@request.auth.id != ""', 
              viewRule: '@request.auth.id != ""',
              createRule: '@request.auth.id != ""', 
              updateRule: '@request.auth.id != ""',
              deleteRule: null,
              fields: [
                  { name: 'nombre', type: 'text', required: true }
              ]
          })
      });
      console.log('Sedes creada.');
  } else { console.log('Sedes ya existe.'); }

  const getCols = await fetch(`${pbUrl}/api/collections`, reqOpts);
  const allCols = (await getCols.json()).items || [];

  // 2. OPERADORES (Add IP tracking)
  const opCol = allCols.find(c => c.name === 'operadores');
  if (opCol) {
     let fields = [...opCol.fields];
     let needPatch = false;
     if (!fields.find(f => f.name === 'ultima_ip')) { fields.push({ name: 'ultima_ip', type: 'text', required: false }); needPatch = true; }
     if (!fields.find(f => f.name === 'ultimo_equipo')) { fields.push({ name: 'ultimo_equipo', type: 'text', required: false }); needPatch = true; }
     if (needPatch) {
         await fetch(`${pbUrl}/api/collections/${opCol.id}`, { method: 'PATCH', ...reqOpts, body: JSON.stringify({ fields }) });
         console.log('Operadores parcheado.');
     }
  }

  // 3. HISTORIAL_ACCIONES (Create or Patch)
  const histCol = allCols.find(c => c.name === 'historial_acciones');
  if (!histCol) {
      console.log('Creando historial_acciones...');
      await fetch(`${pbUrl}/api/collections`, {
          method: 'POST', ...reqOpts,
          body: JSON.stringify({
          name: 'historial_acciones', type: 'base', system: false,
          listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""',
          createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""',
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
      console.log('historial_acciones creada.');
  } else {
      console.log('historial_acciones existe, parcheando...');
      let fields = [...histCol.fields];
      let needPatch2 = false;
      const expField = fields.find(f => f.name === 'expediente_id');
      if (expField && expField.required) { expField.required = false; needPatch2 = true; }
      if (!fields.find(f => f.name === 'ip_publica')) { fields.push({ name: 'ip_publica', type: 'text', required: false }); needPatch2 = true; }
      if (!fields.find(f => f.name === 'user_agent')) { fields.push({ name: 'user_agent', type: 'text', required: false }); needPatch2 = true; }
      
      const res = await fetch(`${pbUrl}/api/collections/${histCol.id}`, { method: 'PATCH', ...reqOpts, body: JSON.stringify({ fields, listRule: '@request.auth.id != ""' }) });
      console.log('historial parcheado:', await res.text());
  }
}
main();
