import { state, api } from '../../store';
import { $, escHtml } from '../../dom';
import type { Note } from '../../types';

// ===== 工具：笔记（快捷笔记 + 笔记视图 + 展开视图 互通）=====

function saveNotes(): void {
    api.setKv('quick_notes', state.notes);
}

// ===== 快捷笔记（工具视图）=====

export async function initNotes(): Promise<void> {
    state.notes = await api.getKv('quick_notes') || [];
    // 兼容旧的单个 quick_note
    const legacy = await api.getKv('quick_note');
    if (state.notes.length === 0 && legacy) {
        state.notes = [{ id: 1, title: '我的笔记', content: legacy, pinned: false, createdAt: Date.now(), updatedAt: Date.now() }];
        await api.setKv('quick_notes', state.notes);
        await api.setKv('quick_note', null);
    }
    $('#toolNoteNewBtn')?.addEventListener('click', () => createToolNote());
    renderPinnedNotes();
    renderToolNotesList();
}

function renderToolNotesList(): void {
    const list = $('#toolNotesList');
    const pinnedArea = $('#toolNotesPinned');
    if (!list || !pinnedArea) return;
    const pinned = state.notes.filter(n => n.pinned);
    const unpinned = state.notes.filter(n => !n.pinned);

    if (pinned.length > 0) {
        list.style.display = 'none';
        pinnedArea.style.display = '';
        pinnedArea.innerHTML = pinned.map(n => {
            const content = escHtml(n.content || '').replace(/\n/g, '<br>');
            return `<div class="tool-pinned-card" data-id="${n.id}">
                <div class="tool-pinned-card-pin"><i class="fas fa-thumbtack"></i></div>
                ${n.title ? `<div class="tool-pinned-card-title">${escHtml(n.title)}</div>` : ''}
                <div class="tool-pinned-card-content">${content || '<span class="tool-pinned-card-empty">空笔记</span>'}</div>
            </div>`;
        }).join('');
        pinnedArea.querySelectorAll('.tool-pinned-card').forEach(card => {
            card.addEventListener('click', () => openToolNote((card as HTMLElement).dataset.id!));
        });
        return;
    }

    pinnedArea.style.display = 'none';
    list.style.display = '';

    const sorted = [...pinned, ...unpinned];
    if (sorted.length === 0) {
        list.innerHTML = '<div class="notes-empty">暂无笔记<br><small>点击新建</small></div>';
        return;
    }

    list.innerHTML = sorted.map(n => {
        const preview = escHtml((n.content || '').slice(0, 80).replace(/\n/g, ' '));
        const time = new Date(n.updatedAt).toLocaleDateString('zh-CN');
        return `<div class="note-item" data-id="${n.id}">
            <div class="note-item-info">
                <div class="note-item-title">${escHtml(n.title) || '无标题'}</div>
                <div class="note-item-preview">${preview || '空笔记'}</div>
            </div>
            <span class="note-item-time">${time}</span>
        </div>`;
    }).join('');

    list.querySelectorAll('.note-item').forEach(item => {
        item.addEventListener('click', () => openToolNote((item as HTMLElement).dataset.id!));
    });
}

function createToolNote(): void {
    const note: Note = { id: Date.now(), title: '', content: '', pinned: false, createdAt: Date.now(), updatedAt: Date.now() };
    state.notes.unshift(note);
    saveNotes();
    openToolNote(note.id);
    renderNotesViewList();
}

