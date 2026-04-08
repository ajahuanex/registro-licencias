const pbUrl = 'https://lic.transportespuno.gob.pe/pb-api';

async function main() {
  const authRes = await fetch(`${pbUrl}/api/collections/sedes/records?perPage=1`, {
    method: 'GET'
  });
  console.log("STATUS:", authRes.status);
  console.log("BODY:", await authRes.text());
}
main();
