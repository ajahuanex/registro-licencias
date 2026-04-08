const pbUrl = 'https://lic.transportespuno.gob.pe/pb-api';
const email = 'admin@transportespuno.com';
const password = 'Unodostres123';

async function main() {
  const authRes = await fetch(`${pbUrl}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password })
  });
  const { token } = await authRes.json();
  const reqOpts = { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } };

  // 1. Fetch all expedientes
  const getRecs = await fetch(`${pbUrl}/api/collections/expedientes/records?perPage=500`, reqOpts);
  const data = await getRecs.json();
  const items = data.items || [];

  console.log(`Normalizing ${items.length} records...`);

  for (const item of items) {
    let update = {};
    let changed = false;

    // Normalize tramite
    if (item.tramite && item.tramite !== item.tramite.toUpperCase()) {
      update.tramite = item.tramite.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace("OBTENCION", "OBTENCIÓN").replace("REVALIDACION", "REVALIDACIÓN").replace("RECATEGORIZACION", "RECATEGORIZACIÓN");
      changed = true;
    }

    // Normalize lugar_entrega
    if (item.lugar_entrega && item.lugar_entrega !== item.lugar_entrega.toUpperCase()) {
      update.lugar_entrega = item.lugar_entrega.toUpperCase();
      changed = true;
    }

    if (changed) {
      console.log(`Updating record ${item.id}:`, update);
      await fetch(`${pbUrl}/api/collections/expedientes/records/${item.id}`, {
        method: 'PATCH',
        ...reqOpts,
        body: JSON.stringify(update)
      });
    }
  }
  console.log("Normalization complete.");
}
main();
