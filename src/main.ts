import '@fortawesome/fontawesome-free/css/all.min.css';
import '../css/style.css';
import { initSync } from './store';
import { init as appInit } from './app';

initSync();

document.addEventListener('DOMContentLoaded', () => {
    appInit();
});
