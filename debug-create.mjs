const pbUrl = 'https://lic.transportespuno.gob.pe/pb-api';
const email = 'admin@transportespuno.com';
const password = 'Unodostres123';

async function main() {
  const authRes = await fetch(`${pbUrl}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password })
  });
  const auth = await authRes.json();
  const token = auth.token;
  const adminId = auth.record.id;
  const reqOpts = { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } };

  // Attempt a test creation with the same fields as the UI
  const testPayload = {
    dni_solicitante: "99999999",
    apellidos_nombres: "TEST USER",
    celular: "999999999",
    tramite: "Obtención",
    categoria: "A-I",
    lugar_entrega: "PUNO",
    estado: "EN PROCESO",
    reviso_sanciones: true,
    observaciones: "Test registration",
    fecha_registro: new Date().toISOString(),
    operador: adminId // Check if relation works with this ID or if it needs to be an operator ID
  };

  const res = await fetch(`${pbUrl}/api/collections/expedientes/records`, {
    method: 'POST', ...reqOpts,
    body: JSON.stringify(testPayload)
  });

  console.log("STATUS:", res.status);
  console.log("RESPONSE:", await res.text());
}
main();
