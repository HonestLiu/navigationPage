import { state, api, registerRemoteHandler } from '../../store';
import { $, escHtml } from '../../dom';
import type { Todo } from '../../types';

// ===== 工具：待办 =====

function todoHtml(list: Todo[]): string {
    return list.map(t => `<div class="todo-item"><div class="todo-checkbox ${t.done ? 'checked' : ''}" data-id="${t.id}"></div><span class="todo-text ${t.done ? 'done' : ''}">${escHtml(t.text)}</span><button class="todo-delete" data-id="${t.id}"><i class="fas fa-times"></i></button></div>`).join('');
}

// 在指定作用域内渲染并绑定（支持卡片视图与展开浮层克隆体）
function renderInto(root: ParentNode): void {
    const list = root.querySelector('#todoList');
    const count = root.querySelector('#todoCount');
    if (!list) return;
    if (count) count.textContent = String(state.todos.filter(t => !t.done).length);
    list.innerHTML = todoHtml(state.todos);
    list.querySelectorAll('.todo-checkbox').forEach(cb => cb.addEventListener('click', () => toggleTodo(parseInt((cb as HTMLElement).dataset.id!))));
    list.querySelectorAll('.todo-delete').forEach(btn => btn.addEventListener('click', () => deleteTodo(parseInt((btn as HTMLElement).dataset.id!))));
}

function renderTodos(): void {
    renderInto(document);
    const overlay = $('#toolOverlay');
    if (overlay && overlay.classList.contains('active')) renderInto(overlay);
}

async function toggleTodo(id: number): Promise<void> {
    const t = state.todos.find(x => x.id === id);
    if (t) { t.done = !t.done; await api.setKv('todo_list', state.todos); renderTodos(); }
}

async function deleteTodo(id: number): Promise<void> {
    state.todos = state.todos.filter(t => t.id !== id);
    await api.setKv('todo_list', state.todos);
    renderTodos();
}

async function addTodo(inputEl?: HTMLInputElement): Promise<void> {
    const input = inputEl || $<HTMLInputElement>('#todoInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    state.todos.push({ id: Date.now(), text, done: false });
    await api.setKv('todo_list', state.todos);
    input.value = '';
    renderTodos();
}

export async function initTodo(): Promise<void> {
    state.todos = await api.getKv('todo_list') || [];
    renderTodos();
    $('#todoAddBtn')?.addEventListener('click', () => addTodo());
    $('#todoInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTodo(); });

    registerRemoteHandler((type, key, data) => {
        if (type === 'kv' && key === 'todo_list') { state.todos = data || []; renderTodos(); }
    });
}

// 工具展开浮层中使用：克隆体无事件监听且有重复 id，需在浮层作用域内重新渲染并绑定
export function initExpandedTodo(container: HTMLElement): void {
    renderInto(container);
    const input = container.querySelector('#todoInput') as HTMLInputElement | null;
    input?.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTodo(input); });
    container.querySelector('#todoAddBtn')?.addEventListener('click', () => addTodo(input || undefined));
}
