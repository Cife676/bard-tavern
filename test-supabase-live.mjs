import { createClient } from '@supabase/supabase-js';

const url = 'https://stqlfbdbasybrxiqfkkc.supabase.co';
const key = 'sb_publishable_xUtckmaQ6yuxbJpC3ZGz8A_6ZNE9zNk';

const supabase = createClient(url, key);

async function checkLobbies() {
  console.log('Testing lobbies SELECT from Supabase...');
  const { data, error } = await supabase.from('lobbies').select('*');
  if (error) {
    console.log('SELECT_ERROR:', error);
  } else {
    console.log('SELECT_SUCCESS, found count:', data.length);
    console.log('Lobbies:', data);
  }

  console.log('Testing lobbies INSERT...');
  const testCode = 'TAV-' + Math.floor(1000 + Math.random() * 9000);
  const { data: insertData, error: insertError } = await supabase
    .from('lobbies')
    .insert({
      code: testCode,
      name: 'City Connect Test Room',
      host_session_id: 'test-session-' + Date.now(),
      host_name: 'Test Explorer',
      status: 'active',
      playback_updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (insertError) {
    console.log('INSERT_ERROR:', insertError);
  } else {
    console.log('INSERT_SUCCESS, created id:', insertData.id, 'code:', insertData.code);
    // Delete test room
    await supabase.from('lobbies').delete().eq('id', insertData.id);
    console.log('CLEANUP_SUCCESS');
  }
}

checkLobbies();
