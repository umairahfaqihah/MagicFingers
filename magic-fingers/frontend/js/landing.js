const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : '';

// ── Leaderboard ─────────────────────────────────────────────
async function loadLeaderboard() {
  try {
    const res  = await fetch(`${API}/api/leaderboard?limit=8`);
    const data = await res.json();
    const tbody = document.getElementById('lbBody');

    if (!data.success || !data.leaderboard || data.leaderboard.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="lb-loading">No scores yet — be the first! 🎮</td></tr>';
      return;
    }

    const medals = ['🥇','🥈','🥉'];
    tbody.innerHTML = data.leaderboard.map((e, i) => `
      <tr>
        <td>${medals[i] || (i+1)}</td>
        <td>${e.name}</td>
        <td><strong>${e.score}</strong></td>
        <td>${e.level}</td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('Leaderboard error:', err);
    document.getElementById('lbBody').innerHTML =
      '<tr><td colspan="4" class="lb-loading">Could not load — start the server!</td></tr>';
  }
}

// ── Contact ─────────────────────────────────────────────────
async function sendContact() {
  const name  = document.getElementById('cName').value.trim();
  const email = document.getElementById('cEmail').value.trim();
  const msg   = document.getElementById('cMsg').value.trim();
  const fb    = document.getElementById('contactMsg');

  if (!name || !email || !msg) {
    fb.textContent = '⚠️ Please fill all fields.';
    fb.style.color = '#F87171';
    return;
  }

  try {
    const res  = await fetch(`${API}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message: msg }),
    });
    const data = await res.json();
    if (data.success) {
      fb.textContent = '✅ Message sent! Thanks, ' + name + '!';
      fb.style.color = '#34D399';
      document.getElementById('cName').value  = '';
      document.getElementById('cEmail').value = '';
      document.getElementById('cMsg').value   = '';
    }
  } catch {
    fb.textContent = '❌ Could not send. Make sure server is running.';
    fb.style.color = '#F87171';
  }
}

// ── Scroll helper ────────────────────────────────────────────
function scrollTo(id) {
  document.querySelector(id)?.scrollIntoView({ behavior:'smooth' });
}

// ── Nav active highlight on scroll ──────────────────────────
const sections = document.querySelectorAll('section[id]');
const navLinks  = document.querySelectorAll('.nav__links a');
const observer  = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navLinks.forEach(a => a.classList.remove('active'));
      const link = document.querySelector(`.nav__links a[href="#${e.target.id}"]`);
      if (link) link.classList.add('active');
    }
  });
}, { threshold: .4 });
sections.forEach(s => observer.observe(s));

// ── Burger menu ──────────────────────────────────────────────
document.getElementById('burger')?.addEventListener('click', () => {
  const ul = document.querySelector('.nav__links');
  ul.style.display = ul.style.display === 'flex' ? 'none' : 'flex';
  ul.style.flexDirection = 'column';
  ul.style.position = 'fixed';
  ul.style.top = '70px';
  ul.style.left = '0';
  ul.style.width = '100%';
  ul.style.background = '#fff';
  ul.style.padding = '1rem 2rem';
  ul.style.boxShadow = '0 8px 24px rgba(0,0,0,.1)';
});

loadLeaderboard();

// ── Demo Modal ───────────────────────────────────────────────
const dQuestions = [
  { a:2, op:'+', b:1, ans:3 },
  { a:4, op:'+', b:1, ans:5 },
  { a:3, op:'+', b:2, ans:5 },
  { a:1, op:'+', b:3, ans:4 },
];
const dFingerIds  = ['df-thumb','df-index','df-middle','df-ring','df-pinky'];
const dFingerUpY  = {'df-thumb':55,'df-index':10,'df-middle':2,'df-ring':10,'df-pinky':24};
const dFingerDnY  = {'df-thumb':80,'df-index':40,'df-middle':32,'df-ring':40,'df-pinky':55};
let dQIdx=0, dCountAnim, dProgAnim, dScanAnim, dProgVal=0;

function setDemoFingers(count) {
  dFingerIds.forEach((id,i) => {
    const el = document.getElementById(id);
    if (!el) return;
    const up = i < count;
    el.setAttribute('fill', up ? '#7C3AED' : '#FDDCB5');
    el.setAttribute('y', up ? dFingerUpY[id] : dFingerDnY[id]);
  });
}

function demoScan() {
  let y=20, dir=1;
  dScanAnim = setInterval(() => {
    y += dir*3; if(y>130)dir=-1; if(y<20)dir=1;
    const el = document.getElementById('demo-scan');
    if(el) el.setAttribute('y', y);
  }, 40);
}

function runDemoQuestion(idx) {
  const q = dQuestions[idx];
  document.getElementById('dEqA').textContent  = q.a;
  document.getElementById('dEqOp').textContent = q.op;
  document.getElementById('dEqB').textContent  = q.b;
  document.getElementById('dQNum').textContent = idx+1;
  document.getElementById('dFb').className     = 'demo-fb wait';
  document.getElementById('dFb').textContent   = 'Waiting for your answer...';
  document.getElementById('dMascot').textContent = '🐒';
  document.getElementById('dHint').textContent = '💡 Show the correct number of fingers!';
  for(let i=1;i<=4;i++){
    document.getElementById('dd'+i).className='ddot'+(i===idx+1?' active':'');
  }
  setDemoFingers(0);
  document.getElementById('dDetNum').textContent = 0;
  document.getElementById('dProg').style.width = '0%';

  setTimeout(() => {
    document.getElementById('dFb').className   = 'demo-fb counting';
    document.getElementById('dFb').textContent = '✋ Counting fingers...';
    document.getElementById('dHint').textContent = '💡 Hold up '+q.ans+' fingers!';
    let c=0;
    clearInterval(dCountAnim);
    dCountAnim = setInterval(() => {
      if(c < q.ans){ c++; setDemoFingers(c); document.getElementById('dDetNum').textContent=c; }
      else {
        clearInterval(dCountAnim);
        dProgVal=0;
        clearInterval(dProgAnim);
        dProgAnim = setInterval(() => {
          dProgVal+=2;
          document.getElementById('dProg').style.width = dProgVal+'%';
          if(dProgVal>=100){
            clearInterval(dProgAnim);
            document.getElementById('dFb').className   = 'demo-fb correct';
            document.getElementById('dFb').textContent = '🎉 Correct! '+q.ans+' is right!';
            document.getElementById('dMascot').textContent = '🎊';
            setTimeout(() => { dQIdx=(dQIdx+1)%dQuestions.length; runDemoQuestion(dQIdx); }, 2000);
          }
        }, 18);
      }
    }, 400);
  }, 1000);
}

function openDemo() {
  document.getElementById('demoModal').classList.add('open');
  clearInterval(dScanAnim); clearInterval(dCountAnim); clearInterval(dProgAnim);
  dQIdx=0; setDemoFingers(0);
  demoScan();
  runDemoQuestion(0);
}

function closeDemo(e) {
  if(e && e.target !== document.getElementById('demoModal')) return;
  document.getElementById('demoModal').classList.remove('open');
  clearInterval(dScanAnim); clearInterval(dCountAnim); clearInterval(dProgAnim);
}