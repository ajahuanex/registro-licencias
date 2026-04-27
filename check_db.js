
const PocketBase = require('pocketbase/cjs');

async function check() {
    const pb = new PocketBase('http://localhost:4200/pb-api'); 
    
    try {
        const ids = ['askiccohnt2jkbi', '6zeauqara36ghts'];
        
        for (const id of ids) {
            console.log(`--- Checking Dossier: ${id} ---`);
            try {
                const exp = await pb.collection('expedientes').getOne(id);
                console.log(`  DNI: ${exp.dni_solicitante}`);
                console.log(`  Created: ${exp.created}`);
                console.log(`  Updated: ${exp.updated}`);
                console.log(`  Estado: ${exp.estado}`);
                
                const logs = await pb.collection('historial_acciones').getFullList({
                    filter: `expediente_id = "${id}"`
                });
                console.log(`  History Records Found: ${logs.length}`);
            } catch (inner) {
                console.log(`  Not found or error: ${inner.message}`);
            }
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
}

check();
