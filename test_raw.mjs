import PocketBase from 'pocketbase';

const pb = new PocketBase('http://161.132.42.78:8088/pb-api');

async function test() {
  await pb.admins.authWithPassword('admin@transportespuno.com', 'Unodostres123');
  try {
    const payload = {
        expediente_id: "test",
        expediente_dni: "test",
        operador_id: "test",
        operador_nombre: "test",
        operador_perfil: "test",
        accion: "CREACION"
    };
    const c = await pb.collection('historial_acciones').create(payload);
    console.log("Newly created record:", JSON.stringify({id: c.id, created: c.created}, null, 2));
  } catch (e) {
    console.error("Test Error:", e.data || e);
  }
}
test();
