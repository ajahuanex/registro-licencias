const PocketBase = require('pocketbase/cjs');
const readline = require('readline');

const pb = new PocketBase('http://127.0.0.1:8090');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('=== Inicializador de Base de Datos PocketBase (DRTC Puno) ===\n');
  
  const email = await question('Email del Administrador de PocketBase: ');
  const password = await question('Contraseña del Administrador: ');
  
  console.log('\nAutenticando...');
  try {
    await pb.admins.authWithPassword(email, password);
    console.log('✅ Autenticado correctamente como Admin.\n');
  } catch (err) {
    console.error('❌ Error de autenticación. Verifica las credenciales.');
    process.exit(1);
  }

  // 1. UPDATE OPERADORES (Add 'perfil' if missing)
  try {
    const operadoresCol = await pb.collections.getOne('operadores');
    const hasPerfil = operadoresCol.schema.some(f => f.name === 'perfil');
    if (!hasPerfil) {
      console.log('⏳ Añadiendo campo "perfil" a la colección operadores...');
      operadoresCol.schema.push({
        system: false,
        id: "pefr123l",
        name: "perfil",
        type: "select",
        required: true,
        presentable: false,
        unique: false,
        options: {
          maxSelect: 1,
          values: ["REGISTRADOR", "SUPERVISOR", "ADMINISTRADOR", "OTI", "ENTREGADOR"]
        }
      });
      operadoresCol.viewRule = "@request.auth.id != ''"; // Make it readable
      await pb.collections.update('operadores', operadoresCol);
      console.log('✅ Colección "operadores" actualizada exitosamente.');
    } else {
      console.log('✅ Colección "operadores" ya tiene el campo perfil.');
    }
  } catch (e) {
    console.log('❌ Error chequeando "operadores":', e.message);
  }

  // 2. UPDATE EXPEDIENTES (Add 'estado' if missing from pb_schema)
  try {
    const expedientesCol = await pb.collections.getOne('expedientes');
    const hasEstado = expedientesCol.schema.some(f => f.name === 'estado');
    if (!hasEstado) {
      console.log('⏳ Añadiendo campo "estado" a la colección expedientes...');
      expedientesCol.schema.push({
        system: false,
        id: "est456do",
        name: "estado",
        type: "select",
        required: true,
        presentable: false,
        unique: false,
        options: {
          maxSelect: 1,
          values: ["EN PROCESO", "VERIFICADO", "ATENDIDO", "ENTREGADO", "OBSERVADO", "RECHAZADO", "ANULADO"]
        }
      });
      await pb.collections.update('expedientes', expedientesCol);
      console.log('✅ Colección "expedientes" actualizada con campo estado.');
    } else {
      console.log('✅ Colección "expedientes" ya tiene el campo estado.');
    }
  } catch (e) {
    console.log('❌ Error chequeando "expedientes":', e.message);
  }

  // 3. CREATE HISTORIAL_EXPEDIENTES
  try {
    await pb.collections.getOne('historial_expedientes');
    console.log('✅ Colección "historial_expedientes" ya existe.');
  } catch (e) {
    if (e.status === 404) {
      console.log('⏳ Creando colección "historial_expedientes"...');
      await pb.collections.create({
        name: 'historial_expedientes',
        type: 'base',
        schema: [
          {
            name: 'expediente',
            type: 'relation',
            required: true,
            options: { collectionId: 'zxcvbnmasdfghjk', maxSelect: 1 }
          },
          {
            name: 'modificado_por',
            type: 'relation',
            required: true,
            options: { collectionId: 'q1w2e3r4t5y6u7i', maxSelect: 1 }
          },
          { name: 'accion', type: 'text', required: true },
          { name: 'detalles', type: 'text', required: false },
          { name: 'fecha', type: 'date', required: true }
        ],
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''"
      });
      console.log('✅ Colección "historial_expedientes" creada exitosamente.');
    } else {
      console.log('❌ Error al acceder a historial_expedientes:', e.message);
    }
  }

  console.log('\n🎉 ¡Inicialización Completada! Todo listo.');
  process.exit(0);
}

main();
