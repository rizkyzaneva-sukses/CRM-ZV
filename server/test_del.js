const { Client } = require('pg');
require('dotenv').config({path:'../.env'});

async function run() {
  const c = new Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  try {
    console.log('Testing delete orders');
    await c.query('DELETE FROM orders');
    console.log('Testing delete customers');
    await c.query('DELETE FROM customers');
    console.log('Testing delete products');
    await c.query('DELETE FROM products');
  } catch(e) {
    console.error(e.message);
  }
  await c.end();
}
run();
