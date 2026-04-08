async function test() {
  const r = await fetch('http://161.132.42.78:8088/pb-api/api/collections/operadores/auth-with-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: '12345678', password: 'admin1234' })
  });
  console.log(r.status, await r.text());
}
test();
