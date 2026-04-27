import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8095');

async function checkExp() {
    const id = '1z5jg9jpd8yby21';
    try {
        const exp = await pb.collection('expedientes').getOne(id);
        console.log('SPECIFIC EXP:', JSON.stringify({id: exp.id, created: exp.created, updated: exp.updated, status: exp.estado}, null, 2));

        const list = await pb.collection('expedientes').getList(1, 10);
        console.log('LIST SAMPLES:', JSON.stringify(list.items.map(i => ({id: i.id, created: i.created, updated: i.updated, status: i.estado})), null, 2));

        const hist = await pb.collection('historial_acciones').getFullList({
            filter: `expediente_id = "${id}"`,
            sort: 'created'
        });
        console.log('HISTORY:', JSON.stringify(hist, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
}
checkExp();
