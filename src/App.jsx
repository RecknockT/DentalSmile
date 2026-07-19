import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Home from './pages/Home'
import Login from './pages/Login'
import Interface from './pages/Interface'
import ProtectedRoute from './components/ProtectedRoute'

function App() {

  return (

    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />

        <Route
          path="/Interface/*"
          element={
            <ProtectedRoute>
              <Interface />
            </ProtectedRoute>
          }
        />

      </Routes>

    </BrowserRouter>

  )

}


export default App