function openToolNote(id: string | number): void {
    const note = state.notes.find(n => n.id == Number(id));
    if (!note) return;
    state.currentNoteId = note.id;

    const list = $('#toolNotesList');
    const editor = $('#toolNoteEditor');
    if (!editor) return;
    if (list) list.style.display = 'none';
    editor.style.display = '';

    const titleInput = $<HTMLInputElement>('#toolNoteTitle');
    const areaInput = $<HTMLTextAreaElement>('#toolNoteArea');
    const pinBtn = $('#toolNotePinBtn');
    const deleteBtn = $('#toolNoteDeleteBtn');
    const backBtn = $('#toolNoteBackBtn');
    if (!titleInput || !areaInput || !pinBtn || !deleteBtn || !backBtn) return;

    titleInput.value = note.title || '';
    areaInput.value = note.content || '';
    pinBtn.classList.toggle('pinned', note.pinned);

    // 通过克隆移除旧监听器
    const newPinBtn = pinBtn.cloneNode(true) as HTMLElement;
    pinBtn.parentNode!.replaceChild(newPinBtn, pinBtn);
    const newDeleteBtn = (deleteBtn.cloneNode(true) as HTMLElement);
    deleteBtn.parentNode!.replaceChild(newDeleteBtn, deleteBtn);
    const newBackBtn = (backBtn.cloneNode(true) as HTMLElement);
    backBtn.parentNode!.replaceChild(newBackBtn, backBtn);

    newBackBtn.addEventListener('click', () => {
        const l = $('#toolNotesList');
        const ed = $('#toolNoteEditor');
        if (l) l.style.display = '';
        if (ed) ed.style.display = 'none';
        renderToolNotesList();
    });

    titleInput.addEventListener('input', () => {
        note.title = titleInput.value;
        note.updatedAt = Date.now();
        saveNotes();
        renderNotesViewList();
    });
    areaInput.addEventListener('input', () => {
        note.content = areaInput.value;
        note.updatedAt = Date.now();
        saveNotes();
    });
    newPinBtn.addEventListener('click', () => {
        note.pinned = !note.pinned;
        note.updatedAt = Date.now();
        newPinBtn.classList.toggle('pinned', note.pinned);
        saveNotes();
        renderToolNotesList();
        renderNotesViewList();
        renderPinnedNotes();
    });
    newDeleteBtn.addEventListener('click', () => {
        if (!confirm('删除此笔记？')) return;
        state.notes = state.notes.filter(n => n.id !== note.id);
        state.currentNoteId = null;
        saveNotes();
        const l = $('#toolNotesList');
        const ed = $('#toolNoteEditor');
        if (l) l.style.display = '';
        if (ed) ed.style.display = 'none';
        renderToolNotesList();
        renderNotesViewList();
        renderPinnedNotes();
    });

    renderToolNotesList();
}

// ===== 钉住笔记（导航区卡片）=====

function renderPinnedNotes(): void {
    const pinned = state.notes.filter(n => n.pinned);
    let container = $('#pinnedNotes');
    const navGrid = $('#navGrid');
    if (!container && navGrid && navGrid.parentNode) {
        container = document.createElement('div');
        container.id = 'pinnedNotes';
        container.className = 'pinned-notes-section';
        navGrid.parentNode.insertBefore(container, navGrid);
    }
    if (!container) return;
    if (pinned.length === 0) { container.style.display = 'none'; return; }
    container.style.display = '';
    container.innerHTML = pinned.map(n => {
        const content = escHtml(n.content || '').replace(/\n/g, '<br>');
        return `<div class="pinned-note-card" data-id="${n.id}">
            ${n.title ? `<div class="pinned-note-title">${escHtml(n.title)}</div>` : ''}
            <div class="pinned-note-content">${content || '<span style="opacity:0.3">空笔记</span>'}</div>
        </div>`;
    }).join('');
    container.querySelectorAll('.pinned-note-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = (card as HTMLElement).dataset.id!;
            const viewBtn = document.querySelector('.sidebar-btn[data-view="notes"]') as HTMLElement | null;
            viewBtn?.click();
            setTimeout(() => openViewNote(id), 100);
        });
    });
}

// ===== 笔记视图（完整编辑器）=====

let notesViewInited = false;

export function initNotesView(): void {
    if (notesViewInited) { renderNotesViewList(); return; }
    notesViewInited = true;
    $('#viewNoteNewBtn')?.addEventListener('click', () => createViewNote());
    renderNotesViewList();
}

function createViewNote(): void {
    const note: Note = { id: Date.now(), title: '', content: '', pinned: false, createdAt: Date.now(), updatedAt: Date.now() };
    state.notes.unshift(note);
    saveNotes();
    renderNotesViewList();
    renderToolNotesList();
    openViewNote(note.id);
}

