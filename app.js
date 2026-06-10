/* ============================================================
   MATH 24 — Main Application Logic
   ============================================================ */

// ===== DATA LAYER (LocalStorage) =====
const DB = {
  getUsers()       { return JSON.parse(localStorage.getItem('m24_users')    || '[]'); },
  saveUsers(u)     { localStorage.setItem('m24_users', JSON.stringify(u)); },
  getSession()     { return JSON.parse(localStorage.getItem('m24_session')  || 'null'); },
  saveSession(s)   { localStorage.setItem('m24_session', JSON.stringify(s)); },
  clearSession()   { localStorage.removeItem('m24_session'); },
  getWeekStart()   { return localStorage.getItem('m24_weekStart') || null; },
  saveWeekStart(t) { localStorage.setItem('m24_weekStart', t); },
};

// ===== LEVEL SYSTEM =====
const LEVELS = [
  { min:0,    label:'🌱 มือใหม่',      next:50  },
  { min:50,   label:'⚡ นักคำนวณ',     next:150 },
  { min:150,  label:'🔥 นักคิด',        next:350 },
  { min:350,  label:'💡 อัจฉริยะ',     next:700 },
  { min:700,  label:'🌟 ผู้เชี่ยวชาญ', next:1200},
  { min:1200, label:'🏆 ตำนาน',         next:Infinity },
];
function getLevel(totalPts) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalPts >= LEVELS[i].min) return { ...LEVELS[i], tier: i };
  }
  return { ...LEVELS[0], tier: 0 };
}

