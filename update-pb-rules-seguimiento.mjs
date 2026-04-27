const pbUrl = 'https://lic.transportespuno.gob.pe/pb-api';
const email = 'admin@transportespuno.com';
const password = 'Unodostres123';

async function main() {
  console.log("Connecting to PocketBase...");
  const authRes = await fetch(`${pbUrl}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password })
  });
  
  if (!authRes.ok) {
    console.error("Auth failed:", await authRes.text());
    return;
  }
  
  const { token } = await authRes.json();
  const reqOpts = { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } };
  
  // 1. Update 'expedientes' rules
  console.log("Patching 'expedientes' collection rules...");
  await fetch(`${pbUrl}/api/collections/expedientes`, {
      method: 'PATCH', ...reqOpts,
      body: JSON.stringify({
          viewRule: "", // Public read by ID
          listRule: "@request.auth.id != '' || (dni_solicitante != '')" // Allow public list if filtered by DNI
      })
  });

  // 2. Update 'historial_acciones' rules
  console.log("Patching 'historial_acciones' collection rules...");
  await fetch(`${pbUrl}/api/collections/historial_acciones`, {
      method: 'PATCH', ...reqOpts,
      body: JSON.stringify({
          viewRule: "", // Public read by ID
          listRule: "" // Public list (the service filters by expediente_id)
      })
  });

  console.log("✔ Rules updated successfully. Public tracking is now enabled.");
}

main().catch(console.error);
