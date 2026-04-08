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

  const getCols1 = await fetch(`${pbUrl}/api/collections/expedientes`, { headers: { 'Authorization': `Bearer ${token}` } });
  const col1 = await getCols1.json();

  console.log("List Rule:", col1.listRule);
  console.log("View Rule:", col1.viewRule);
}

main().catch(console.error);