// ===== WEEKLY RESET =====
function checkWeeklyReset() {
  const now = new Date();
  const saved = DB.getWeekStart();
  const lastMonday = getLastMonday(now);

  if (!saved || new Date(saved) < lastMonday) {
    DB.saveWeekStart(lastMonday.toISOString());
    // Reset weekly scores for all users
    const users = DB.getUsers();
    users.forEach(u => { u.weeklyScore = 0; });
    DB.saveUsers(users);
  }
}
function getLastMonday(d) {
  const dt = new Date(d);
  const day = dt.getDay(); // 0=Sun
  const diff = (day === 0 ? 6 : day - 1);
  dt.setDate(dt.getDate() - diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function getNextMonday() {
  const last = new Date(DB.getWeekStart());
  last.setDate(last.getDate() + 7);
  return last;
}
function timeUntil(dt) {
  const diff = dt - Date.now();
  if (diff <= 0) return '00:00:00';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h >= 24) {
    const days = Math.floor(h / 24);
    const hrs  = h % 24;
    return `${days}วัน ${hrs}ชม.`;
  }
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ===== AUTH HELPERS =====
let currentUser = null;

function findUser(username) {
  return DB.getUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
}

function initAdmin() {
  const users = DB.getUsers();
  if (!users.find(u => u.role === 'admin')) {
    users.push({
      id: 'admin_' + Date.now(),
      username: 'admin',
      password: 'admin1234',
      role: 'admin',
      totalScore: 0,
      weeklyScore: 0,
      correctCount: 0,
      wrongCount: 0,
      skipCount: 0,
      joinedAt: new Date().toISOString(),
    });
    DB.saveUsers(users);
  }
}

// ===== FLOATING MATH BG =====
function initMathBg() {
  const syms = ['π','∑','∫','√','∞','∂','Δ','÷','×','±','²','³','α','β','θ','24','=','≠','≈','<','>'];
  const bg = document.getElementById('mathBg');
  for (let i = 0; i < 28; i++) {
    const el = document.createElement('div');
    el.className = 'math-symbol';
    el.textContent = syms[Math.floor(Math.random() * syms.length)];
    el.style.left = Math.random() * 100 + 'vw';
    el.style.animationDuration = (8 + Math.random() * 18) + 's';
    el.style.animationDelay = -(Math.random() * 20) + 's';
    el.style.fontSize = (14 + Math.random() * 42) + 'px';
    bg.appendChild(el);
  }
}

// ===== TOAST =====
let toastTimer;
function showToast(msg, type = 'info') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = `toast ${type}`;
  requestAnimationFrame(() => { el.classList.add('show'); });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// ===== CONFIRM DIALOG =====
function showConfirm(title, msg, onYes) {
  const ov = document.createElement('div');
  ov.className = 'confirm-overlay';
  ov.innerHTML = `
    <div class="confirm-box">
      <h3>${title}</h3>
      <p>${msg}</p>
      <div class="confirm-btns">
        <button class="confirm-no"  id="cNo">ยกเลิก</button>
        <button class="confirm-yes" id="cYes">ยืนยัน</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  document.getElementById('cYes').onclick = () => { document.body.removeChild(ov); onYes(); };
  document.getElementById('cNo').onclick  = () => document.body.removeChild(ov);
}

// ===== SCREEN SWITCHER =====
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ===== AUTH =====
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', (i === 0) === (tab === 'login')));
  document.getElementById('loginForm').classList.toggle('active', tab === 'login');
  document.getElementById('registerForm').classList.toggle('active', tab === 'register');
  document.getElementById('loginError').textContent = '';
  document.getElementById('regError').textContent = '';
}

function login() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const errEl    = document.getElementById('loginError');
  errEl.textContent = '';

  if (!username || !password) { errEl.textContent = 'กรุณากรอกข้อมูลให้ครบ'; return; }
  const user = findUser(username);
  if (!user)              { errEl.textContent = 'ไม่พบชื่อผู้ใช้นี้'; return; }
  if (user.banned)        { errEl.textContent = 'บัญชีนี้ถูกระงับการใช้งาน'; return; }
  if (user.password !== password) { errEl.textContent = 'รหัสผ่านไม่ถูกต้อง'; return; }

  DB.saveSession({ username: user.username });
  currentUser = user;

  if (user.role === 'admin') {
    startAdmin();
  } else {
    startApp();
  }
}

function register() {
  const username = document.getElementById('regUser').value.trim();
  const pass1    = document.getElementById('regPass').value;
  const pass2    = document.getElementById('regPass2').value;
  const errEl    = document.getElementById('regError');
  errEl.textContent = '';

  if (!username || !pass1 || !pass2) { errEl.textContent = 'กรุณากรอกข้อมูลให้ครบ'; return; }
  if (username.length < 3)           { errEl.textContent = 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร'; return; }
  if (!/^[a-zA-Z0-9_ก-๙]+$/.test(username)) { errEl.textContent = 'ชื่อผู้ใช้มีอักขระที่ไม่อนุญาต'; return; }
  if (pass1.length < 4)              { errEl.textContent = 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร'; return; }
  if (pass1 !== pass2)               { errEl.textContent = 'รหัสผ่านไม่ตรงกัน'; return; }
  if (findUser(username))            { errEl.textContent = 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว'; return; }

  const users = DB.getUsers();
  const newUser = {
    id: 'u_' + Date.now(),
    username,
    password: pass1,
    role: 'user',
    totalScore: 0,
    weeklyScore: 0,
    correctCount: 0,
    wrongCount: 0,
    skipCount: 0,
    joinedAt: new Date().toISOString(),
  };
  users.push(newUser);
  DB.saveUsers(users);

  showToast('สมัครสมาชิกสำเร็จ! ยินดีต้อนรับ', 'success');
  DB.saveSession({ username });
  currentUser = newUser;
  setTimeout(startApp, 600);
}

function logout() {
  showConfirm('ออกจากระบบ', 'ต้องการออกจากระบบใช่หรือไม่?', () => {
    currentUser = null;
    DB.clearSession();
    stopGameTimer();
    showScreen('authScreen');
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
  });
}

// ===== START APP =====
function startApp() {
  showScreen('appScreen');
  refreshCurrentUser();
  renderUserBadge();
  showPage('gamePage');
  startNewPuzzle();
  renderOnlinePanel();
  setInterval(renderOnlinePanel, 8000);
  setInterval(updateWeekTimer, 1000);
  updateWeekTimer();
}

function refreshCurrentUser() {
  const all = DB.getUsers();
  currentUser = all.find(u => u.username === currentUser.username);
}

function saveCurrentUser() {
  const users = DB.getUsers();
  const idx   = users.findIndex(u => u.username === currentUser.username);
  if (idx >= 0) users[idx] = currentUser;
  DB.saveUsers(users);
}

// ===== NAV =====
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === pageId);
  });
  if (pageId === 'leaderPage')  renderLeaderboard('weekly');
  if (pageId === 'profilePage') renderProfile();
}

// ===== USER BADGE =====
function renderUserBadge() {
  const lv = getLevel(currentUser.totalScore);
  document.getElementById('userBadge').innerHTML =
    `<span class="badge-level">LV${lv.tier + 1}</span>
     <span>${currentUser.username}</span>`;
}

// ===== ONLINE PANEL (Top 5 Weekly) =====
function renderOnlinePanel() {
  const users = DB.getUsers().filter(u => u.role !== 'admin');
  const top5 = [...users].sort((a, b) => b.weeklyScore - a.weeklyScore).slice(0, 5);
  const rankSyms = ['🥇','🥈','🥉','4️⃣','5️⃣'];
  const rankClasses = ['rank-1','rank-2','rank-3','rank-4','rank-5'];
  document.getElementById('onlineList').innerHTML = top5.length
    ? top5.map((u, i) => `
        <div class="online-item">
          <span class="online-rank ${rankClasses[i]}">${rankSyms[i]}</span>
          <span class="online-name">${escHtml(u.username)}</span>
          <span class="online-pts">${u.weeklyScore}</span>
        </div>`).join('')
    : '<div style="color:var(--text-muted);font-size:0.8rem;text-align:center;padding:8px">ยังไม่มีข้อมูล</div>';
}

function updateWeekTimer() {
  const next = getNextMonday();
  const el   = document.getElementById('weekTimer');
  if (el) el.innerHTML = `⟳ รีเซตใน<br><b>${timeUntil(next)}</b>`;
}

// ===== SCORE DISPLAY =====
function updateScoreDisplay() {
  document.getElementById('weekScore').textContent  = currentUser.weeklyScore  || 0;
  document.getElementById('totalScore').textContent = currentUser.totalScore   || 0;
}

// ============================================================
// GAME ENGINE
// ============================================================

/*
  Calculator-style logic:
  State machine:
    - calcStack: array of { value: number, display: string }  (remaining numbers)
    - calcHistory: steps shown in display  e.g. "3 × 8"
    - currentValue: the running result so far (null = not started)
    - pendingOp: operator waiting for next number (null | '+' | '-' | '*' | '/')
    - remainingNums: indices of puzzle numbers not yet used
    - wrongStreak: how many wrong in a row on this puzzle (max 3)
*/

let puzzle        = [];
let gameTimer     = null;
let elapsedSec    = 0;
let resultVisible = false;
let wrongStreak   = 0;   // wrong attempts on current puzzle

// Calculator state
let remainingNums  = [];   // indices into puzzle[] still available
let currentValue   = null; // running accumulated value (number | null)
let pendingOp      = null; // '+' | '-' | '*' | '/' | null
let historySteps   = [];   // display strings, e.g. ['3', '×', '8', '=', '24', '+', ...]

const PUZZLES_SOLVABLE = generateSolvablePuzzles();

function generateSolvablePuzzles() {
  const set = new Set();
  const nums = Array.from({length: 9}, (_, i) => i + 1);
  for (let a = 0; a < 9; a++)
  for (let b = a; b < 9; b++)
  for (let c = b; c < 9; c++)
  for (let d = c; d < 9; d++) {
    const combo = [nums[a], nums[b], nums[c], nums[d]];
    if (canMake24(combo)) set.add(combo.join(','));
  }
  return [...set].map(s => s.split(',').map(Number));
}

function canMake24(nums) {
  if (nums.length === 1) return Math.abs(nums[0] - 24) < 1e-9;
  for (let i = 0; i < nums.length; i++) {
    for (let j = 0; j < nums.length; j++) {
      if (i === j) continue;
      const rest = nums.filter((_, k) => k !== i && k !== j);
      const a = nums[i], b = nums[j];
      const candidates = [a+b, a-b, a*b];
      if (Math.abs(b) > 1e-9) candidates.push(a / b);
      for (const c of candidates) {
        if (canMake24([...rest, c])) return true;
      }
    }
  }
  return false;
}

// ===== PUZZLE INIT =====
function startNewPuzzle() {
  const pool = PUZZLES_SOLVABLE;
  const base = pool[Math.floor(Math.random() * pool.length)];
  puzzle = [...base].sort(() => Math.random() - 0.5);

  wrongStreak   = 0;
  resultVisible = false;
  resetCalcState();

  renderCards();
  renderNumberButtons();
  renderCalcDisplay();
  updateWrongStreakIndicator();
  document.getElementById('resultPopup').classList.add('hidden');

  stopGameTimer();
  elapsedSec = 0;
  document.getElementById('timerDisplay').textContent = '00:00';
  document.getElementById('potentialScore').textContent = '3';
  gameTimer = setInterval(() => {
    elapsedSec++;
    const m = String(Math.floor(elapsedSec / 60)).padStart(2,'0');
    const s = String(elapsedSec % 60).padStart(2,'0');
    document.getElementById('timerDisplay').textContent = `${m}:${s}`;
    document.getElementById('potentialScore').textContent = calcPotentialScore(elapsedSec);
  }, 1000);

  updateScoreDisplay();
}

function resetCalcState() {
  remainingNums = puzzle.map((_, i) => i);   // all 4 indices available
  currentValue  = null;
  pendingOp     = null;
  historySteps  = [];
}

function stopGameTimer() {
  if (gameTimer) { clearInterval(gameTimer); gameTimer = null; }
}

function calcPotentialScore(sec) {
  if (sec <= 10) return 3;
  if (sec <= 20) return 2;
  return 1;
}

// ===== RENDER =====
function renderCards() {
  document.getElementById('cardsArea').innerHTML = puzzle.map((n, i) => `
    <div class="num-card" id="card${i}" style="animation-delay:${i*0.1}s">${n}</div>
  `).join('');
}

function renderNumberButtons() {
  document.getElementById('numberButtons').innerHTML = puzzle.map((n, i) => `
    <button class="num-btn" id="nbtn${i}" onclick="calcPickNum(${i})"
      ${!remainingNums.includes(i) ? 'disabled class="num-btn used"' : ''}>
      ${n}
    </button>
  `).join('');
}

function renderCalcDisplay() {
  const disp = document.getElementById('exprDisplay');
  if (historySteps.length === 0 && currentValue === null) {
    disp.innerHTML = '<span style="color:var(--text-muted);font-size:0.95rem;">เลือกตัวเลขเพื่อเริ่มต้น</span>';
    return;
  }

  // Build display: history + current pending
  let parts = [...historySteps];
  if (currentValue !== null) {
    // Show pending op if any
    if (pendingOp) {
      parts.push(opSymbol(pendingOp));
    }
    // Show current accumulated value
    parts.push(`<span class="calc-current">${fmtNum(currentValue)}</span>`);
  }
  disp.innerHTML = parts.join(' ');
}

function opSymbol(op) {
  return { '+':'+', '-':'−', '*':'×', '/':'÷' }[op] || op;
}

function fmtNum(n) {
  if (Number.isInteger(n)) return String(n);
  return (+n.toFixed(4)).toString();
}

// ===== CALCULATOR INTERACTION =====

// User picks a number card
function calcPickNum(idx) {
  if (!remainingNums.includes(idx)) return;

  const num = puzzle[idx];

  if (currentValue === null && pendingOp === null) {
    // First number picked — just set as current
    currentValue = num;
    remainingNums = remainingNums.filter(i => i !== idx);
    document.getElementById(`nbtn${idx}`).disabled = true;
    document.getElementById(`nbtn${idx}`).classList.add('used');
    renderCalcDisplay();
    updateOpButtons();
    return;
  }

  if (pendingOp !== null && currentValue !== null) {
    // Apply pending operation: currentValue  op  num
    const a = currentValue;
    const b = num;
    let result;
    if (pendingOp === '/' && Math.abs(b) < 1e-12) {
      showToast('ไม่สามารถหารด้วย 0 ได้', 'error');
      return;
    }
    result = applyOp(a, pendingOp, b);

    // Record step
    historySteps.push(fmtNum(a), opSymbol(pendingOp), fmtNum(b), '=', `<span class="calc-result">${fmtNum(result)}</span>`);

    currentValue = result;
    pendingOp    = null;
    remainingNums = remainingNums.filter(i => i !== idx);
    document.getElementById(`nbtn${idx}`).disabled = true;
    document.getElementById(`nbtn${idx}`).classList.add('used');

    renderCalcDisplay();
    updateOpButtons();

    // If all 4 numbers used up, auto-submit
    if (remainingNums.length === 0) {
      setTimeout(submitAnswer, 150);
    }
    return;
  }

  // pendingOp is null but currentValue is set — need op first
  showToast('เลือกเครื่องหมายก่อนเลือกตัวเลขถัดไป', 'error');
}

// User picks an operator
function addOp(op) {
  if (currentValue === null) {
    showToast('เลือกตัวเลขแรกก่อน', 'error');
    return;
  }
  if (remainingNums.length === 0) {
    showToast('ใช้ตัวเลขครบแล้ว', 'error');
    return;
  }
  if (pendingOp !== null) {
    // Replace previous pending op
    pendingOp = op;
    renderCalcDisplay();
    return;
  }
  pendingOp = op;
  renderCalcDisplay();
  updateOpButtons();
}

function applyOp(a, op, b) {
  if (op === '+') return a + b;
  if (op === '-') return a - b;
  if (op === '*') return a * b;
  if (op === '/') return a / b;
  return a;
}

// Enable/disable op buttons based on state
function updateOpButtons() {
  const canOp = currentValue !== null && remainingNums.length > 0;
  document.querySelectorAll('.op-btn').forEach(b => {
    b.disabled = !canOp;
    b.style.opacity = canOp ? '1' : '0.4';
  });
}

// Clear — reset calc state but keep same puzzle
function clearExpr() {
  resetCalcState();
  renderNumberButtons();
  renderCalcDisplay();
  updateOpButtons();
}

// ===== SUBMIT =====
function submitAnswer() {
  if (resultVisible) return;

  // Must have used all 4 numbers and no pending op
  if (remainingNums.length > 0) {
    showToast(`ยังเหลืออีก ${remainingNums.length} ตัวที่ยังไม่ได้ใช้`, 'error');
    return;
  }
  if (pendingOp !== null) {
    showToast('ยังมีเครื่องหมายค้างอยู่ เลือกตัวเลขให้ครบ', 'error');
    return;
  }
  if (currentValue === null) {
    showToast('ยังไม่ได้สร้างสมการ', 'error');
    return;
  }

  stopGameTimer();
  const pts    = calcPotentialScore(elapsedSec);
  const result = currentValue;

  if (Math.abs(result - 24) < 1e-9) {
    // ✅ Correct!
    wrongStreak = 0;
    currentUser.correctCount = (currentUser.correctCount || 0) + 1;
    currentUser.weeklyScore  = (currentUser.weeklyScore  || 0) + pts;
    currentUser.totalScore   = (currentUser.totalScore   || 0) + pts;
    saveCurrentUser();
    updateScoreDisplay();
    renderUserBadge();
    showResult(true, pts, result);
    document.getElementById('statCorrect').textContent = currentUser.correctCount;
  } else {
    // ❌ Wrong
    wrongStreak++;
    currentUser.wrongCount = (currentUser.wrongCount || 0) + 1;
    saveCurrentUser();
    document.getElementById('statWrong').textContent = currentUser.wrongCount;

    if (wrongStreak >= 3) {
      // 3rd wrong — show result then move to next
      showResult(false, 0, result, true);
    } else {
      // Still has retries — show feedback, reset calc, stay on same puzzle
      showResult(false, 0, result, false);
    }
  }
}

function showResult(correct, pts, result, forceNext = false) {
  resultVisible = true;
  const popup   = document.getElementById('resultPopup');
  const remaining = 3 - wrongStreak;

  document.getElementById('resultIcon').textContent = correct ? '🎉' : (forceNext ? '💀' : '😕');
  document.getElementById('resultMsg').textContent  = correct
    ? 'ถูกต้อง!'
    : (forceNext
        ? `ผิด 3 ครั้งแล้ว! คำตอบ = ${fmtNum(result)} ≠ 24`
        : `ผิด! ผลลัพธ์ = ${fmtNum(result)} ≠ 24`);
  document.getElementById('resultMsg').style.color  = correct ? 'var(--accent4)' : 'var(--danger)';

  if (correct) {
    document.getElementById('resultScore').textContent = `+${pts} คะแนน`;
  } else if (!forceNext) {
    document.getElementById('resultScore').innerHTML =
      `<span style="color:var(--accent3)">เหลือโอกาสอีก ${remaining} ครั้ง</span>`;
  } else {
    document.getElementById('resultScore').textContent = 'เปลี่ยนข้อถัดไป';
  }

  // Change next button text
  const btnNext = popup.querySelector('.btn-next');
  if (btnNext) {
    btnNext.textContent = (correct || forceNext) ? 'ถัดไป ▶' : '▷ ลองใหม่';
    btnNext.onclick = (correct || forceNext) ? nextPuzzle : retryPuzzle;
  }

  popup.classList.remove('hidden');
}

function retryPuzzle() {
  resultVisible = false;
  // Reset calc state only (keep same puzzle & timer continues)
  resetCalcState();
  renderNumberButtons();
  renderCalcDisplay();
  updateOpButtons();
  updateWrongStreakIndicator();
  document.getElementById('resultPopup').classList.add('hidden');
  // Restart timer for this attempt
  stopGameTimer();
  elapsedSec = 0;
  document.getElementById('timerDisplay').textContent = '00:00';
  document.getElementById('potentialScore').textContent = '3';
  gameTimer = setInterval(() => {
    elapsedSec++;
    const m = String(Math.floor(elapsedSec / 60)).padStart(2,'0');
    const s = String(elapsedSec % 60).padStart(2,'0');
    document.getElementById('timerDisplay').textContent = `${m}:${s}`;
    document.getElementById('potentialScore').textContent = calcPotentialScore(elapsedSec);
  }, 1000);
}

function nextPuzzle() {
  resultVisible = false;
  startNewPuzzle();
}

function skipPuzzle() {
  stopGameTimer();
  currentUser.skipCount = (currentUser.skipCount || 0) + 1;
  saveCurrentUser();
  document.getElementById('statSkip').textContent = currentUser.skipCount;
  showToast('ข้ามโจทย์แล้ว', 'info');
  startNewPuzzle();
}

// Show attempt dots (●●○ etc.)
function updateWrongStreakIndicator() {
  const el = document.getElementById('wrongStreakIndicator');
  if (!el) return;
  const dots = [0,1,2].map(i =>
    `<span style="color:${i < wrongStreak ? 'var(--danger)' : 'rgba(255,255,255,0.15)'};font-size:1.1rem;">●</span>`
  ).join('');
  el.innerHTML = `โอกาส: ${dots}`;
}

// ============================================================
// LEADERBOARD
// ============================================================
let leaderMode = 'weekly';

function switchLeaderTab(mode) {
  leaderMode = mode;
  document.querySelectorAll('.ltab').forEach((b, i) => {
    b.classList.toggle('active', (i === 0 ? 'weekly' : 'alltime') === mode);
  });
  renderLeaderboard(mode);
}

function renderLeaderboard(mode) {
  const users = DB.getUsers().filter(u => u.role !== 'admin');
  const sorted = [...users].sort((a, b) => {
    return mode === 'weekly'
      ? (b.weeklyScore || 0) - (a.weeklyScore || 0)
      : (b.totalScore  || 0) - (a.totalScore  || 0);
  });

  const list = document.getElementById('leaderList');
  if (!sorted.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">🏆</div><p>ยังไม่มีผู้เล่น</p></div>';
    return;
  }

  const rankBadgeClass = (i) => i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : 'rn';
  const itemClass      = (i) => i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
  const meClass        = (u) => u.username === currentUser?.username ? 'me' : '';
  const scoreField     = mode === 'weekly' ? 'weeklyScore' : 'totalScore';
  const lv = (u) => getLevel(u.totalScore || 0);

  list.innerHTML = sorted.map((u, i) => `
    <div class="leader-item ${itemClass(i)} ${meClass(u)}" style="animation-delay:${i*0.05}s">
      <div class="leader-rank-badge ${rankBadgeClass(i)}">${i < 3 ? ['🥇','🥈','🥉'][i] : i+1}</div>
      <div class="leader-info">
        <div class="leader-name">${escHtml(u.username)} ${u.username === currentUser?.username ? '<span style="color:var(--accent1);font-size:0.78rem;">(คุณ)</span>' : ''}</div>
        <div class="leader-meta"><span class="level-badge">LV${lv(u).tier+1} ${lv(u).label}</span></div>
      </div>
      <div class="leader-score-area">
        <div class="leader-pts">${(u[scoreField] || 0).toLocaleString()}</div>
        <div class="leader-pts-label">คะแนน</div>
      </div>
    </div>`).join('');
}

// ============================================================
// PROFILE
// ============================================================
function renderProfile() {
  refreshCurrentUser();
  const u  = currentUser;
  const lv = getLevel(u.totalScore || 0);
  const nextLv = LEVELS[Math.min(lv.tier + 1, LEVELS.length - 1)];
  const pct = lv.tier === LEVELS.length - 1
    ? 100
    : Math.min(100, Math.floor(((u.totalScore - lv.min) / (lv.next - lv.min)) * 100));

  // Rank in weekly
  const users = DB.getUsers().filter(x => x.role !== 'admin');
  const weekRank = [...users].sort((a,b) => (b.weeklyScore||0)-(a.weeklyScore||0))
    .findIndex(x => x.username === u.username) + 1;
  const allRank = [...users].sort((a,b) => (b.totalScore||0)-(a.totalScore||0))
    .findIndex(x => x.username === u.username) + 1;

  const joinDate = new Date(u.joinedAt).toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' });

  document.getElementById('profileContent').innerHTML = `
    <div class="profile-card">
      <div class="profile-top">
        <div class="profile-avatar">${escHtml(u.username[0].toUpperCase())}</div>
        <div>
          <div class="profile-name">${escHtml(u.username)}</div>
          <div class="profile-joined">เข้าร่วมเมื่อ ${joinDate}</div>
          <div style="margin-top:8px;"><span class="level-badge" style="font-size:0.9rem;">LV${lv.tier+1} ${lv.label}</span></div>
        </div>
      </div>

      <div class="level-bar-area">
        <div class="level-label">
          <span>Level ${lv.tier+1} → ${lv.tier+1 < LEVELS.length ? 'Level '+(lv.tier+2) : 'MAX'}</span>
          <span>${u.totalScore - lv.min} / ${lv.next === Infinity ? '∞' : lv.next - lv.min} XP</span>
        </div>
        <div class="level-track"><div class="level-fill" style="width:${pct}%"></div></div>
      </div>

      <div class="stats-grid">
        <div class="stats-card">
          <div class="stats-value">${(u.totalScore||0).toLocaleString()}</div>
          <div class="stats-label">💎 คะแนนสะสมทั้งหมด</div>
        </div>
        <div class="stats-card">
          <div class="stats-value">${(u.weeklyScore||0).toLocaleString()}</div>
          <div class="stats-label">🏅 คะแนนสัปดาห์นี้</div>
        </div>
        <div class="stats-card">
          <div class="stats-value">${u.correctCount||0}</div>
          <div class="stats-label">✅ ตอบถูก</div>
        </div>
        <div class="stats-card">
          <div class="stats-value">${u.wrongCount||0}</div>
          <div class="stats-label">❌ ตอบผิด</div>
        </div>
      </div>

      <div class="rank-display" style="margin-top:16px;">
        <div>
          <div style="font-size:0.85rem;color:var(--text-muted);">อันดับสัปดาห์นี้</div>
          <div class="rank-no">#${weekRank}</div>
        </div>
        <div style="width:1px;background:var(--border);height:40px;"></div>
        <div>
          <div style="font-size:0.85rem;color:var(--text-muted);">อันดับคะแนนสะสม</div>
          <div class="rank-no">#${allRank}</div>
        </div>
        <div style="width:1px;background:var(--border);height:40px;"></div>
        <div>
          <div style="font-size:0.85rem;color:var(--text-muted);">ข้าม</div>
          <div class="rank-no" style="color:var(--text-muted);font-size:1.4rem;">${u.skipCount||0}</div>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// ADMIN
// ============================================================
function startAdmin() {
  document.getElementById('adminUserLabel').textContent = `⚙ ${currentUser.username}`;
  showScreen('adminScreen');
  switchAdminTab('users');
}

function adminLogout() {
  showConfirm('ออกจากระบบ Admin', 'ต้องการออกจากระบบใช่หรือไม่?', () => {
    currentUser = null;
    DB.clearSession();
    showScreen('authScreen');
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
  });
}

let adminTab = 'users';
function switchAdminTab(tab) {
  adminTab = tab;
  document.querySelectorAll('.atab').forEach((b, i) => {
    b.classList.toggle('active', ['users','scores','settings'][i] === tab);
  });
  renderAdminContent();
}

function renderAdminContent() {
  const el = document.getElementById('adminContent');
  if (adminTab === 'users')    el.innerHTML = renderAdminUsers();
  if (adminTab === 'scores')   el.innerHTML = renderAdminScores();
  if (adminTab === 'settings') el.innerHTML = renderAdminSettings();
}

function renderAdminUsers() {
  const users = DB.getUsers();
  const total   = users.filter(u => u.role !== 'admin').length;
  const banned  = users.filter(u => u.banned).length;

  return `
    <div class="admin-section">
      <div class="admin-stats-row">
        <div class="admin-stat-card">
          <div class="admin-stat-value">${total}</div>
          <div class="admin-stat-label">ผู้ใช้ทั้งหมด</div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-value">${banned}</div>
          <div class="admin-stat-label">ถูกระงับ</div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-value">${total - banned}</div>
          <div class="admin-stat-label">ใช้งานอยู่</div>
        </div>
      </div>
      <h3>รายชื่อผู้ใช้</h3>
      <table class="admin-table">
        <thead>
          <tr>
            <th>USERNAME</th><th>ROLE</th><th>คะแนนสะสม</th><th>คะแนนสัปดาห์</th><th>เข้าร่วม</th><th>สถานะ</th><th>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td><strong>${escHtml(u.username)}</strong></td>
              <td><span class="badge-role badge-${u.role}">${u.role}</span></td>
              <td>${(u.totalScore||0).toLocaleString()}</td>
              <td>${(u.weeklyScore||0).toLocaleString()}</td>
              <td>${new Date(u.joinedAt).toLocaleDateString('th-TH')}</td>
              <td>${u.banned ? '<span style="color:var(--danger)">ระงับ</span>' : '<span style="color:var(--accent4)">ปกติ</span>'}</td>
              <td style="display:flex;gap:6px;flex-wrap:wrap;">
                ${u.role !== 'admin' ? `
                  <button class="admin-btn admin-btn-warn" onclick="adminToggleBan('${escHtml(u.username)}')">${u.banned ? 'ปลดบล็อก' : 'ระงับ'}</button>
                  <button class="admin-btn admin-btn-danger" onclick="adminDeleteUser('${escHtml(u.username)}')">ลบ</button>
                  <button class="admin-btn admin-btn-info"  onclick="adminResetScore('${escHtml(u.username)}')">รีเซตคะแนน</button>
                ` : '<span style="color:var(--text-muted);font-size:0.8rem;">—</span>'}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function renderAdminScores() {
  const users = DB.getUsers().filter(u => u.role !== 'admin');
  const sorted = [...users].sort((a,b) => (b.weeklyScore||0) - (a.weeklyScore||0));
  return `
    <div class="admin-section">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <h3>คะแนนผู้เล่น</h3>
        <button class="btn-save" onclick="adminResetAllWeekly()" style="background:linear-gradient(135deg,#ef4444,#b91c1c);">
          🔄 รีเซตคะแนนสัปดาห์ทั้งหมด
        </button>
      </div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>อันดับ</th><th>USERNAME</th><th>คะแนนสัปดาห์</th><th>คะแนนสะสม</th><th>ถูก/ผิด/ข้าม</th><th>เลเวล</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map((u,i) => {
            const lv = getLevel(u.totalScore||0);
            return `<tr>
              <td><strong>#${i+1}</strong></td>
              <td>${escHtml(u.username)}</td>
              <td style="color:var(--accent3);font-weight:700;">${(u.weeklyScore||0).toLocaleString()}</td>
              <td>${(u.totalScore||0).toLocaleString()}</td>
              <td>${u.correctCount||0} / ${u.wrongCount||0} / ${u.skipCount||0}</td>
              <td><span class="level-badge">LV${lv.tier+1}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function renderAdminSettings() {
  return `
    <div class="admin-section">
      <h3>ตั้งค่าระบบ</h3>
      <div class="settings-form">
        <div class="settings-row">
          <label>เพิ่ม Admin ใหม่ (Username ที่มีอยู่แล้ว)</label>
          <input type="text" id="promoteUser" placeholder="ชื่อผู้ใช้" />
        </div>
        <button class="btn-save" onclick="adminPromote()">เลื่อนขั้นเป็น Admin</button>
        <hr style="border-color:var(--border);margin:24px 0;">
        <div class="settings-row">
          <label>รีเซตรหัสผ่านผู้ใช้</label>
          <input type="text" id="rpUser"  placeholder="ชื่อผู้ใช้" style="margin-bottom:8px;" />
          <input type="password" id="rpPass" placeholder="รหัสผ่านใหม่" />
        </div>
        <button class="btn-save" onclick="adminResetPassword()">รีเซตรหัสผ่าน</button>
        <hr style="border-color:var(--border);margin:24px 0;">
        <div style="color:var(--text-muted);font-size:0.85rem;">
          <p>📌 ระบบจะรีเซตคะแนนรายสัปดาห์อัตโนมัติทุกวันจันทร์ 00:00 น.</p>
          <p style="margin-top:8px;">📌 Admin: <code style="color:var(--accent4)">admin</code> / <code style="color:var(--accent4)">admin1234</code></p>
        </div>
      </div>
    </div>`;
}

// Admin actions
function adminToggleBan(username) {
  const users = DB.getUsers();
  const u = users.find(x => x.username === username);
  if (!u) return;
  u.banned = !u.banned;
  DB.saveUsers(users);
  showToast(`${username} ${u.banned ? 'ถูกระงับ' : 'ปลดบล็อกแล้ว'}`, u.banned ? 'error' : 'success');
  renderAdminContent();
}

function adminDeleteUser(username) {
  showConfirm('ลบผู้ใช้', `ต้องการลบบัญชี "${username}" หรือไม่? ข้อมูลจะหายถาวร`, () => {
    const users = DB.getUsers().filter(u => u.username !== username);
    DB.saveUsers(users);
    showToast(`ลบ ${username} แล้ว`, 'success');
    renderAdminContent();
  });
}

function adminResetScore(username) {
  showConfirm('รีเซตคะแนน', `รีเซตคะแนนทั้งหมดของ "${username}"?`, () => {
    const users = DB.getUsers();
    const u = users.find(x => x.username === username);
    if (u) { u.weeklyScore = 0; u.totalScore = 0; u.correctCount = 0; u.wrongCount = 0; u.skipCount = 0; }
    DB.saveUsers(users);
    showToast(`รีเซตคะแนน ${username} แล้ว`, 'success');
    renderAdminContent();
  });
}

function adminResetAllWeekly() {
  showConfirm('รีเซตคะแนนสัปดาห์', 'รีเซตคะแนนสัปดาห์ของผู้เล่นทุกคน?', () => {
    const users = DB.getUsers();
    users.forEach(u => { if (u.role !== 'admin') u.weeklyScore = 0; });
    DB.saveUsers(users);
    DB.saveWeekStart(getLastMonday(new Date()).toISOString());
    showToast('รีเซตคะแนนสัปดาห์ทั้งหมดแล้ว', 'success');
    renderAdminContent();
  });
}

function adminPromote() {
  const uname = document.getElementById('promoteUser').value.trim();
  if (!uname) { showToast('กรุณากรอกชื่อผู้ใช้', 'error'); return; }
  const users = DB.getUsers();
  const u = users.find(x => x.username === uname);
  if (!u) { showToast('ไม่พบผู้ใช้นี้', 'error'); return; }
  u.role = 'admin';
  DB.saveUsers(users);
  showToast(`${uname} ถูกเลื่อนเป็น Admin แล้ว`, 'success');
  renderAdminContent();
}

function adminResetPassword() {
  const uname = document.getElementById('rpUser').value.trim();
  const pass  = document.getElementById('rpPass').value;
  if (!uname || !pass) { showToast('กรุณากรอกข้อมูลให้ครบ', 'error'); return; }
  if (pass.length < 4) { showToast('รหัสผ่านต้องมีอย่างน้อย 4 ตัว', 'error'); return; }
  const users = DB.getUsers();
  const u = users.find(x => x.username === uname);
  if (!u) { showToast('ไม่พบผู้ใช้นี้', 'error'); return; }
  u.password = pass;
  DB.saveUsers(users);
  showToast(`รีเซตรหัสผ่าน ${uname} แล้ว`, 'success');
}

// ===== UTILS =====
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== KEYBOARD SUPPORT =====
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const active = document.querySelector('.screen.active').id;
    if (active === 'authScreen') {
      const loginActive = document.getElementById('loginForm').classList.contains('active');
      loginActive ? login() : register();
    }
  }
  if (e.key === 'Escape') {
    document.getElementById('resultPopup').classList.add('hidden');
  }
});

// ===== INIT =====
(function init() {
  initMathBg();
  initAdmin();
  checkWeeklyReset();
  // Auto-login from session
  const session = DB.getSession();
  if (session) {
    const user = findUser(session.username);
    if (user && !user.banned) {
      currentUser = user;
      if (user.role === 'admin') startAdmin();
      else startApp();
      return;
    }
    DB.clearSession();
  }
  showScreen('authScreen');
})();
