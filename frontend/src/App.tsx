import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<div>Startseite</div>} />
        {/* Weitere Routen hier einfügen */}
      </Routes>
    </Router>
  )
}

export default App
