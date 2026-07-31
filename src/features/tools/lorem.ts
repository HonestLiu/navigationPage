import { $ } from '../../dom';

// ===== 工具：Lorem Ipsum =====

const PARAGRAPHS = [
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    'Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris.',
    'Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula. Donec lobortis risus a elit. Etiam tempor. Ut ullamcorper, ligula ut dictum pharetra, nisi nunc fringilla magna.',
    'Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Ut non enim eleifend felis pretium feugiat. Vivamus quis mi.',
    'Aenean imperdiet. Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. Nam eget dui. Etiam rhoncus. Maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero.',
    'Sed aliquam ultrices mauris. Integer ante arcu, accumsan a, consectetuer eget, posuere ut, mauris. Praesent adipiscing. Phasellus ullamcorper ipsum rutrum nunc.',
    'Nunc nonummy enim. In hac habitasse platea dictumst. Praesent turpis. Proin sapien ipsum, porta a, auctor quis, euismod ut, mi. Aenean viverra rhoncus pede.',
    'Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu.',
    'In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. Integer tincidunt. Cras dapibus.'
];

function generateLorem(): void {
    const countEl = $<HTMLInputElement>('#loremCount');
    const output = $<HTMLTextAreaElement>('#loremOutput');
    if (!output) return;
    const count = parseInt(countEl?.value || '3') || 3;
    const result: string[] = [];
    for (let i = 0; i < count; i++) result.push(PARAGRAPHS[i % PARAGRAPHS.length]);
    output.value = result.join('\n\n');
}

export function initLorem(): void {
    $('#loremGen')?.addEventListener('click', () => generateLorem());
    $('#loremCopy')?.addEventListener('click', () => {
        const v = $<HTMLTextAreaElement>('#loremOutput')?.value;
        if (v) navigator.clipboard.writeText(v);
    });
    generateLorem();
}
