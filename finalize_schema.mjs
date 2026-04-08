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

  const getCols = await fetch(`${pbUrl}/api/collections`, { headers: { 'Authorization': `Bearer ${token}` } });
  const allCols = (await getCols.json()).items || [];
  const getColId = (name) => allCols.find(c => c.name === name)?.id;
  const ESTADOS = ['EN PROCESO', 'IMPRESO', 'VERIFICADO', 'ENTREGADO', 'OBSERVADO', 'RECHAZADO', 'ANULADO', 'ATENDIDO'];

  // Expedientes
  const expId = getColId('expedientes');
  if (expId) {
      const expCol = allCols.find(c => c.id === expId);
      const estField = expCol.fields.find(f => f.name === 'estado');
      if (estField) {
          estField.type = 'select';
          estField.maxSelect = 1;
          estField.values = ESTADOS;
          await fetch(`${pbUrl}/api/collections/${expId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ fields: expCol.fields })
          });
      }
  }

  // Operadores
  const opId = getColId('operadores');
  if (opId) {
      const opCol = allCols.find(c => c.id === opId);
      const pfField = opCol.fields.find(f => f.name === 'perfil');
      if (pfField) {
          pfField.type = 'select';
          pfField.maxSelect = 1;
          pfField.values = ['REGISTRADOR', 'IMPRESOR', 'SUPERVISOR', 'ENTREGADOR', 'ADMINISTRADOR', 'OTI'];
          await fetch(`${pbUrl}/api/collections/${opId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ fields: opCol.fields })
          });
      }
  }
  
  console.log('Migración de columnas select concluida.');
}
main();
