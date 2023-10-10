import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import pkg from 'pg';
const { Pool } = pkg;

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

async function getStreamInfo() {
    try {
        const res = await axios.create({
            baseURL: 'https://streamymcstreamyface.up.railway.app/api/twitch/helix/streams',
            headers: {
                'Authorization': 'TOKEN ' + process.env.TAU_TOKEN,
            },
            params: {
            user_id: broadcaster_id,
            }
        })
        const get = await res.get();
        //console.log(get.data.data.length);
        return get.data.data;
    }

    catch (error) {
        console.error(error);
    }
}

async function writeStreamData(data) {
    let streamData = JSON.stringify(data);
    let insertData = `INSERT INTO twitch_stream_raw (stream_data) VALUES('${streamData}')`;
    try {
        const res = await pool.query(insertData);
        console.log("stream data written into twitch_stream_raw");
        return;
    } catch (err) {
      console.log(err.stack)
    }
  }

async function cleanStreamData() {
    const query = {
        name: 'raw_stream_cleaned',
        text: `WITH stream_data AS (
            SELECT uuid AS twitch_stream_raw_uuid,
                   NOW() AS inserted_at,
                   JSONB_ARRAY_ELEMENTS(stream_data)->>'id' AS stream_id,
                   JSONB_ARRAY_ELEMENTS(stream_data)->>'user_id' AS broadcaster_id,
                   JSONB_ARRAY_ELEMENTS(stream_data)->>'user_name' AS broadcaster_display_name,
                   JSONB_ARRAY_ELEMENTS(stream_data)->>'user_login' AS broadcaster_user_name,
                   JSONB_ARRAY_ELEMENTS(stream_data)->>'type' AS type,
                   JSONB_ARRAY_ELEMENTS(stream_data)->>'title' AS title,
                   JSONB_ARRAY_ELEMENTS(stream_data)->>'game_id' AS game_id,
                   JSONB_ARRAY_ELEMENTS(stream_data)->>'game_name' AS game_name,
                   JSONB_ARRAY_ELEMENTS(stream_data)->>'tag_ids' AS tag_ids,
                   JSONB_ARRAY_ELEMENTS(stream_data)->>'language' AS language,
                   JSONB_ARRAY_ELEMENTS(stream_data)->>'is_mature' AS is_mature,
                   JSONB_ARRAY_ELEMENTS(stream_data)->>'started_at' AS started_at,
                   JSONB_ARRAY_ELEMENTS(stream_data)->>'viewer_count' AS viewer_count,
                   JSONB_ARRAY_ELEMENTS(stream_data)->>'thumbnail_url' AS thumbnail_url
            FROM twitch_stream_raw
            WHERE uuid NOT IN (SELECT twitch_stream_raw_uuid FROM twitch_stream)
            ORDER BY twitch_stream_raw.inserted_at)
            INSERT INTO public.twitch_stream
            SELECT * FROM stream_data;`
      }
      try {
        const res = await pool.query(query);
        console.log("twitch_stream_raw data cleaned");
        return;
    } catch (err) {
      console.log(err.stack)
    }
}

async function processStreamData() {
    // get chatters (users currently in chat)
    const data = await getStreamInfo();

    // write stream data to postgres if array is present (stream is live)
    if (data.length > 0) {
        await writeStreamData(data);
    }
    else { console.log("no data written, stream isn't live") }

    await cleanStreamData();
    
    // pool is now closed, too many sharks
    pool.end();
    return;
};

processStreamData();