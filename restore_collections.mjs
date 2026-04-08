const pbUrl = 'http://161.132.42.78:8088/pb-api';
const email = 'admin@transportespuno.com';
const password = 'Unodostres123';

async function main() {
  const authRes = await fetch(`${pbUrl}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password })
  });
  const { token } = await authRes.json();

  const getColId = async (name) => {
    const getCols = await fetch(`${pbUrl}/api/collections`, { headers: { 'Authorization': `Bearer ${token}` } });
    return (await getCols.json()).items?.find(c => c.name === name)?.id;
  };

  const opId = await getColId('operadores');
  if (!opId) {
     console.error('CRITICAL: Collection operadores not found!');
     return;
  }

  const colsToCreate = [
    {
      name: 'expedientes', type: 'base', system: false,
      listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""',
      fields: [
        { name: 'operador', type: 'relation', required: true, collectionId: opId, maxSelect: 1, cascadeDelete: false },
        { name: 'dni_solicitante', type: 'text', required: true },
        { name: 'apellidos_nombres', type: 'text', required: true },
        { name: 'tramite', type: 'text', required: true },
        { name: 'estado', type: 'text', required: true },
        { name: 'categoria', type: 'text', required: true },
        { name: 'lugar_entrega', type: 'text', required: true },
        { name: 'fecha_registro', type: 'date', required: true }
      ]
    },
    {
      name: 'historial_acciones', type: 'base', system: false,
      listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""',
      fields: [
        { name: 'expediente_rel', type: 'relation', required: true, collectionId: 'expedientes', maxSelect: 1, cascadeDelete: true },
        { name: 'operador', type: 'relation', required: true, collectionId: opId, maxSelect: 1, cascadeDelete: false },
        { name: 'accion', type: 'text', required: true },
        { name: 'estado_nuevo', type: 'text', required: true },
        { name: 'motivo', type: 'text', required: false }
      ]
    },
    {
      name: 'reportes_generados', type: 'base', system: false,
      listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""', updateRule: '@request.auth.id != ""',
      fields: [
        { name: 'operador', type: 'relation', required: true, collectionId: opId, maxSelect: 1, cascadeDelete: false },
        { name: 'tipo', type: 'text', required: true },
        { name: 'rango_fechas', type: 'text', required: true },
        { name: 'total_entregados', type: 'number', required: true },
        { name: 'archivo_pdf', type: 'file', required: false, maxSelect: 1, maxSize: 5242880, mimeTypes: ['application/pdf'] }
      ]
    }
  ];

  for (const col of colsToCreate) {
      if (await getColId(col.name)) {
         console.log(`Colección ${col.name} ya existe. Parcheando...`);
         const p = await fetch(`${pbUrl}/api/collections/${await getColId(col.name)}`, {
             method: 'PATCH',
             headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
             body: JSON.stringify({ fields: col.fields, listRule: col.listRule, viewRule: col.viewRule, createRule: col.createRule, updateRule: col.updateRule })
         });
         console.log(await p.text());
      } else {
         console.log(`Creando colección ${col.name}...`);
         
         // Fix self-referential creation (historial_acciones points to expedientes)
         if (col.name === 'historial_acciones') {
             col.fields[0].collectionId = await getColId('expedientes');
             if(!col.fields[0].collectionId) throw new Error('Expedientes no se encontró pero se requiere para historial_acciones');
         }
         
         const r = await fetch(`${pbUrl}/api/collections`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
             body: JSON.stringify(col)
         });
         const respText = await r.text();
         console.log('Result:', respText);
         if (!r.ok) {
             console.error('FAILED TO CREATE', col.name, respText);
             return;
         }
      }
  }
}
main();
