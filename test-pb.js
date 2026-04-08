const url = 'http://161.132.42.78:8080/pb-api/api/collections/operadores/records';
const payload = {
  dni: "11223344",
  nombre: "test dev",
  email: "11223344@drtc.gob.pe",
  perfil: "REGISTRADOR",
  password: "password123",
  passwordConfirm: "password123"
};

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
}).then(async r => {
  const t = await r.text();
  console.log('Status:', r.status);
  console.log('Body:', t);
}).catch(e => console.error(e));
