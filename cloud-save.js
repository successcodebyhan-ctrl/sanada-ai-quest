// ── 雲端存檔層（Supabase）──────────────────────────────
// 負責：登入/註冊、把 localStorage 進度同步到雲端、跨裝置拉回較新進度。
// 與遊戲的橋接透過 window.SanadaGame（定義於 game.js）。
(function(){
  const cfg = window.SUPABASE_CONFIG || {};
  const configured = cfg.url && cfg.anonKey
    && !cfg.url.includes('貼上') && !cfg.anonKey.includes('貼上');

  let sb = null;          // Supabase client
  let currentUser = null; // 已登入的使用者
  let pushTimer = null;   // debounce 計時器

  // ── DOM 介面元素 ──
  const $ = id => document.getElementById(id);
  const overlay = $('auth-overlay');
  const statusBar = $('auth-status');

  function showOverlay(show){ if(overlay) overlay.style.display = show ? 'flex' : 'none'; }
  function setError(msg){ const e=$('auth-error'); if(e) e.textContent = msg || ''; }
  function setBusy(busy){
    document.querySelectorAll('#auth-overlay button, #auth-overlay input')
      .forEach(el => el.disabled = busy);
  }

  function updateStatusBar(){
    if(!statusBar) return;
    if(currentUser){
      statusBar.innerHTML = '☁ ' + currentUser.email + ' <button id="auth-logout">登出</button>';
      statusBar.style.display = 'block';
      const lo = $('auth-logout');
      if(lo) lo.onclick = signOut;
    } else {
      statusBar.style.display = 'none';
    }
  }

  // ── 雲端讀寫 ──
  async function pull(){
    if(!sb || !currentUser) return null;
    const { data, error } = await sb
      .from('game_saves')
      .select('data')
      .eq('user_id', currentUser.id)
      .maybeSingle();
    if(error){ console.warn('雲端讀取失敗', error.message); return null; }
    return data ? data.data : null;
  }

  async function push(saveData){
    if(!sb || !currentUser) return;
    const { error } = await sb
      .from('game_saves')
      .upsert({
        user_id: currentUser.id,
        data: saveData,
        updated_at: new Date().toISOString()
      });
    if(error) console.warn('雲端上傳失敗', error.message);
  }

  // 登入後合併：以 updatedAt 較新者為準
  async function syncAfterLogin(){
    const local = window.SanadaGame ? window.SanadaGame.getLocalData() : null;
    const cloud = await pull();
    if(!cloud){
      // 雲端還沒有存檔 → 上傳本機進度
      if(local) await push(local);
    } else if(!local || (cloud.updatedAt||0) >= (local.updatedAt||0)){
      // 雲端較新 → 套用到遊戲
      if(window.SanadaGame) window.SanadaGame.applyCloudData(cloud);
    } else {
      // 本機較新 → 上傳
      await push(local);
    }
  }

  // 切回分頁/視窗時，從雲端重抓一次，若雲端較新就套用（接近即時同步）
  async function refreshFromCloud(){
    if(!sb || !currentUser) return;
    const cloud = await pull();
    if(!cloud) return;
    const local = window.SanadaGame ? window.SanadaGame.getLocalData() : null;
    if(!local || (cloud.updatedAt||0) > (local.updatedAt||0)){
      if(window.SanadaGame) window.SanadaGame.applyCloudData(cloud);
    }
  }

  // ── 對外：本機每次存檔時被 game.js 呼叫，debounce 後上傳 ──
  function onLocalSave(saveData){
    if(!sb || !currentUser) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => push(saveData), 1200);
  }

  // ── 認證 ──
  async function signIn(email, password){
    setError(''); setBusy(true);
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    setBusy(false);
    if(error){ setError('登入失敗：' + translateErr(error.message)); return; }
    await onAuthed(data.user);
  }

  async function signUp(email, password){
    setError(''); setBusy(true);
    const { data, error } = await sb.auth.signUp({ email, password });
    setBusy(false);
    if(error){ setError('註冊失敗：' + translateErr(error.message)); return; }
    if(data.user && !data.session){
      // 專案開啟了 email 驗證 → 需收信確認
      setError('註冊成功！請到信箱點擊驗證連結後再登入。');
      return;
    }
    await onAuthed(data.user);
  }

  async function signOut(){
    if(sb) await sb.auth.signOut();
    currentUser = null;
    updateStatusBar();
    showOverlay(true);
  }

  async function onAuthed(user){
    currentUser = user;
    showOverlay(false);
    updateStatusBar();
    await syncAfterLogin();
  }

  function translateErr(msg){
    if(/Invalid login credentials/i.test(msg)) return 'Email 或密碼錯誤';
    if(/already registered/i.test(msg)) return '此 Email 已註冊，請直接登入';
    if(/Password should be at least/i.test(msg)) return '密碼至少需 6 個字元';
    if(/valid email/i.test(msg)) return 'Email 格式不正確';
    return msg;
  }

  function playAsGuest(){
    showOverlay(false);
    if(statusBar){
      statusBar.innerHTML = '👤 訪客（進度僅存本機）<button id="auth-login-link">登入同步</button>';
      statusBar.style.display = 'block';
      const ll = $('auth-login-link');
      if(ll) ll.onclick = () => showOverlay(true);
    }
  }

  // ── 綁定 UI 事件 ──
  function bindUI(){
    const emailEl = $('auth-email'), pwEl = $('auth-password');
    const getCreds = () => [ (emailEl.value||'').trim(), pwEl.value||'' ];
    const loginBtn = $('auth-login-btn');
    const signupBtn = $('auth-signup-btn');
    const guestBtn = $('auth-guest-btn');
    if(loginBtn) loginBtn.onclick = () => { const [e,p]=getCreds(); signIn(e,p); };
    if(signupBtn) signupBtn.onclick = () => { const [e,p]=getCreds(); signUp(e,p); };
    if(guestBtn) guestBtn.onclick = playAsGuest;
    // Enter 鍵直接登入
    [emailEl, pwEl].forEach(el => el && el.addEventListener('keydown', ev => {
      if(ev.key === 'Enter'){ const [e,p]=getCreds(); signIn(e,p); }
    }));
  }

  // ── 初始化 ──
  async function init(){
    bindUI();
    if(!configured){
      // 尚未填 Supabase 設定 → 退回純本機模式，不擋遊戲
      console.warn('未設定 Supabase（supabase-config.js），以純本機模式運行。');
      playAsGuest();
      if(statusBar) statusBar.innerHTML = '👤 訪客（尚未設定雲端）';
      return;
    }
    if(!window.supabase){
      console.warn('Supabase SDK 未載入，以純本機模式運行。');
      playAsGuest();
      return;
    }
    sb = window.supabase.createClient(cfg.url, cfg.anonKey);
    // 切回此分頁時自動重抓雲端進度
    document.addEventListener('visibilitychange', () => {
      if(!document.hidden) refreshFromCloud();
    });
    // 已有登入工作階段（session 會自動持久化）→ 直接進遊戲
    const { data:{ session } } = await sb.auth.getSession();
    if(session && session.user){
      await onAuthed(session.user);
    } else {
      showOverlay(true);
    }
  }

  // 對外 API
  window.CloudSave = {
    onLocalSave,
    isLoggedIn: () => !!currentUser,
    userEmail: () => currentUser ? currentUser.email : null,
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
