import PocketBase from 'pocketbase';

const pb = new PocketBase('http://161.132.42.78:8088/pb-api');

async function test() {
  await pb.collection('operadores').authWithPassword('12345678', 'admin1234');
  console.log("Admin auth success. Token:", pb.authStore.token.substring(0, 5));

  try {
    const logs = await pb.collection('historial_acciones').getFullList({
      filter: `operador = '48obwHwux8v4hn'`,
      sort: '-created'
    });
    console.log("Logs count:", logs.length);
  } catch (e) {
    console.error("1st Query Error:", e.data || e);
    
    // Also test expediente expand
    try {
        console.log("Testing full list without filters...");
        const logs2 = await pb.collection('historial_acciones').getList(1, 2);
        console.log("Found:", logs2.items.map(i => Object.keys(i)));
    } catch(err) {
        console.error(err);
    }
  }
}
test();
