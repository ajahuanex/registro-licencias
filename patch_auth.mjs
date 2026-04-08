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
  const getCol = await fetch(`${pbUrl}/api/collections/operadores`, { headers: { 'Authorization': `Bearer ${token}` } });
  const col = await getCol.json();
  const indexes = col.indexes || [];
  if (!indexes.some(i => i.includes('(`dni`)'))) {
     indexes.push(`CREATE UNIQUE INDEX \`idx_dni_${col.id}\` ON \`operadores\` (\`dni\`) WHERE \`dni\` != ''`);
  }
  
  const patchRes = await fetch(`${pbUrl}/api/collections/operadores`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      indexes: indexes,
      passwordAuth: { identityFields: ['email', 'dni'], enabled: true }
    })
  });
  console.log('Patch response:', await patchRes.text());
}
main();
