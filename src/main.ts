import '@fortawesome/fontawesome-free/css/all.min.css';
import '../css/style.css';
import { initSSE } from './store';
import { init as appInit } from './app';

initSSE();

document.addEventListener('DOMContentLoaded', () => {
    appInit();
});
