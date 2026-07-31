import { $ } from '../../dom';

// ===== 工具：Base64 =====

export function initBase64(): void {
    const input = $<HTMLTextAreaElement>('#base64Input');
    const output = $<HTMLTextAreaElement>('#base64Output');
    if (!input || !output) return;
    $('#base64Encode')?.addEventListener('click', () => {
        try { output.value = btoa(unescape(encodeURIComponent(input.value))); } catch (e) { output.value = '编码失败'; }
    });
    $('#base64Decode')?.addEventListener('click', () => {
        try { output.value = decodeURIComponent(escape(atob(input.value))); } catch (e) { output.value = '解码失败'; }
    });
    $('#base64Copy')?.addEventListener('click', () => { if (output.value) navigator.clipboard.writeText(output.value); });
}
