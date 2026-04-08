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
  const expCol = allCols.find(c => c.name === 'expedientes');

  if (expCol) {
      if (!expCol.fields.some(f => f.name === 'reviso_sanciones')) {
          console.log('Agregando campo reviso_sanciones...');
          expCol.fields.push({
             name: 'reviso_sanciones',
             type: 'bool',
             required: false
          });
          const p = await fetch(`${pbUrl}/api/collections/${expCol.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ fields: expCol.fields })
          });
          console.log(await p.text());
      } else {
          console.log('El campo reviso_sanciones ya existe.');
      }
  }
}
main();
