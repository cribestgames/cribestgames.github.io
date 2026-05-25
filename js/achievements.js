window.achievementsSupabase =
  window.supabase.createClient(
    'https://ysffeiaeuuuhfxkwtumt.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZmZlaWFldXV1aGZ4a3d0dW10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NTY3NjgsImV4cCI6MjA5MzEzMjc2OH0.fLCVXeNcUsycEiUlelLYwJQ4AGmG_MiL8ri2i5SXlmg'
  );



// SBLOCCA ACHIEVEMENT

window.unlockAchievement =
async function(game, achievement) {

  const {
    data: { session }
  } = await achievementsSupabase
    .auth
    .getSession();



  // non loggato

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
    .maybeSingle();



  // già sbloccato

  if (existing) return;



  // salva su supabase

  await achievementsSupabase
    .from('unlocked_achievements')
    .insert({

      user_id: userId,

      game: game,

      achievement: achievement

    });



  // popup

  showAchievementPopup(
    game,
    achievement
  );



  console.log(
    'Achievement unlocked:',
    achievement
  );

};



// POPUP

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



  // posizione

  iframe.style.position =
    'fixed';

  iframe.style.top =
    '20px';

  iframe.style.right =
    '20px';



  // dimensioni REALI popup

  iframe.style.width =
    '420px';

  iframe.style.height =
    '140px';



  iframe.style.border =
    'none';

  iframe.style.background =
    'transparent';



  // importante

  iframe.style.pointerEvents =
    'none';



  // z-index alto

  iframe.style.zIndex =
    '999999';



  document.body.appendChild(
    iframe
  );



  // dopo 5 sec abbassa z-index
  // così il gioco torna sopra

  setTimeout(() => {

    iframe.style.zIndex = '-1';

  }, 5000);



  // dopo 6 sec elimina

  setTimeout(() => {

    iframe.remove();

  }, 6000);

};



// chiusura popup

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
