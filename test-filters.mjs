async function run() {
  const t1 = "operador_id='123' && accion='A'";
  const t2 = "operador_id=\"123\" && accion=\"A\"";
  const t3 = "operador_id='123' && (accion='A' || accion='B')";
  const t4 = "operador_id=\"123\" && (accion=\"A\" || accion=\"B\")";

  for (const t of [t1, t2, t3, t4]) {
    const url = 'http://localhost:8088/pb-api/api/collections/historial_acciones/records?filter=' + encodeURIComponent(t);
    try {
      const getRes = await fetch(url);
      console.log(`Filter [${t}] -> ${getRes.status}`);
      if (!getRes.ok) console.log(await getRes.text());
    } catch(e) {
      console.error(e);
    }
  }
}
run();
