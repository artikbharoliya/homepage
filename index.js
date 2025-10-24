/* =====================
   Storage helpers
====================== */
const LS = {
  get(key, fallback){
    try{ return JSON.parse(localStorage.getItem(key)) ?? fallback; }catch(e){ return fallback; }
  },
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)); },
  del(key){ localStorage.removeItem(key); }
};

/* =====================
   Bookmarks Navbar
====================== */
const bmKey = 'sp_bookmarks_v1';
const bookmarksEl = document.getElementById('bookmarks');
let editMode = false;

/**
 * Populate the bookmark chip list from local storage, optionally showing delete buttons in edit mode.
 */
function renderBookmarks(){
  bookmarksEl.innerHTML = '';
  const list = LS.get(bmKey, []);
  list.forEach((b, idx)=>{
    const a = document.createElement('a');
    a.href = b.url; a.target = '_self'; a.className = 'chip';
    a.title = b.url; a.textContent = b.title || b.url;
    if (editMode){
      const x = document.createElement('button'); x.className='xbtn'; x.textContent='✖️';
      x.onclick = (e)=>{ e.preventDefault(); list.splice(idx,1); LS.set(bmKey, list); renderBookmarks(); };
      a.appendChild(x);
    }
    bookmarksEl.appendChild(a);
  });
}

/**
 * Prompt the user for a URL/title and persist the new bookmark.
 */
function addBookmark(){
  const url = prompt('Bookmark URL (include https://):');
  if(!url) return;
  const title = prompt('Display title:', url.replace(/^https?:\/\//,''));
  const list = LS.get(bmKey, []);
  list.push({title, url});
  LS.set(bmKey, list);
  renderBookmarks();
}

/**
 * Clear all saved bookmarks after confirming with the user.
 */
function resetBookmarks(){
  if(confirm('Reset all bookmarks?')){ LS.del(bmKey); renderBookmarks(); }
}

document.getElementById('addBookmarkBtn').onclick = addBookmark;
document.getElementById('resetBookmarksBtn').onclick = resetBookmarks;
document.getElementById('editBookmarksBtn').onclick = ()=>{ editMode = !editMode; renderBookmarks(); };

/* =====================
   Editor + Toolbar
====================== */
const editor = document.getElementById('editor');
const saveStatus = document.getElementById('saveStatus');
const contentKey = 'sp_content_html_v1';

editor.innerHTML = LS.get(contentKey, '') || '';

/**
 * Return a debounced wrapper that delays invoking the provided function until inactivity.
 */
function debounce(fn, ms=400){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

/**
 * Persist the current editor HTML to local storage and mark the UI as saved.
 */
const saveContent = debounce(()=>{
  LS.set(contentKey, editor.innerHTML);
  saveStatus.textContent = 'Saved';
}, 400);

editor.addEventListener('input', ()=>{
  saveStatus.textContent = '💾 Saving…';
  saveContent();
});

// Toolbar commands
document.getElementById('toolbar').addEventListener('click', (e)=>{
  const btn = e.target.closest('button'); if(!btn) return;
  const cmd = btn.dataset.cmd; const block = btn.dataset.block;
  editor.focus();
  if(cmd){ document.execCommand(cmd, false, null); return; }
  if(block){
    const tag = block === 'p' ? 'P' : block.toUpperCase();
    document.execCommand('formatBlock', false, tag);
    return;
  }
});

document.getElementById('linkBtn').onclick = ()=>{
  const url = prompt('Link URL:');
  if(url){ document.execCommand('createLink', false, url); }
  editor.focus();
};

document.getElementById('clearBtn').onclick = ()=>{
  if(confirm('Clear the page? This cannot be undone.')){
    editor.innerHTML = ''; LS.del(contentKey); saveStatus.textContent='Saved';
  }
};

// Simple "/" menu for quick blocks
editor.addEventListener('keydown', (e)=>{
  if(e.key === '/' && !e.shiftKey){
    // show tiny hint via status text
    saveStatus.textContent = 'Type: h1, h2, p, ul, ol, todo';
  }
  if(e.key === 'Enter') saveStatus.textContent = 'Saved';
});

/* =====================
   Clock + Greeting
====================== */
/**
 * Left-pad a number with a leading zero when needed (e.g., turning 5 into 05).
 */
function pad(n){ return n.toString().padStart(2,'0'); }
const clockEl = document.getElementById('clock');
const greetingEl = document.getElementById('greeting');

/**
 * Update the clock display and greeting based on the current time of day.
 */
function tick(){
  const d = new Date();
  const h = d.getHours(), m = d.getMinutes();
  clockEl.textContent = `${pad(h)}:${pad(m)}`;
  const g = h<12? 'Good morning' : h<18? 'Good afternoon' : 'Good evening';
  greetingEl.textContent = `${g}!`;
}
setInterval(tick, 1000); tick();

/* =====================
   Todo List (simple)
====================== */
const todoKey = 'sp_todos_v1';
const todoListEl = document.getElementById('todoList');

/**
 * Rebuild the todo list UI from the stored tasks, wiring up controls for each entry.
 */
function renderTodos(){
  const items = LS.get(todoKey, []);
  todoListEl.innerHTML = '';
  items.forEach((t, i)=>{
    const row = document.createElement('div'); row.className='todo-item';
    const cb = document.createElement('input'); cb.type='checkbox'; cb.checked = !!t.done;
    const input = document.createElement('input'); input.type='text'; input.value = t.text || '';
    const del = document.createElement('button'); del.textContent='🗑️';
    cb.onchange = ()=>{ items[i].done = cb.checked; LS.set(todoKey, items); };
    input.onchange = ()=>{ items[i].text = input.value; LS.set(todoKey, items); };
    del.onclick = ()=>{ items.splice(i,1); LS.set(todoKey, items); renderTodos(); };
    if(t.done) input.style.textDecoration = 'line-through';
    cb.addEventListener('change', ()=>{ input.style.textDecoration = cb.checked? 'line-through':'none'; });
    row.append(cb, input, del);
    todoListEl.appendChild(row);
  });
}

/**
 * Append a new empty todo item and refresh the rendered list.
 */
function addTodo(){
  const items = LS.get(todoKey, []);
  items.push({text:'', done:false}); LS.set(todoKey, items); renderTodos();
}
/**
 * Remove completed todo items from storage and refresh the rendered list.
 */
function clearCompleted(){
  const items = LS.get(todoKey, []).filter(t=>!t.done); LS.set(todoKey, items); renderTodos();
}
document.getElementById('addTodo').onclick = addTodo;
document.getElementById('clearCompleted').onclick = clearCompleted;
renderTodos();

/* =====================
   Init
====================== */
/**
 * Bootstrap the app by drawing the initial bookmark set.
 */
function init(){ renderBookmarks(); }
init();

/* =====================
   Daily Quote
====================== */
const quoteEl = document.getElementById('daily-quote');

/**
 * Fetch a fresh quote and update the footer once the page is fully idle.
 */
async function loadDailyQuote(){
  if(!quoteEl) return;
  try{
    const response = await fetch('https://api.quotable.io/random');
    if(!response.ok) throw new Error('bad response');
    const data = await response.json();
    quoteEl.textContent = `“${data.content}” — ${data.author}`;
  }catch{
    quoteEl.textContent = '“Keep your face always toward the sunshine.” — Walt Whitman';
  }
}

window.addEventListener('load', ()=>{
  const trigger = window.requestIdleCallback || ((fn)=>setTimeout(fn, 300));
  trigger(loadDailyQuote);
});
