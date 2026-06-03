import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// StrictMode 의 dev 더블마운트가 오디오 엔진을 두 번 만들 수 있어 의도적으로 제외.
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
