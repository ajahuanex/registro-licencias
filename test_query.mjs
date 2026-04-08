import PocketBase from 'pocketbase';

const pb = new PocketBase('http://161.132.42.78:8088/pb-api');

async function test() {
  await pb.admins.authWithPassword('admin@transportespuno.com', 'Unodostres123');
  try {
    const logs = await pb.collection('historial_acciones').getFullList({ filter: "operador_id = '48okkmhwxn8v4hn'"});
    console.log("Raw logs from DB for IMPRESOR:", JSON.stringify(logs.map(l => ({
      id: l.id,
      created: l.created
    })), null, 2));

    const startOfDay = new Date('2026-04-02T05:00:00.000Z');
    const endOfDay = new Date('2026-04-03T04:59:59.999Z'); 
    // Wait, the Angular filter code:
    // const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
    // const endOfDay = new Date(); endOfDay.setHours(23,59,59,999);
    
    // Simulate real local filter
    const nowLocalStart = new Date("2026-04-02T00:00:00");
    const nowLocalEnd = new Date("2026-04-02T23:59:59.999");
    
    console.log("start:", nowLocalStart, "end:", nowLocalEnd);
    
    const valid = logs.filter(item => {
        const itemDate = new Date(item.created);
        return itemDate >= nowLocalStart && itemDate <= nowLocalEnd;
    });
    
    console.log("Filtered count:", valid.length);
  } catch (e) {
    console.error("Test Error:", e.data || e);
  }
}
test();
