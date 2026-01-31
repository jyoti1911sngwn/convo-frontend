import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
    <div className="relative h-screen overflow-hidden bg-black">
  {/* Background glow */}
  <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-transparent to-emerald-400/20 animate-gradient" />

  {/* Chat */}
  <div className="relative z-10 h-full flex items-center justify-center">
    {/* your chat container here */}

    <App />
  </div>
</div>
    </BrowserRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
