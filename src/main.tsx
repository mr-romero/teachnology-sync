import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Import KaTeX CSS for math rendering
import 'katex/dist/katex.min.css'

createRoot(document.getElementById("root")!).render(<App />);
