async function run() {
  const url = 'http://localhost:8088/pb-api/api/collections/historial_acciones/records?perPage=1';
  try {
    const r = await fetch(url);
    const data = await r.json();
    console.log(data);
    if(data.items && data.items.length > 0) {
       console.log("Keys in record:", Object.keys(data.items[0]));
    }
  } catch(e) {
    console.error(e);
  }
}
run();
