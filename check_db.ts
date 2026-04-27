
import PocketBase from 'pocketbase';

async function check() {
    const pb = new PocketBase('http://localhost:4200/pb-api'); 
    const expedienteId = 'askiccohnt2jkbi';
    
    console.log(`--- Diagnostic for Expediente: ${expedienteId} ---`);
    
    try {
        // 1. Try to fetch the dossier
        const exp = await pb.collection('expedientes').getOne(expedienteId);
        console.log('Dossier found:', exp['dni_solicitante'], exp['estado']);

        // 2. Try to fetch history from historial_acciones by ID
        const logsAcc = await pb.collection('historial_acciones').getFullList({
            filter: `expediente_id = "${expedienteId}"`
        });
        console.log(`History (acciones) by ID found: ${logsAcc.length} records`);
        logsAcc.forEach(l => console.log(`  - ${l['accion']} | ${l['fecha'] || l['created']} | ${l['detalles']}`));

        // 3. Try to fetch history from historial_expedientes by ID
        const logsExp = await pb.collection('historial_expedientes').getFullList({
            filter: `expediente_id = "${expedienteId}"`
        });
        console.log(`History (expedientes) by ID found: ${logsExp.length} records`);

        // 4. Try to fetch history by DNI as fallback
        if (exp['dni_solicitante']) {
            const logsDni = await pb.collection('historial_acciones').getFullList({
                filter: `expediente_dni = "${exp['dni_solicitante']}"`
            });
            console.log(`History (acciones) by DNI found: ${logsDni.length} records`);
        }

    } catch (e) {
        console.error('Error during diagnostic:', e);
    }
}

check();
