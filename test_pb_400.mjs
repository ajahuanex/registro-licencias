import PocketBase from 'pocketbase';

async function testFilter(pb, filterStr) {
  try {
    const result = await pb.collection('expedientes').getList(1, 10, { filter: filterStr });
    console.log(`[PASS] ${filterStr} -> items: ${result.totalItems}`);
  } catch (e) {
    console.log(`[FAIL] ${filterStr} -> 400 Bad Request`);
  }
}

async function test() {
  const pb = new PocketBase('http://161.132.42.78:8088/pb-api');
  try {
    await pb.collection('operadores').authWithPassword('12345678', 'admin1234');
  } catch(e) {}

  await testFilter(pb, `estado = 'ENTREGADO'`);
  await testFilter(pb, `lugar_entrega = 'JULIACA'`);
  await testFilter(pb, `estado = 'ENTREGADO' && lugar_entrega = 'JULIACA'`);
  await testFilter(pb, `estado = 'ENTREGADO' && lugar_entrega = 'JULIACA' && fecha_registro >= "2026-04-03 00:00:00" && fecha_registro <= "2026-04-03 23:59:59"`);
  await testFilter(pb, `estado = 'ENTREGADO' && lugar_entrega = 'JULIACA' && fecha_registro >= "2026-04-02 00:00:00" && fecha_registro <= "2026-04-04 23:59:59"`);
}

test();
