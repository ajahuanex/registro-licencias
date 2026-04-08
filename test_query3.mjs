import PocketBase from 'pocketbase';

const pb = new PocketBase('http://161.132.42.78:8088/pb-api');

async function test() {
  await pb.collection('operadores').authWithPassword('12345678', 'admin1234');
  try {
    const logs = await pb.collection('historial_acciones').getFullList({
      filter: `accion = "Impreso"`,
      sort: '-created'
    });
    console.log("accion Impreso count:", logs.length);
  } catch (e) {
    console.error("accion Error:", e.data || e);
  }
}
test();
