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
  const reqOpts = { headers: { 'Authorization': `Bearer ${token}` } };

  const collections = ['operadores', 'expedientes', 'sedes', 'historial_acciones', 'historial_expedientes'];
  let report = "# PocketBase Data Model Audit Report\n\n";
  
  for (const cName of collections) {
    const colRes = await fetch(`${pbUrl}/api/collections/${cName}`, reqOpts);
    if (!colRes.ok) { report += `## ${cName}: NOT FOUND\n\n`; continue; }
    const col = await colRes.json();
    
    const recRes = await fetch(`${pbUrl}/api/collections/${cName}/records?perPage=1`, reqOpts);
    const recs = await recRes.json();
    
    report += `## Collection: \`${cName}\`\n`;
    report += `- **Type**: ${col.type}\n`;
    report += `- **Records**: ${recs.totalItems}\n`;
    report += `- **Fields**: ${col.fields.map(f => `\`${f.name}\` (${f.type})`).join(', ')}\n\n`;
  }
  
  console.log(report);
}
main();
