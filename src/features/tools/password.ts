import { $ } from '../../dom';

// ===== 工具：密码生成 =====

function generatePassword(): void {
    const lenEl = $<HTMLInputElement>('#passwordLength');
    const display = $('#passwordDisplay');
    if (!lenEl || !display) return;
    const len = parseInt(lenEl.value);
    let chars = '';
    if ($<HTMLInputElement>('#pwUpper')?.checked) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if ($<HTMLInputElement>('#pwLower')?.checked) chars += 'abcdefghijklmnopqrstuvwxyz';
    if ($<HTMLInputElement>('#pwNumber')?.checked) chars += '0123456789';
    if ($<HTMLInputElement>('#pwSymbol')?.checked) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';
    let pw = '';
    const arr = new Uint32Array(len);
    crypto.getRandomValues(arr);
    const limit = Math.floor(0x100000000 / chars.length) * chars.length;
    for (let i = 0; i < len; i++) {
        const v = arr[i];
        pw += v < limit ? chars[v % chars.length] : chars[v % (limit / chars.length) % chars.length];
    }
    display.textContent = pw;
}

export function initPassword(): void {
    const lenVal = $('#passwordLengthVal');
    $<HTMLInputElement>('#passwordLength')?.addEventListener('input', (e) => { if (lenVal) lenVal.textContent = (e.target as HTMLInputElement).value; });
    $('#passwordGen')?.addEventListener('click', () => generatePassword());
    $('#passwordCopy')?.addEventListener('click', () => {
        const disp = $('#passwordDisplay');
        const pw = disp?.textContent || '';
        if (pw && pw !== '点击生成') {
            navigator.clipboard.writeText(pw).then(() => {
                const btn = $('#passwordCopy');
                if (btn) { btn.innerHTML = '<i class="fas fa-check"></i> 已复制'; setTimeout(() => { btn.innerHTML = '<i class="fas fa-copy"></i> 复制'; }, 1500); }
            });
        }
    });
    $('#passwordDisplay')?.addEventListener('click', () => {
        const pw = $('#passwordDisplay')?.textContent || '';
        if (pw && pw !== '点击生成') navigator.clipboard.writeText(pw);
    });
    generatePassword();
}