function renderNotesViewList(): void {
    const list = $('#viewNotesList');
    if (!list) return;
    const pinned = state.notes.filter(n => n.pinned);
    const unpinned = state.notes.filter(n => !n.pinned);
    const sorted = [...pinned, ...unpinned];

    if (sorted.length === 0) {
        list.innerHTML = '<div class="notes-empty">暂无笔记<br><small>点击 + 新建</small></div>';
        return;
    }

    list.innerHTML = sorted.map(n => {
        const preview = escHtml((n.content || '').slice(0, 80).replace(/\n/g, ' '));
        const time = new Date(n.updatedAt).toLocaleDateString('zh-CN');
        return `<div class="note-item ${state.currentNoteId === n.id ? 'active' : ''}" data-id="${n.id}">
            <div class="note-item-info">
                <div class="note-item-title">${escHtml(n.title) || '无标题'}</div>
                <div class="note-item-preview">${n.pinned ? '<i class="fas fa-thumbtack" style="color:var(--accent);font-size:9px;margin-right:4px;"></i>' : ''}${preview || '空笔记'}</div>
            </div>
            <span class="note-item-time">${time}</span>
        </div>`;
    }).join('');

    list.querySelectorAll('.note-item').forEach(item => {
        item.addEventListener('click', () => openViewNote((item as HTMLElement).dataset.id!));
    });
}

function openViewNote(id: string | number): void {
    const note = state.notes.find(n => n.id == Number(id));
    if (!note) return;
    state.currentNoteId = note.id;
    const editorArea = $('#viewNoteEditor');
    if (!editorArea) return;
    editorArea.innerHTML = `<div class="notes-editor-inner">
        <div class="notes-editor-toolbar">
            <input type="text" class="notes-title-input" id="viewNoteTitle" value="${escHtml(note.title)}" placeholder="标题" autocomplete="off">
            <div class="notes-toolbar-actions">
                <button class="note-pin-btn ${note.pinned ? 'pinned' : ''}" id="viewNotePinBtn" title="固定"><i class="fas fa-thumbtack"></i></button>
                <button class="note-delete-btn" id="viewNoteDeleteBtn" title="删除"><i class="fas fa-trash"></i></button>
            </div>
        </div>
        <textarea class="notes-content-input" id="viewNoteArea" placeholder="开始书写...">${note.content || ''}</textarea>
    </div>`;

    const titleInput = $<HTMLInputElement>('#viewNoteTitle');
    const areaInput = $<HTMLTextAreaElement>('#viewNoteArea');
    const pinBtn = $('#viewNotePinBtn');
    const deleteBtn = $('#viewNoteDeleteBtn');
    if (!titleInput || !areaInput || !pinBtn || !deleteBtn) return;

    titleInput.addEventListener('input', () => {
        note.title = titleInput.value;
        note.updatedAt = Date.now();
        saveNotes();
        renderNotesViewList();
        renderToolNotesList();
    });
    areaInput.addEventListener('input', () => {
        note.content = areaInput.value;
        note.updatedAt = Date.now();
        saveNotes();
    });
    pinBtn.addEventListener('click', () => {
        note.pinned = !note.pinned;
        note.updatedAt = Date.now();
        pinBtn.classList.toggle('pinned', note.pinned);
        saveNotes();
        renderNotesViewList();
        renderToolNotesList();
        renderPinnedNotes();
    });
    deleteBtn.addEventListener('click', () => {
        if (!confirm('删除此笔记？')) return;
        state.notes = state.notes.filter(n => n.id !== note.id);
        state.currentNoteId = null;
        saveNotes();
        editorArea.innerHTML = '<div class="notes-editor-empty"><i class="fas fa-pen-to-square"></i><span>选择或新建笔记</span></div>';
        renderNotesViewList();
        renderToolNotesList();
        renderPinnedNotes();
    });

    document.querySelectorAll('#viewNotesList .note-item').forEach(i => i.classList.toggle('active', (i as HTMLElement).dataset.id == id));
}

// ===== 展开视图里的笔记 =====

export function initExpandedNotes(container: HTMLElement): void {
    container.innerHTML = `<div class="notes-expanded">
        <div class="notes-sidebar">
            <div class="notes-sidebar-header">
                <span>笔记</span>
                <button class="notes-new-btn" id="overlayNoteNew"><i class="fas fa-plus"></i></button>
            </div>
            <div class="notes-sidebar-list" id="overlayNotesList"></div>
        </div>
        <div class="notes-editor-area" id="overlayNoteEditor">
            <div class="notes-editor-empty"><i class="fas fa-pen-to-square"></i><span>选择或新建笔记</span></div>
        </div>
    </div>`;

    const list = container.querySelector('#overlayNotesList') as HTMLElement;
    const editorArea = container.querySelector('#overlayNoteEditor') as HTMLElement;

    container.querySelector('#overlayNoteNew')?.addEventListener('click', () => {
        const note: Note = { id: Date.now(), title: '', content: '', pinned: false, createdAt: Date.now(), updatedAt: Date.now() };
        state.notes.unshift(note);
        saveNotes();
        openOverlayNote(note.id, list, editorArea);
        renderOverlayNotesList(list);
        renderToolNotesList();
        renderNotesViewList();
    });

    renderOverlayNotesList(list);

    if (state.currentNoteId) openOverlayNote(state.currentNoteId, list, editorArea);
}

