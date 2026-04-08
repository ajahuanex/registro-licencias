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
  const opId = allCols.find(c => c.name === 'operadores')?.id;

  if (opId) {
      console.log('Parcheando reglas de operadores...');
      const p = await fetch(`${pbUrl}/api/collections/${opId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
              createRule: '@request.auth.id != ""',
              updateRule: '@request.auth.id != ""',
              deleteRule: '@request.auth.id != ""'
          })
      });
      console.log(await p.text());
  }
}
main();
