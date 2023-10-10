import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import pkg from 'pg';
const { Pool } = pkg;
import split from 'just-split';

// TODO: define broadcaster id based on twitch auth given by user
const broadcaster_id = '556670211';
const broadcaster_name = 'matty_twoshoes'

// open up the pool for swimming in the data
const pool = new Pool({
  user: 'postgres',
  host: 'containers-us-west-13.railway.app',
  database: 'jin',
  password: process.env.POSTGRES_PW,
  port: 7906
});

async function checkUserDB() {
  let readQuery;
  
  readQuery = `SELECT ARRAY_AGG(chatter) AS chatter_array
  FROM (
       SELECT DISTINCT
              BTRIM(JSONB_ARRAY_ELEMENTS(chatters)::VARCHAR,'"') AS chatter
       FROM twitch_chatters AS tc
           ) AS tc
  LEFT JOIN twitch_users_meta AS tu ON tu.login = tc.chatter
  LEFT JOIN twitch_users_deprecated AS td ON td.login = tc.chatter
  WHERE tc.chatter IS NOT NULL
    AND tu.login IS NULL
    AND td.login IS NULL;`

  try {
    let res = await pool.query(readQuery);
    return res.rows[0].chatter_array;
    } catch (err) {
      console.log(err.stack)
    }
}

async function getUsers(users) {
        
  // twitch accepts a max of 100 users per batch
  let splitArray = split(users,100);
  let temp = splitArray[0];
  console.log(temp);

  try {
      const res = await axios.create({
          baseURL: 'https://streamymcstreamyface.up.railway.app/api/twitch/helix/users',
          headers: {
              'Authorization': 'TOKEN ' + process.env.TAU_TOKEN,
          },
          params: {
          login: temp
          }
      })
      const get = await res.get();
      console.log(get.data.data);
      return get.data.data;
  }

  catch (error) {
      console.error(error);
  }
}

async function writeUsersData(users) {
  
  let userMap = users.map(item => ([item.id,item.login,item.broadcaster_type,item.view_count,item.created_at]));

  userMap.forEach(userRow => {
      // console.log(userRow);
      try {
        let arr = JSON.stringify(userRow);
        let insertQuery = `INSERT INTO twitch_users_raw (user_array) VALUES('${arr}')`;
        console.log(insertQuery);
        let conn = pool.query(insertQuery);
        return;
      } catch (err) {
        console.log(err.stack)
      }
    })
}

async function getUserData() {   
    // get all the users from the DB to look up
    const lookupUsers = await checkUserDB();

    // check to make sure we have any to look up at all
    if (lookupUsers !==  null) {
      // get users from Twitch API
      const myUsers = await getUsers(lookupUsers);

      // write chatters to postgres
      await writeUsersData(myUsers);
    }
      
    // pool is now closed, too many sharks
    //pool.end();
    return;
  };

// setInterval(function(){ 
//   getUserData();
// }, 10000);
getUserData();