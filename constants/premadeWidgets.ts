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
  }
};