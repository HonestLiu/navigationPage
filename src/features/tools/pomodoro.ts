import { $ } from '../../dom';

// ===== 工具：番茄钟 =====

let pomodoroInterval: number | null = null;
let pomodoroTime = 25 * 60;
let pomodoroTotal = 25 * 60;
let pomodoroRunning = false;

function updatePomodoroDisplay(): void {
    const display = $('#pomodoroDisplay');
    const bar = $('#pomodoroBar');
    if (display) display.textContent = `${String(Math.floor(pomodoroTime / 60)).padStart(2, '0')}:${String(pomodoroTime % 60).padStart(2, '0')}`;
    if (bar) bar.style.width = ((pomodoroTotal - pomodoroTime) / pomodoroTotal * 100) + '%';
}

function startPomodoro(): void {
    if (pomodoroRunning) return;
    pomodoroRunning = true;
    const start = $('#pomodoroStart');
    const pause = $('#pomodoroPause');
    if (start) start.style.display = 'none';
    if (pause) pause.style.display = 'flex';
    pomodoroInterval = window.setInterval(() => {
        pomodoroTime--;
        updatePomodoroDisplay();
        if (pomodoroTime <= 0) {
            pausePomodoro();
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('番茄钟', { body: '时间到！' });
            }
        }
    }, 1000);
}

function pausePomodoro(): void {
    pomodoroRunning = false;
    if (pomodoroInterval) { clearInterval(pomodoroInterval); pomodoroInterval = null; }
    const start = $('#pomodoroStart');
    const pause = $('#pomodoroPause');
    if (start) start.style.display = 'flex';
    if (pause) pause.style.display = 'none';
}

function resetPomodoro(): void {
    pausePomodoro();
    pomodoroTime = pomodoroTotal;
    updatePomodoroDisplay();
}

export function initPomodoro(): void {
    $('#pomodoroStart')?.addEventListener('click', () => startPomodoro());
    $('#pomodoroPause')?.addEventListener('click', () => pausePomodoro());
    $('#pomodoroReset')?.addEventListener('click', () => resetPomodoro());
    document.querySelectorAll('.pomodoro-mode').forEach(btn => btn.addEventListener('click', () => {
        if (pomodoroRunning) return;
        document.querySelectorAll('.pomodoro-mode').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        pomodoroTotal = parseInt((btn as HTMLElement).dataset.minutes || '25') * 60;
        pomodoroTime = pomodoroTotal;
        updatePomodoroDisplay();
    }));
    updatePomodoroDisplay();
}
