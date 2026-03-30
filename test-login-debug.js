const http = require('http');

async function testLogin(path, identity, password) {
  const data = JSON.stringify({ identity, password });
  const options = {
    hostname: 'localhost',
    port: 8095,
    path: path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body || '{}') }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('--- TEST ADMIN LOGIN ---');
  // Try both old and new PB paths for admin
  let resAdmin = await testLogin('/api/admins/auth-with-password', 'admin@drtc.local', 'admin123456');
  console.log('Path /api/admins/auth-with-password:', resAdmin.status);
  
  if (resAdmin.status !== 200) {
    resAdmin = await testLogin('/api/collections/_superusers/auth-with-password', 'admin@drtc.local', 'admin123456');
    console.log('Path /api/collections/_superusers/auth-with-password:', resAdmin.status);
  }

  console.log('--- TEST OPERADOR LOGIN ---');
  const resOp = await testLogin('/api/collections/operadores/auth-with-password', '12345678', 'admin1234');
  console.log('Path /api/collections/operadores/auth-with-password:', resOp.status, resOp.body.message || '');
}

run();
