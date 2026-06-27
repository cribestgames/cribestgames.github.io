// ╔══════════════════════════════════════════════════════════════╗
// ║  CribestGames — SmartStorage                                 ║
// ║  Salva su localStorage sempre.                               ║
// ║  Se l'utente è loggato, sincronizza anche su Supabase.       ║
// ║  Debounce 3s per chiave: manda solo l'ultimo valore.         ║
// ╚══════════════════════════════════════════════════════════════╝

(function () {

  // ── Config Supabase (stessa del resto del sito) ──────────────
  const SUPABASE_URL = "https://ysffeiaeuuuhfxkwtumt.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZmZlaWFldXV1aGZ4a3d0dW10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NTY3NjgsImV4cCI6MjA5MzEzMjc2OH0.fLCVXeNcUsycEiUlelLYwJQ4AGmG_MiL8ri2i5SXlmg";
  const DEBOUNCE_MS  = 3000; // attesa prima di mandare al server

  // ── Stato interno ─────────────────────────────────────────────
  let _supabase   = null;   // client Supabase (inizializzato lazy)
  let _session    = null;   // sessione corrente (null = non loggato)
  let _ready      = false;  // true dopo init()
  let _pendingSync = {};    // { key: { value, timer } }

  // ── Inizializza (chiamata automatica all'avvio) ───────────────
  async function init() {
    // Aspetta che window.supabase sia disponibile (caricato dal CDN)
    if (typeof window.supabase === "undefined") {
      // Se il CDN non è ancora caricato, riprova tra 100ms
      setTimeout(init, 100);
      return;
    }

    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data } = await _supabase.auth.getSession();
    _session = data?.session ?? null;

    // Aggiorna la sessione in tempo reale (login/logout da un'altra scheda)
    _supabase.auth.onAuthStateChange((_event, session) => {
      _session = session;
      if (session) {
        // Appena loggato: carica i dati cloud (priorità al server)
        _loadFromCloud();
      }
    });

    if (_session) {
      await _loadFromCloud();
    }

    _ready = true;
  }

  // ── Carica tutti i dati dell'utente dal cloud → localStorage ─
  async function _loadFromCloud() {
    if (!_session) return;

    const userId = _session.user.id;

    const { data, error } = await _supabase
      .from("game_storage")
      .select("key, value")
      .eq("user_id", userId);

    if (error) {
      console.warn("[SmartStorage] Errore caricamento cloud:", error.message);
      return;
    }

    if (data && data.length > 0) {
      data.forEach(row => {
        // Sovrascrive localStorage con i dati del server
        window._originalLS.setItem(row.key, row.value);
      });
      console.log(`[SmartStorage] Caricati ${data.length} valori dal cloud.`);
    }
  }

  // ── Salva su Supabase (upsert) ────────────────────────────────
  async function _syncToCloud(key, value) {
    if (!_session) return;

    const userId = _session.user.id;

    const { error } = await _supabase
      .from("game_storage")
      .upsert(
        { user_id: userId, key: key, value: value },
        { onConflict: "user_id,key" }
      );

    if (error) {
      console.warn("[SmartStorage] Errore sync cloud:", key, error.message);
    } else {
      console.log("[SmartStorage] Sincronizzato:", key);
    }
  }

  // ── Schedula un sync con debounce ─────────────────────────────
  // Se la stessa chiave viene aggiornata più volte in 3s,
  // viene mandato solo l'ULTIMO valore.
  function _scheduleSync(key, value) {
    if (!_session) return;

    // Cancella il timer precedente per questa chiave (se esiste)
    if (_pendingSync[key]) {
      clearTimeout(_pendingSync[key].timer);
    }

    // Imposta nuovo timer
    _pendingSync[key] = {
      value: value,
      timer: setTimeout(() => {
        const latest = _pendingSync[key]?.value;
        delete _pendingSync[key];
        _syncToCloud(key, latest);
      }, DEBOUNCE_MS)
    };
  }

  // ── Patch di localStorage ─────────────────────────────────────
  // Salva il riferimento originale
  window._originalLS = {
    setItem:    (k, v) => localStorage.setItem(k, v),
    getItem:    (k)    => localStorage.getItem(k),
    removeItem: (k)    => localStorage.removeItem(k),
    clear:      ()     => localStorage.clear(),
  };

  // Proxy: intercetta tutte le chiamate a localStorage
  const _lsProxy = {
    setItem(key, value) {
      // 1. Salva sempre su localStorage (funziona anche offline)
      window._originalLS.setItem(key, value);
      // 2. Se loggato, schedula sync cloud con debounce
      if (_session) {
        _scheduleSync(key, String(value));
      }
    },

    getItem(key) {
      // Legge sempre da localStorage (già sincronizzato all'avvio)
      return window._originalLS.getItem(key);
    },

    removeItem(key) {
      window._originalLS.removeItem(key);
      // Cancella eventuale sync pendente
      if (_pendingSync[key]) {
        clearTimeout(_pendingSync[key].timer);
        delete _pendingSync[key];
      }
      // Rimuove anche dal cloud
      if (_session) {
        _supabase
          .from("game_storage")
          .delete()
          .match({ user_id: _session.user.id, key })
          .then(({ error }) => {
            if (error) console.warn("[SmartStorage] Errore rimozione cloud:", error.message);
          });
      }
    },

    clear() {
      window._originalLS.clear();
      // Svuota tutti i timer pendenti
      Object.values(_pendingSync).forEach(p => clearTimeout(p.timer));
      _pendingSync = {};
      // Rimuove tutti i dati dal cloud
      if (_session) {
        _supabase
          .from("game_storage")
          .delete()
          .eq("user_id", _session.user.id)
          .then(({ error }) => {
            if (error) console.warn("[SmartStorage] Errore clear cloud:", error.message);
          });
      }
    },

    // Espone anche key() e length per compatibilità completa
    key(index) {
      return localStorage.key(index);
    },

    get length() {
      return localStorage.length;
    }
  };

  // Sovrascrive window.localStorage con il proxy
  Object.defineProperty(window, "localStorage", {
    value: _lsProxy,
    configurable: true,
    writable: false,
  });

  // ── API pubblica ──────────────────────────────────────────────
  window.SmartStorage = {
    /** Forza sincronizzazione immediata di tutti i valori pendenti */
    flushAll() {
      Object.keys(_pendingSync).forEach(key => {
        clearTimeout(_pendingSync[key].timer);
        const value = _pendingSync[key].value;
        delete _pendingSync[key];
        _syncToCloud(key, value);
      });
    },

    /** Ritorna true se l'utente è loggato e la sync è attiva */
    isCloudEnabled() {
      return !!_session;
    },

    /** Ritorna la sessione corrente (o null) */
    getSession() {
      return _session;
    }
  };

  // ── Avvia ─────────────────────────────────────────────────────
  init();

})();
