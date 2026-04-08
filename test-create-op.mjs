import PocketBase from 'pocketbase';

async function testSDK() {
  const pb = new PocketBase('http://161.132.42.78:8088/pb-api');
  
  await pb.collection('operadores').authWithPassword('77776666', 'password123');
  console.log("Logged in as auth:", pb.authStore.model.dni);

  try {
    const list = await pb.collection('operadores').getFullList();
    console.log("getFullList returned", list.length, "items.");
  } catch (e) {
    console.error("SDK error:", e.response ? e.response : e);
  }
}

testSDK();
