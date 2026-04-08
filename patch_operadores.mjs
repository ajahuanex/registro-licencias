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
  if (!token) { console.error('Faied to authenticate with token'); return; }

  const getCols = await fetch(`${pbUrl}/api/collections`, { headers: { 'Authorization': `Bearer ${token}` } });
  const allCols = (await getCols.json()).items || [];
  
  const opCol = allCols.find(c => c.name === 'operadores');
  
  if (opCol) {
     let fields = [...opCol.fields];
     if (!fields.find(f => f.name === 'ultima_ip')) {
        fields.push({ name: 'ultima_ip', type: 'text', required: false });
     }
     if (!fields.find(f => f.name === 'ultimo_equipo')) {
        fields.push({ name: 'ultimo_equipo', type: 'text', required: false });
     }

     const p = await fetch(`${pbUrl}/api/collections/${opCol.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ fields })
      });
      console.log("Response:", await p.text());
  } else {
     console.log("No operadores collection found");
  }
}
main();
