
import { GenerationResponse } from "../types";

export const PREMADE_WIDGETS: Record<string, GenerationResponse> = {
  TABLE: {
    title: "Smart Spreadsheet",
    html: `
      <div class="toolbar">
        <button onclick="addRow()">+ Row</button>
        <button onclick="addCol()">+ Col</button>
        <button onclick="removeRow()" class="danger">- Row</button>
        <button onclick="removeCol()" class="danger">- Col</button>
      </div>
      <div class="table-container">
        <table id="mainTable">
          <thead></thead>
          <tbody></tbody>
        </table>
      </div>
    `,
    css: `
      .toolbar {
        display: flex;
        gap: 4px;
        padding: 8px;
        background: rgba(255,255,255,0.05);
        border-bottom: 1px solid rgba(255,255,255,0.1);
        flex-wrap: wrap;
      }
      button {
        background: rgba(255,255,255,0.1);
        border: none;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.75em;
        flex: 1;
      }
      button:hover { background: rgba(255,255,255,0.2); }
      button.danger { color: #f87171; background: rgba(248, 113, 113, 0.1); }
      button.danger:hover { background: rgba(248, 113, 113, 0.2); }
      
      .table-container {
        flex: 1;
        overflow: auto;
        padding: 10px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 300px;
      }
      th, td {
        border: 1px solid rgba(255,255,255,0.2);
        padding: 8px;
        text-align: left;
        min-width: 60px;
      }
      th {
        background: rgba(255,255,255,0.1);
        font-weight: bold;
      }
      td:focus, th:focus {
        outline: 2px solid #8b5cf6;
        background: rgba(139, 92, 246, 0.1);
      }
    `,
    js: `
      // Default State
      let state = window.WIDGET_DATA || {
        headers: ['Item', 'Cost', 'Notes'],
        rows: [
          ['Apple', '$1.00', 'Fresh'],
          ['Banana', '$0.50', 'Sweet']
        ]
      };

      function save() {
        // Scrape data from DOM to be safe, or update state object
        const hCells = Array.from(document.querySelectorAll('#mainTable thead th'));
        state.headers = hCells.map(c => c.innerText);
        
        const trs = Array.from(document.querySelectorAll('#mainTable tbody tr'));
        state.rows = trs.map(tr => {
          return Array.from(tr.querySelectorAll('td')).map(td => td.innerText);
        });
        
        if(window.sendWidgetState) {
          window.sendWidgetState(state);
        }
      }

      function render() {
        const thead = document.querySelector('#mainTable thead');
        const tbody = document.querySelector('#mainTable tbody');
        
        // Headers
        let hHtml = '<tr>';
        state.headers.forEach(h => {
          hHtml += '<th contenteditable="true" onblur="save()">' + h + '</th>';
        });
        hHtml += '</tr>';
        thead.innerHTML = hHtml;
        
        // Body
        let bHtml = '';
        state.rows.forEach(row => {
          bHtml += '<tr>';
          row.forEach(cell => {
            bHtml += '<td contenteditable="true" onblur="save()">' + cell + '</td>';
          });
          bHtml += '</tr>';
        });
        tbody.innerHTML = bHtml;
      }

      function addRow() {
        const emptyRow = new Array(state.headers.length).fill('');
        state.rows.push(emptyRow);
        render();
        save();
      }

      function addCol() {
        state.headers.push('New Col');
        state.rows.forEach(row => row.push(''));
        render();
        save();
      }

      function removeRow() {
        if(state.rows.length > 0) {
          state.rows.pop();
          render();
          save();
        }
      }

      function removeCol() {
        if(state.headers.length > 0) {
          state.headers.pop();
          state.rows.forEach(row => row.pop());
          render();
          save();
        }
      }

      // Initial Render
      render();
    `
  },
  NOTEBOOK: {
    title: "Writer's Notebook",
    html: `
      <div class="notebook-wrapper">
        <div class="paper">
          <div class="lines">
            <textarea id="noteArea" placeholder="Start writing your thoughts..."></textarea>
          </div>
        </div>
        <div class="status-bar">
          <span id="wordCount">0 words</span>
          <span id="status">Saved</span>
        </div>
      </div>
    `,
    css: `
      .notebook-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #fefce8; /* Light yellow paper look */
        color: #333;
      }
      .paper {
        flex: 1;
        position: relative;
        overflow: hidden;
        padding: 0;
      }
      .lines {
        height: 100%;
        width: 100%;
        background-image: linear-gradient(#e5e7eb 1px, transparent 1px);
        background-size: 100% 32px; /* Line height */
      }
      textarea {
        width: 100%;
        height: 100%;
        background: transparent;
        border: none;
        resize: none;
        outline: none;
        font-family: 'Courier New', Courier, monospace; /* Typewriter feel */
        font-size: 18px;
        line-height: 32px;
        padding: 0 20px;
        padding-top: 1px; /* Align with lines */
        color: #1f2937;
      }
      .status-bar {
        padding: 5px 10px;
        background: rgba(0,0,0,0.05);
        font-size: 10px;
        display: flex;
        justify-content: space-between;
        color: #666;
        border-top: 1px solid rgba(0,0,0,0.1);
      }
      /* Override dark mode from user customization for the paper part specifically */
      :host {
        color: black; 
      }
    `,
    js: `
      const area = document.getElementById('noteArea');
      const wc = document.getElementById('wordCount');
      const status = document.getElementById('status');

      // Load Saved Data
      if(window.WIDGET_DATA && window.WIDGET_DATA.text) {
        area.value = window.WIDGET_DATA.text;
      }

      function updateStats() {
        const text = area.value;
        const words = text.trim().split(/\\s+/).filter(w => w.length > 0).length;
        wc.textContent = words + ' words';
      }

      // Debounce function for saving
      let timeout;
      area.addEventListener('input', () => {
        updateStats();
        status.textContent = "Unsaved...";
        
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          if(window.sendWidgetState) {
            window.sendWidgetState({ text: area.value });
            status.textContent = "Saved";
          }
        }, 1000);
      });

      updateStats();
    `
  },
  CALCULATOR: {
    title: "Retro Calculator",
    html: `
      <div class="calc-container">
        <div class="display">
          <div class="prev-operand" id="prev"></div>
          <div class="curr-operand" id="curr">0</div>
        </div>
        <div class="buttons">
          <button class="span-2 op" onclick="clearCalc()">AC</button>
          <button class="op" onclick="del()">DEL</button>
          <button class="op" onclick="chooseOp('÷')">÷</button>
          <button onclick="append('7')">7</button>
          <button onclick="append('8')">8</button>
          <button onclick="append('9')">9</button>
          <button class="op" onclick="chooseOp('*')">×</button>
          <button onclick="append('4')">4</button>
          <button onclick="append('5')">5</button>
          <button onclick="append('6')">6</button>
          <button class="op" onclick="chooseOp('-')">-</button>
          <button onclick="append('1')">1</button>
          <button onclick="append('2')">2</button>
          <button onclick="append('3')">3</button>
          <button class="op" onclick="chooseOp('+')">+</button>
          <button onclick="append('.')">.</button>
          <button onclick="append('0')">0</button>
          <button class="span-2 equals" onclick="compute()">=</button>
        </div>
      </div>
    `,
    css: `
      .calc-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: 10px;
      }
      .display {
        background: rgba(0,0,0,0.3);
        border-radius: 8px;
        padding: 15px;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        justify-content: space-around;
        margin-bottom: 10px;
        flex: 1;
      }
      .prev-operand {
        color: rgba(255,255,255,0.6);
        font-size: 0.9em;
        min-height: 1.2em;
      }
      .curr-operand {
        color: white;
        font-size: 2em;
        font-weight: bold;
        word-wrap: break-word;
        word-break: break-all;
      }
      .buttons {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        flex: 3;
      }
      button {
        border: none;
        outline: none;
        background: rgba(255,255,255,0.1);
        color: white;
        font-size: 1.2em;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s;
      }
      button:hover { background: rgba(255,255,255,0.2); }
      button:active { background: rgba(255,255,255,0.05); }
      .span-2 { grid-column: span 2; }
      .op { color: #818cf8; background: rgba(99, 102, 241, 0.1); }
      .equals { background: #818cf8; color: white; }
      .equals:hover { background: #6366f1; }
    `,
    js: `
      let curr = '0';
      let prev = '';
      let operation = undefined;

      const currEl = document.getElementById('curr');
      const prevEl = document.getElementById('prev');

      function updateDisplay() {
        currEl.innerText = curr;
        if(operation != null) {
          prevEl.innerText = prev + ' ' + operation;
        } else {
          prevEl.innerText = '';
        }
      }

      function append(num) {
        if (num === '.' && curr.includes('.')) return;
        if (curr === '0' && num !== '.') curr = num;
        else curr = curr.toString() + num.toString();
        updateDisplay();
      }

      function chooseOp(op) {
        if (curr === '') return;
        if (prev !== '') compute();
        operation = op;
        prev = curr;
        curr = '';
        updateDisplay();
      }

      function compute() {
        let computation;
        const p = parseFloat(prev);
        const c = parseFloat(curr);
        if (isNaN(p) || isNaN(c)) return;
        switch (operation) {
          case '+': computation = p + c; break;
          case '-': computation = p - c; break;
          case '*': computation = p * c; break;
          case '÷': computation = p / c; break;
          default: return;
        }
        curr = computation;
        operation = undefined;
        prev = '';
        updateDisplay();
      }

      function clearCalc() {
        curr = '0';
        prev = '';
        operation = undefined;
        updateDisplay();
      }

      function del() {
        curr = curr.toString().slice(0, -1);
        if(curr === '') curr = '0';
        updateDisplay();
      }
    `
  },
  CLOCK: {
    title: "Time Suite",
    html: `
      <div class="wrapper">
        <div class="tabs">
          <div class="tab active" onclick="switchTab('clock')">Clock</div>
          <div class="tab" onclick="switchTab('timer')">Timer</div>
          <div class="tab" onclick="switchTab('stopwatch')">Stopwatch</div>
        </div>

        <div id="clock-view" class="view active">
          <div class="time-display" id="main-clock">00:00:00</div>
          <div class="date-display" id="main-date">Loading...</div>
        </div>

        <div id="timer-view" class="view">
          <div class="time-display" id="timer-display">00:00</div>
          
          <div class="timer-input-group">
             <input type="number" id="timer-input" placeholder="Min" min="1" />
             <button onclick="setCustomTime()" class="small-btn">Set</button>
          </div>

          <div class="controls">
             <button onclick="addTime(1)">+1m</button>
             <button onclick="addTime(5)">+5m</button>
             <button onclick="startTimer()" class="primary">Start</button>
             <button onclick="resetTimer()" class="danger">Reset</button>
          </div>
        </div>

        <div id="stopwatch-view" class="view">
          <div class="time-display" id="sw-display">00:00.00</div>
           <div class="controls">
             <button onclick="toggleSw()" id="sw-btn" class="primary">Start</button>
             <button onclick="resetSw()" class="danger">Reset</button>
          </div>
        </div>
      </div>
    `,
    css: `
      .wrapper { display: flex; flex-direction: column; height: 100%; text-align: center; }
      .tabs { display: flex; border-bottom: 1px solid rgba(255,255,255,0.1); }
      .tab { 
        flex: 1; 
        padding: 10px; 
        cursor: pointer; 
        font-size: 0.8em; 
        opacity: 0.6; 
        transition: 0.2s;
      }
      .tab:hover { background: rgba(255,255,255,0.05); }
      .tab.active { opacity: 1; border-bottom: 2px solid #8b5cf6; font-weight: bold; }
      
      .view { display: none; flex: 1; flex-direction: column; justify-content: center; align-items: center; gap: 15px; }
      .view.active { display: flex; }
      
      .time-display { font-size: 3em; font-weight: 200; font-feature-settings: "tnum"; }
      .date-display { font-size: 1em; opacity: 0.7; }
      
      .timer-input-group {
        display: flex;
        gap: 5px;
        align-items: center;
      }
      input {
        background: rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.2);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        width: 60px;
        text-align: center;
      }
      
      .controls { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
      button {
        padding: 8px 16px;
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,0.2);
        background: transparent;
        color: white;
        cursor: pointer;
      }
      button.small-btn { padding: 4px 10px; font-size: 0.8em; border-radius: 4px; }
      button.primary { background: #8b5cf6; border-color: #8b5cf6; }
      button.danger { border-color: #ef4444; color: #ef4444; }
    `,
    js: `
      // CLOCK
      setInterval(() => {
        const now = new Date();
        document.getElementById('main-clock').innerText = now.toLocaleTimeString();
        document.getElementById('main-date').innerText = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      }, 1000);

      function switchTab(tabName) {
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
        document.getElementById(tabName+'-view').classList.add('active');
        
        const tabs = ['clock', 'timer', 'stopwatch'];
        document.querySelectorAll('.tab')[tabs.indexOf(tabName)].classList.add('active');
      }

      // TIMER
      let timerInterval;
      let timerSeconds = 0;
      
      function updateTimerDisplay() {
        const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
        const s = (timerSeconds % 60).toString().padStart(2, '0');
        document.getElementById('timer-display').innerText = m + ':' + s;
      }
      
      function addTime(min) {
        timerSeconds += min * 60;
        updateTimerDisplay();
      }
      
      function setCustomTime() {
        const val = parseInt(document.getElementById('timer-input').value);
        if(!isNaN(val) && val > 0) {
          timerSeconds = val * 60;
          updateTimerDisplay();
        }
      }
      
      function startTimer() {
        if(timerInterval) clearInterval(timerInterval);
        if(timerSeconds <= 0) return;
        timerInterval = setInterval(() => {
          if(timerSeconds > 0) {
            timerSeconds--;
            updateTimerDisplay();
          } else {
            clearInterval(timerInterval);
            alert("Timer Done!");
          }
        }, 1000);
      }
      
      function resetTimer() {
        clearInterval(timerInterval);
        timerSeconds = 0;
        updateTimerDisplay();
      }

      // STOPWATCH
      let swInterval;
      let swTime = 0; // ms
      let swRunning = false;
      
      function toggleSw() {
        const btn = document.getElementById('sw-btn');
        if(swRunning) {
          clearInterval(swInterval);
          swRunning = false;
          btn.innerText = "Start";
        } else {
          const startTime = Date.now() - swTime;
          swInterval = setInterval(() => {
            swTime = Date.now() - startTime;
            const ms = Math.floor((swTime % 1000) / 10).toString().padStart(2, '0');
            const s = Math.floor((swTime / 1000) % 60).toString().padStart(2, '0');
            const m = Math.floor(swTime / 60000).toString().padStart(2, '0');
            document.getElementById('sw-display').innerText = m + ':' + s + '.' + ms;
          }, 10);
          swRunning = true;
          btn.innerText = "Stop";
        }
      }
      
      function resetSw() {
        clearInterval(swInterval);
        swRunning = false;
        swTime = 0;
        document.getElementById('sw-display').innerText = "00:00.00";
        document.getElementById('sw-btn').innerText = "Start";
      }
    `
  },
  KANBAN: {
    title: "Kanban Board",
    html: `
      <div class="kanban-container">
        <div class="column" id="todo">
          <div class="col-header status-todo">To Do</div>
          <div class="card-list" id="list-todo"></div>
          <div class="add-card">
            <input type="text" placeholder="New Task..." onkeydown="if(event.key==='Enter') addTask('todo', this.value, this)">
          </div>
        </div>
        <div class="column" id="doing">
          <div class="col-header status-doing">Doing</div>
          <div class="card-list" id="list-doing"></div>
          <div class="add-card">
            <input type="text" placeholder="New Task..." onkeydown="if(event.key==='Enter') addTask('doing', this.value, this)">
          </div>
        </div>
        <div class="column" id="done">
          <div class="col-header status-done">Done</div>
          <div class="card-list" id="list-done"></div>
           <div class="add-card">
            <input type="text" placeholder="New Task..." onkeydown="if(event.key==='Enter') addTask('done', this.value, this)">
          </div>
        </div>
      </div>
    `,
    css: `
      .kanban-container {
        display: flex;
        height: 100%;
        gap: 10px;
        padding: 10px;
        overflow-x: auto;
      }
      .column {
        flex: 1;
        min-width: 140px;
        background: rgba(0,0,0,0.2);
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .col-header {
        padding: 8px;
        font-weight: bold;
        text-align: center;
        text-transform: uppercase;
        font-size: 0.75em;
        letter-spacing: 1px;
      }
      .status-todo { border-bottom: 2px solid #f472b6; color: #f472b6; }
      .status-doing { border-bottom: 2px solid #fbbf24; color: #fbbf24; }
      .status-done { border-bottom: 2px solid #34d399; color: #34d399; }
      
      .card-list {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
      }
      .card {
        background: rgba(255,255,255,0.08);
        padding: 8px;
        border-radius: 4px;
        margin-bottom: 6px;
        font-size: 0.9em;
        display: flex;
        flex-direction: column;
        gap: 4px;
        group;
      }
      .card:hover { background: rgba(255,255,255,0.12); }
      
      .card-actions { 
        display: flex; 
        justify-content: flex-end;
        gap: 4px; 
        opacity: 0.5;
      }
      .card:hover .card-actions { opacity: 1; }
      
      .action-btn {
        background: rgba(255,255,255,0.1);
        border: none;
        color: white;
        cursor: pointer;
        font-size: 0.7em;
        padding: 2px 6px;
        border-radius: 3px;
      }
      .action-btn:hover { background: rgba(255,255,255,0.2); }
      .action-btn.del:hover { background: #ef4444; color: white; }

      .add-card {
        padding: 8px;
        border-top: 1px solid rgba(255,255,255,0.05);
      }
      input {
        width: 100%;
        background: transparent;
        border: 1px solid rgba(255,255,255,0.2);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.8em;
      }
      input:focus { outline: none; border-color: #8b5cf6; }
    `,
    js: `
      // State: { id: string, text: string, status: 'todo'|'doing'|'done' }[]
      let tasks = window.WIDGET_DATA || [
        { id: '1', text: 'Welcome to Kanban', status: 'todo' }
      ];

      function save() {
        if(window.sendWidgetState) {
          window.sendWidgetState(tasks);
        }
      }

      function render() {
        document.getElementById('list-todo').innerHTML = '';
        document.getElementById('list-doing').innerHTML = '';
        document.getElementById('list-done').innerHTML = '';

        tasks.forEach(task => {
          const el = document.createElement('div');
          el.className = 'card';
          
          // Move buttons based on status
          let moves = '';
          if(task.status === 'todo') moves = '<button class="action-btn" onclick="moveTask(\\''+task.id+'\\', \\'doing\\')">→</button>';
          if(task.status === 'doing') moves = '<button class="action-btn" onclick="moveTask(\\''+task.id+'\\', \\'todo\\')">←</button> <button class="action-btn" onclick="moveTask(\\''+task.id+'\\', \\'done\\')">→</button>';
          if(task.status === 'done') moves = '<button class="action-btn" onclick="moveTask(\\''+task.id+'\\', \\'doing\\')">←</button>';

          el.innerHTML = '<span>' + task.text + '</span><div class="card-actions">' + moves + '<button class="action-btn del" onclick="delTask(\\''+task.id+'\\')">×</button></div>';
          document.getElementById('list-' + task.status).appendChild(el);
        });
      }

      function addTask(status, text, input) {
        if(!text.trim()) return;
        const id = Date.now().toString();
        tasks.push({ id, text, status });
        input.value = '';
        render();
        save();
      }

      function moveTask(id, newStatus) {
        const task = tasks.find(t => t.id === id);
        if(task) {
          task.status = newStatus;
          render();
          save();
        }
      }

      function delTask(id) {
        tasks = tasks.filter(t => t.id !== id);
        render();
        save();
      }

      render();
    `
  },
  SKETCHPAD: {
    title: "Sketchpad",
    html: `
      <div class="sketch-container">
        <canvas id="canvas"></canvas>
        <div class="toolbar">
          <input type="color" id="colorPicker" value="#ffffff">
          <input type="range" id="sizePicker" min="1" max="20" value="3">
          <button onclick="clearCanvas()">Clear</button>
        </div>
      </div>
    `,
    css: `
      .sketch-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        position: relative;
      }
      canvas {
        flex: 1;
        background: #1e1e1e;
        cursor: crosshair;
        touch-action: none;
      }
      .toolbar {
        height: 40px;
        background: #2d2d2d;
        display: flex;
        align-items: center;
        padding: 0 10px;
        gap: 10px;
      }
      button {
        background: #3d3d3d;
        color: white;
        border: none;
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.8em;
      }
      button:hover { background: #4d4d4d; }
      input[type="color"] {
        width: 30px;
        height: 30px;
        border: none;
        background: none;
        cursor: pointer;
      }
    `,
    js: `
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      const container = document.querySelector('.sketch-container');
      
      // Resize handling
      function resize() {
        const img = ctx.getImageData(0,0, canvas.width, canvas.height);
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight - 40; // minus toolbar
        ctx.putImageData(img, 0, 0);
        
        // If loading from save
        if(window.WIDGET_DATA && window.WIDGET_DATA.img) {
             const image = new Image();
             image.onload = function() {
                 ctx.drawImage(image, 0, 0);
             };
             image.src = window.WIDGET_DATA.img;
             // Clear it so we don't reload it on resize loop
             window.WIDGET_DATA.img = null; 
        }
      }
      window.addEventListener('resize', resize);
      // Initial size
      setTimeout(resize, 100);

      let painting = false;

      function startPosition(e) {
        painting = true;
        draw(e);
      }
      function endPosition() {
        painting = false;
        ctx.beginPath();
        save();
      }
      function draw(e) {
        if (!painting) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        
        ctx.lineWidth = document.getElementById('sizePicker').value;
        ctx.lineCap = 'round';
        ctx.strokeStyle = document.getElementById('colorPicker').value;
        
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
      }

      canvas.addEventListener('mousedown', startPosition);
      canvas.addEventListener('mouseup', endPosition);
      canvas.addEventListener('mousemove', draw);
      
      // Touch support
      canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startPosition(e); });
      canvas.addEventListener('touchend', endPosition);
      canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); });

      function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        save();
      }

      function save() {
        if(window.sendWidgetState) {
           window.sendWidgetState({ img: canvas.toDataURL() });
        }
      }
    `
  },
  CONVERTER: {
    title: "Unit Converter",
    html: `
      <div class="converter">
        <div class="section">
          <label>Input</label>
          <input type="number" id="inputVal" value="1" oninput="convert()">
        </div>
        <div class="row">
          <select id="fromUnit" onchange="convert()">
            <optgroup label="Length">
              <option value="m">Meters (m)</option>
              <option value="ft">Feet (ft)</option>
              <option value="in">Inches (in)</option>
              <option value="cm">Centimeters (cm)</option>
            </optgroup>
            <optgroup label="Weight">
              <option value="kg">Kilograms (kg)</option>
              <option value="lb">Pounds (lb)</option>
            </optgroup>
             <optgroup label="Temp">
              <option value="c">Celsius (°C)</option>
              <option value="f">Fahrenheit (°F)</option>
            </optgroup>
          </select>
          <span>to</span>
          <select id="toUnit" onchange="convert()">
             <optgroup label="Length">
              <option value="ft">Feet (ft)</option>
              <option value="m">Meters (m)</option>
              <option value="in">Inches (in)</option>
              <option value="cm">Centimeters (cm)</option>
            </optgroup>
            <optgroup label="Weight">
              <option value="lb">Pounds (lb)</option>
              <option value="kg">Kilograms (kg)</option>
            </optgroup>
             <optgroup label="Temp">
              <option value="f">Fahrenheit (°F)</option>
              <option value="c">Celsius (°C)</option>
            </optgroup>
          </select>
        </div>
        <div class="result" id="result">Result here</div>
      </div>
    `,
    css: `
      .converter {
        display: flex;
        flex-direction: column;
        gap: 15px;
        padding: 20px;
        height: 100%;
        justify-content: center;
      }
      .section { display: flex; flex-direction: column; gap: 5px; }
      label { font-size: 0.8em; opacity: 0.7; }
      input {
        padding: 10px;
        background: rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.2);
        color: white;
        border-radius: 6px;
        font-size: 1.2em;
      }
      .row { display: flex; align-items: center; gap: 10px; }
      select {
        flex: 1;
        padding: 8px;
        border-radius: 6px;
        background: #eee;
        color: black; /* Requested black text */
        border: none;
      }
      .result {
        background: rgba(139, 92, 246, 0.1);
        border: 1px solid rgba(139, 92, 246, 0.3);
        padding: 15px;
        border-radius: 8px;
        text-align: center;
        font-size: 1.5em;
        font-weight: bold;
        color: #a78bfa;
        word-break: break-all;
      }
    `,
    js: `
      function convert() {
        const val = parseFloat(document.getElementById('inputVal').value);
        const from = document.getElementById('fromUnit').value;
        const to = document.getElementById('toUnit').value;
        const resEl = document.getElementById('result');
        
        if (isNaN(val)) {
          resEl.innerText = '---';
          return;
        }

        let result;
        
        // Normalize to base units (m, kg, c)
        const factors = {
          m: 1, cm: 0.01, ft: 0.3048, in: 0.0254,
          kg: 1, lb: 0.453592
        };
        
        // Temperature special case
        if ((from === 'c' || from === 'f') && (to === 'c' || to === 'f')) {
          if (from === to) result = val;
          else if (from === 'c' && to === 'f') result = (val * 9/5) + 32;
          else if (from === 'f' && to === 'c') result = (val - 32) * 5/9;
          else result = 'N/A';
        } 
        // Check compatibility (Length/Weight)
        else if (factors[from] && factors[to]) {
           // Basic dimension check: if one is length and other weight, fail
           const isLength = (u) => ['m','cm','ft','in'].includes(u);
           const isWeight = (u) => ['kg','lb'].includes(u);
           
           if(isLength(from) !== isLength(to)) {
              result = "Mismatch";
           } else {
              const base = val * factors[from];
              result = base / factors[to];
           }
        } else {
          result = "Mismatch";
        }

        if (typeof result === 'number') {
          resEl.innerText = parseFloat(result.toFixed(4));
        } else {
          resEl.innerText = result;
        }
      }
      convert();
    `
  },
  EXPENSE: {
    title: "Expense Tracker",
    html: `
      <div class="expense-container">
        <div class="balance-card">
          <small>Total Balance</small>
          <h1 id="balance">$0.00</h1>
        </div>
        
        <div class="input-group">
          <input type="text" id="desc" placeholder="Description" />
          <input type="number" id="amount" placeholder="$" style="width: 80px" />
          <button onclick="addTxn(1)" class="inc">+</button>
          <button onclick="addTxn(-1)" class="dec">-</button>
        </div>

        <div class="txns" id="txn-list">
          <!-- List -->
        </div>
      </div>
    `,
    css: `
      .expense-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: 15px;
        gap: 15px;
      }
      .balance-card {
        background: linear-gradient(135deg, #8b5cf6, #6366f1);
        padding: 15px;
        border-radius: 12px;
        text-align: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      }
      .balance-card h1 { margin: 5px 0 0 0; font-size: 2em; }
      .balance-card small { opacity: 0.8; text-transform: uppercase; font-size: 0.7em; letter-spacing: 1px; }
      
      .input-group { display: flex; gap: 5px; }
      input {
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.1);
        padding: 8px;
        border-radius: 6px;
        color: white;
        flex: 1;
      }
      button {
        width: 36px;
        border-radius: 6px;
        border: none;
        font-size: 1.2em;
        cursor: pointer;
        color: white;
      }
      .inc { background: #34d399; }
      .dec { background: #f87171; }
      
      .txns {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .txn-item {
        display: flex;
        justify-content: space-between;
        padding: 10px;
        background: rgba(255,255,255,0.05);
        border-radius: 8px;
        align-items: center;
      }
      .txn-item.plus { border-left: 4px solid #34d399; }
      .txn-item.minus { border-left: 4px solid #f87171; }
      .txn-amt { font-weight: bold; }
      .del-btn { 
        margin-left: 10px; 
        opacity: 0.3; 
        cursor: pointer; 
        font-size: 14px; 
        background: none; 
        width: auto; 
        color: inherit;
      }
      .del-btn:hover { opacity: 1; color: red; }
    `,
    js: `
      let transactions = window.WIDGET_DATA || [];

      function updateValues() {
        const balance = transactions.reduce((acc, item) => acc + item.amount, 0);
        document.getElementById('balance').innerText = '$' + balance.toFixed(2);
        
        const list = document.getElementById('txn-list');
        list.innerHTML = '';
        
        transactions.forEach((txn, idx) => {
          const item = document.createElement('div');
          item.classList.add('txn-item');
          item.classList.add(txn.amount > 0 ? 'plus' : 'minus');
          item.innerHTML = '<span>' + (txn.desc || 'Unknown') + '</span><div style="display:flex;align-items:center"><span class="txn-amt">' + (txn.amount > 0 ? '+' : '') + txn.amount + '</span><span class="del-btn" onclick="removeTxn(' + idx + ')">×</span></div>';
          list.appendChild(item);
        });

        if(window.sendWidgetState) window.sendWidgetState(transactions);
      }

      function addTxn(multiplier) {
        const desc = document.getElementById('desc').value;
        const amt = parseFloat(document.getElementById('amount').value);
        
        if(desc.trim() === '' || isNaN(amt) || amt === 0) return;

        const transaction = {
          id: Date.now(),
          desc: desc,
          amount: Math.abs(amt) * multiplier
        };
        
        transactions.unshift(transaction);
        document.getElementById('desc').value = '';
        document.getElementById('amount').value = '';
        updateValues();
      }

      function removeTxn(idx) {
        transactions.splice(idx, 1);
        updateValues();
      }

      updateValues();
    `
  },
  POMODORO: {
    title: "Pomodoro Timer",
    html: `
      <div class="pomo-container">
        <div class="status" id="mode-text">FOCUS</div>
        <div class="timer" id="time">25:00</div>
        <div class="controls">
          <button onclick="toggle()" id="toggle-btn">Start</button>
          <button onclick="reset()">Reset</button>
        </div>
        <div class="modes">
          <button class="mode-btn active" onclick="setMode('work')" id="btn-work">Work</button>
          <button class="mode-btn" onclick="setMode('break')" id="btn-break">Break</button>
        </div>
      </div>
    `,
    css: `
      .pomo-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 20px;
        background: radial-gradient(circle at center, rgba(255,255,255,0.05) 0%, transparent 70%);
      }
      .timer {
        font-size: 4em;
        font-weight: 200;
        line-height: 1;
        font-feature-settings: "tnum";
      }
      .status {
        font-size: 1.2em;
        letter-spacing: 4px;
        opacity: 0.7;
        font-weight: bold;
      }
      .controls { display: flex; gap: 10px; }
      .modes { display: flex; gap: 5px; background: rgba(0,0,0,0.2); padding: 4px; border-radius: 20px; }
      
      button {
        padding: 8px 20px;
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,0.2);
        background: transparent;
        color: white;
        cursor: pointer;
        font-size: 1em;
        transition: 0.2s;
      }
      button:hover { background: rgba(255,255,255,0.1); }
      #toggle-btn { background: white; color: black; border-color: white; font-weight: bold; }
      
      .mode-btn { border: none; font-size: 0.8em; padding: 4px 12px; opacity: 0.6; }
      .mode-btn.active { background: rgba(255,255,255,0.2); opacity: 1; font-weight: bold; }
    `,
    js: `
      let timeLeft = 25 * 60;
      let timerId = null;
      let isWork = true;

      function updateDisplay() {
        const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const s = (timeLeft % 60).toString().padStart(2, '0');
        document.getElementById('time').innerText = m + ':' + s;
      }

      function toggle() {
        const btn = document.getElementById('toggle-btn');
        if(timerId) {
          clearInterval(timerId);
          timerId = null;
          btn.innerText = "Start";
        } else {
          timerId = setInterval(() => {
            if(timeLeft > 0) {
              timeLeft--;
              updateDisplay();
            } else {
              clearInterval(timerId);
              timerId = null;
              btn.innerText = "Start";
              // Play sound or alert could go here
              alert("Time's up!");
            }
          }, 1000);
          btn.innerText = "Pause";
        }
      }

      function reset() {
        if(timerId) clearInterval(timerId);
        timerId = null;
        document.getElementById('toggle-btn').innerText = "Start";
        timeLeft = isWork ? 25 * 60 : 5 * 60;
        updateDisplay();
      }

      function setMode(mode) {
        isWork = mode === 'work';
        document.getElementById('mode-text').innerText = isWork ? "FOCUS" : "RELAX";
        
        document.getElementById('btn-work').classList.toggle('active', isWork);
        document.getElementById('btn-break').classList.toggle('active', !isWork);
        
        reset();
      }
    `
  },
  TALLY: {
    title: "Counter",
    html: `
      <div class="counter-wrapper">
        <div class="count" id="count">0</div>
        <div class="btn-row">
          <button class="minus" onclick="mod(-1)">-</button>
          <button class="plus" onclick="mod(1)">+</button>
        </div>
        <button class="reset" onclick="reset()">Reset</button>
      </div>
    `,
    css: `
      .counter-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 20px;
      }
      .count {
        font-size: 6em;
        font-weight: bold;
        text-shadow: 0 0 20px rgba(255,255,255,0.1);
      }
      .btn-row { display: flex; gap: 20px; }
      button {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: none;
        font-size: 2em;
        cursor: pointer;
        color: white;
        transition: transform 0.1s;
      }
      button:active { transform: scale(0.95); }
      .plus { background: #34d399; box-shadow: 0 0 15px rgba(52, 211, 153, 0.4); }
      .minus { background: #f87171; box-shadow: 0 0 15px rgba(248, 113, 113, 0.4); }
      
      .reset {
        width: auto;
        height: auto;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 0.9em;
        background: rgba(255,255,255,0.1);
      }
    `,
    js: `
      let count = window.WIDGET_DATA || 0;
      const el = document.getElementById('count');
      
      function render() {
        el.innerText = count;
        if(window.sendWidgetState) window.sendWidgetState(count);
      }
      
      function mod(amt) {
        count += amt;
        render();
      }
      
      function reset() {
        count = 0;
        render();
      }
      
      render();
    `
  },
  BREATHE: {
    title: "Breathe",
    html: `
      <div class="breathe-container">
        <div class="circle"></div>
        <div class="text" id="text">Breathe In</div>
      </div>
    `,
    css: `
      .breathe-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        position: relative;
      }
      .circle {
        width: 100px;
        height: 100px;
        background: rgba(125, 211, 252, 0.2);
        border-radius: 50%;
        box-shadow: 0 0 20px rgba(125, 211, 252, 0.4);
        animation: breathe 8s infinite ease-in-out;
        border: 2px solid rgba(125, 211, 252, 0.5);
      }
      .text {
        position: absolute;
        font-size: 1.2em;
        font-weight: 300;
        letter-spacing: 2px;
        opacity: 0.8;
        animation: textFade 8s infinite linear;
      }
      
      @keyframes breathe {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(2.5); background: rgba(125, 211, 252, 0.4); }
      }
      
      @keyframes textFade {
        0%, 100% { content: "Breathe In"; opacity: 0.5; }
        40% { opacity: 1; }
        50% { opacity: 1; }
        60% { opacity: 1; }
        90% { opacity: 0.5; }
      }
    `,
    js: `
      const text = document.getElementById('text');
      setInterval(() => {
         // Sync text roughly with animation phases manually if needed, 
         // but CSS animation usually smoother. 
         // We update text content via JS to ensure timing matches if CSS drifts
         const time = Date.now() % 8000;
         if(time < 4000) text.innerText = "Inhale";
         else text.innerText = "Exhale";
      }, 100);
    `
  }
};
