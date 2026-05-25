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



  // POPUP

  showAchievementPopup(
    game,
    achievement
  );

};



window.showAchievementPopup =
function(game, achievement) {

  // rimuove popup precedente

  const oldPopup =
    document.getElementById(
      'achievement-popup'
    );

  if (oldPopup) {
    oldPopup.remove();
  }



  // iframe

  const iframe =
    document.createElement('iframe');



  iframe.id =
    'achievement-popup';



  iframe.src =
    `/achievements/unlocked.html?game=${game}&achievement=${achievement}`;



  iframe.style.position =
    'fixed';

  iframe.style.top =
    '0';

  iframe.style.left =
    '0';

  iframe.style.width =
    '100%';

  iframe.style.height =
    '100%';

  iframe.style.border =
    'none';

  iframe.style.pointerEvents =
    'none';

  iframe.style.zIndex =
    '999999';



  document.body.appendChild(
    iframe
  );

};



// chiude popup

window.addEventListener(
  'message',
  event => {

    if (
      event.data ===
      'achievement-close'
    ) {

      const popup =
        document.getElementById(
          'achievement-popup'
        );

      if (popup) {
        popup.remove();
      }

    }

  }
);
