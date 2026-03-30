async function run() {
  const loginRes = await fetch('http://localhost:8088/pb-api/api/collections/_superusers/auth-with-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'admin@transportespuno.com', password: 'Unodostres123' })
  });
  const { token } = await loginRes.json();
  const headers = { 'Authorization': 'Bearer ' + token };

  const url = 'http://localhost:8088/pb-api/api/collections/historial_acciones/records?filter=' + encodeURIComponent("operador_id='j7bwj135gczekmm' && (accion='MARCADO_RAPIDO_IMPRESO' || accion='MARCADO_MASIVO_IMPRESO')") + '&sort=-created';
  
  const getRes = await fetch(url, { headers });
  console.log("Status with auth:", getRes.status);
  console.log("Body:", await getRes.text());
}
run();
