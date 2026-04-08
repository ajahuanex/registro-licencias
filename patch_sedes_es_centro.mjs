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

  const getCols = await fetch(`${pbUrl}/api/collections`, { headers: { 'Authorization': `Bearer ${token}` } });
  const allCols = (await getCols.json()).items || [];
  const sedesCol = allCols.find(c => c.name === 'sedes');

  if (sedesCol) {
      if (!sedesCol.fields.some(f => f.name === 'es_centro_entrega')) {
          console.log('Agregando campo es_centro_entrega...');
          sedesCol.fields.push({
             name: 'es_centro_entrega',
             type: 'bool',
             required: false
          });
          const p = await fetch(`${pbUrl}/api/collections/${sedesCol.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ fields: sedesCol.fields })
          });
          console.log(await p.text());
      } else {
          console.log('El campo es_centro_entrega ya existe.');
      }
      
      // Update data
      const recsRes = await fetch(`${pbUrl}/api/collections/sedes/records`, { headers: { 'Authorization': `Bearer ${token}` } });
      const recs = await recsRes.json();
      for (const r of recs.items) {
          const isCentro = r.nombre === 'PUNO' || r.nombre === 'JULIACA';
          await fetch(`${pbUrl}/api/collections/sedes/records/${r.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ es_centro_entrega: isCentro })
          });
          console.log(`Marcado ${r.nombre} como centro_entrega=${isCentro}`);
      }
  }
}
main();
