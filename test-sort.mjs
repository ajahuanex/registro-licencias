async function run() {
  const urlParams1 = "?filter=operador_id='123'&sort=-created";
  const urlParams2 = "?filter=operador_id='123'&sort=-id";

  const url1 = 'http://localhost:8088/pb-api/api/collections/historial_acciones/records' + urlParams1;
  const url2 = 'http://localhost:8088/pb-api/api/collections/historial_acciones/records' + urlParams2;

  try {
    const r1 = await fetch(url1);
    console.log('sort=-created Status:', r1.status);
    
    const r2 = await fetch(url2);
    console.log('sort=-id Status:', r2.status);
  } catch(e) {
    console.error(e);
  }
}
run();
