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
  const H = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  
  const res = await fetch(`${pbUrl}/api/collections/reportes_generados`, { headers: H });
  const col = await res.json();
  
  const tipoReporteField = col.fields.find(f => f.name === 'tipo_reporte');
  console.log("tipo_reporte options:", tipoReporteField.values);
  
  const sedeField = col.fields.find(f => f.name === 'sede');
  console.log("sede options:", sedeField.values);
}
main();
