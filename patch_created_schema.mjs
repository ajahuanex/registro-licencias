const pbUrl = 'http://161.132.42.78:8088/pb-api';
const email = 'admin@transportespuno.com';
const password = 'Unodostres123';

async function main() {
  const authRes = await fetch(`${pbUrl}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password })
  });
  const { token } = await authRes.json();

  const getCols = await fetch(`${pbUrl}/api/collections/historial_acciones`, { 
      headers: { 'Authorization': `Bearer ${token}` } 
  });
  const col = await getCols.json();
  
  // Filter out any existing created/updated to be safe
  col.fields = col.fields.filter(f => f.name !== 'created' && f.name !== 'updated');
  
  // Create system autodate fields as per PB v0.23 syntax
  const createdField = {
    "hidden": false,
    "name": "created",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "autodate",
    "onCreate": true,
    "onUpdate": false
  };
  
  const updatedField = {
    "hidden": false,
    "name": "updated",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "autodate",
    "onCreate": true,
    "onUpdate": true
  };
  
  // Append fields
  col.fields.push(createdField, updatedField);

  console.log("Patching collection with new fields...");
  const patchRes = await fetch(`${pbUrl}/api/collections/${col.id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields: col.fields })
  });

  if (!patchRes.ok) {
    const error = await patchRes.json();
    console.error("Failed to patch collection:", JSON.stringify(error, null, 2));
    return;
  }
  
  console.log("Successfully patched historial_acciones schema to restore autodate timestamps.");
}

main().catch(console.error);
