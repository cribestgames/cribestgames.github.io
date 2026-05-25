window.achievementsSupabase =
  window.supabase.createClient(
    'https://ysffeiaeuuuhfxkwtumt.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZmZlaWFldXV1aGZ4a3d0dW10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NTY3NjgsImV4cCI6MjA5MzEzMjc2OH0.fLCVXeNcUsycEiUlelLYwJQ4AGmG_MiL8ri2i5SXlmg'
  );



window.unlockAchievement =
async function(game, achievement) {

  const {
    data: { session }
  } = await achievementsSupabase
    .auth
    .getSession();

  if (!session) return;

  const userId =
    session.user.id;



  // controlla se già esiste

  const {
    data: existing
  } = await achievementsSupabase
    .from('unlocked_achievements')
    .select('*')
    .eq('user_id', userId)
    .eq('game', game)
    .eq('achievement', achievement)
    .single();



  if (existing) return;



  // salva

  await achievementsSupabase
    .from('unlocked_achievements')
    .insert({

      user_id: userId,

      game: game,

      achievement: achievement

    });



  console.log(
    'Achievement unlocked:',
    achievement
  );

};
