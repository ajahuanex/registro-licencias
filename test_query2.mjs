import PocketBase from 'pocketbase';

const pb = new PocketBase('http://161.132.42.78:8088/pb-api');

async function test() {
  await pb.collection('operadores').authWithPassword('12345678', 'admin1234');
  try {
    const logs2 = await pb.collection('historial_acciones').getFullList({
      filter: `operador_id ~ '48obwHwux8v4hn'`,
      sort: '-created'
    });
    console.log("operador_id Likes count:", logs2.length);
  } catch (e) {
    console.error("operador_id Error2:", e.data || e);
  }
}
test();
