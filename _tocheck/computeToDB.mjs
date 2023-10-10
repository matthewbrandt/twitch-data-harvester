import dotenv from 'dotenv';
dotenv.config();
import pkg from 'pg';
const { Pool } = pkg;

// open up the pool for swimming in the data
const pool = new Pool({
  user: 'postgres',
  host: 'containers-us-west-13.railway.app',
  database: 'jin',
  password: process.env.POSTGRES_PW,
  port: 7906
});

async function computeMetrics() {
    //SELECT * FROM table
}

async function getUserData() {
    let userArr = [];
    
    // get chatters (users currently in chat)
    const myChatters = await getChatters();

    // write chatters to postgres
    await writeChatterData(myChatters);
      
    // pool is now closed, too many sharks
    //pool.end();
    return;
  };

// setInterval(function(){ 
//   getUserData();
// }, 10000);
getUserData();