function renderOverlayNotesList(listEl: HTMLElement): void {
    const sorted = [...state.notes.filter(n => n.pinned), ...state.notes.filter(n => !n.pinned)];
    if (sorted.length === 0) {
        listEl.innerHTML = '<div class="notes-empty">暂无笔记<br><small>点击 + 新建</small></div>';
        return;
    }
    listEl.innerHTML = sorted.map(n => {
        const preview = escHtml((n.content || '').slice(0, 80).replace(/\n/g, ' '));
        const time = new Date(n.updatedAt).toLocaleDateString('zh-CN');
        return `<div class="note-item ${state.currentNoteId === n.id ? 'active' : ''}" data-id="${n.id}">
            <div class="note-item-info">
                <div class="note-item-title">${escHtml(n.title) || '无标题'}</div>
                <div class="note-item-preview">${n.pinned ? '<i class="fas fa-thumbtack" style="color:var(--accent);font-size:9px;margin-right:4px;"></i>' : ''}${preview || '空笔记'}</div>
            </div>
            <span class="note-item-time">${time}</span>
        </div>`;
    }).join('');
    listEl.querySelectorAll('.note-item').forEach(item => item.addEventListener('click', () => {
        const expanded = (item.closest('.notes-expanded') as HTMLElement)?.querySelector('.notes-editor-area') as HTMLElement;
        openOverlayNote((item as HTMLElement).dataset.id!, listEl, expanded);
        listEl.querySelectorAll('.note-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
    }));
}

function openOverlayNote(id: string | number, _list: HTMLElement, editorArea: HTMLElement): void {
    const note = state.notes.find(n => n.id == Number(id));
    if (!note) return;
    state.currentNoteId = note.id;
    editorArea.innerHTML = `<div class="notes-editor-inner">
        <div class="notes-editor-toolbar">
            <input type="text" class="notes-title-input" id="overlayNoteTitle" value="${escHtml(note.title)}" placeholder="标题" autocomplete="off">
            <div class="notes-toolbar-actions">
                <button class="note-pin-btn ${note.pinned ? 'pinned' : ''}" id="overlayNotePin" title="固定"><i class="fas fa-thumbtack"></i></button>
                <button class="note-delete-btn" id="overlayNoteDelete" title="删除"><i class="fas fa-trash"></i></button>
            </div>
        </div>
        <textarea class="notes-content-input" id="overlayNoteArea" placeholder="开始书写...">${note.content || ''}</textarea>
    </div>`;
    const titleInput = $<HTMLInputElement>('#overlayNoteTitle');
    const areaInput = $<HTMLTextAreaElement>('#overlayNoteArea');
    const pinBtn = $('#overlayNotePin');
    const deleteBtn = $('#overlayNoteDelete');
    titleInput?.addEventListener('input', () => { note.title = titleInput.value; note.updatedAt = Date.now(); saveNotes(); renderToolNotesList(); });
    areaInput?.addEventListener('input', () => { note.content = areaInput.value; note.updatedAt = Date.now(); saveNotes(); });
    pinBtn?.addEventListener('click', () => {
        note.pinned = !note.pinned;
        note.updatedAt = Date.now();
        pinBtn.classList.toggle('pinned', note.pinned);
        saveNotes();
        renderToolNotesList();
        renderNotesViewList();
        renderOverlayNotesList(_list);
        renderPinnedNotes();
    });
    deleteBtn?.addEventListener('click', () => {
        if (!confirm('删除此笔记？')) return;
        state.notes = state.notes.filter(n => n.id !== note.id);
        state.currentNoteId = null;
        saveNotes();
        editorArea.innerHTML = '<div class="notes-editor-empty"><i class="fas fa-pen-to-square"></i><span>选择或新建笔记</span></div>';
        renderToolNotesList();
        renderNotesViewList();
        renderOverlayNotesList(_list);
        renderPinnedNotes();
    });
}
