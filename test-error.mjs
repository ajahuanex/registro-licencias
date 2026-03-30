async function run() {
  const url = 'http://localhost:8088/pb-api/api/collections/historial_acciones/records?filter=' + encodeURIComponent("operador_id='j7bwj135gczekmm' && (accion='MARCADO_RAPIDO_IMPRESO' || accion='MARCADO_MASIVO_IMPRESO')") + '&sort=-created';
  try {
    const r = await fetch(url);
    console.log('Status:', r.status);
    console.log('Body:', await r.text());
  } catch(e) {
    console.error(e);
  }
}
run();
