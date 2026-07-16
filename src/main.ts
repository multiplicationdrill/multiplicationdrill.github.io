import './style.css';
import { initialize, toggleQuiz, toggleTheme } from './app';

// Make functions globally available for onclick handlers
declare global {
  interface Window {
    toggleQuiz: typeof toggleQuiz;
    toggleTheme: typeof toggleTheme;
  }
}

window.toggleQuiz = toggleQuiz;
window.toggleTheme = toggleTheme;

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);
