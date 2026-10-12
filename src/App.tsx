import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Forside from './pages/Forside'
import KemikalieListe from './pages/KemikalieListe'
import KemikalieDetalje from './pages/KemikalieDetalje'
import MaskineListe from './pages/MaskineListe'
import MaskineDetalje from './pages/MaskineDetalje'
import DagligtTjek from './pages/DagligtTjek'
import DagligtTjekVis from './pages/DagligtTjekVis'
import VaelgLift from './pages/VaelgLift'
import PaabudListe from './pages/PaabudListe'
import PaabudDetalje from './pages/PaabudDetalje'
import FundListe from './pages/FundListe'
import FundDetalje from './pages/FundDetalje'
import NytFund from './pages/NytFund'
import ForeslaaAendring from './pages/ForeslaaAendring'
import MineForslag from './pages/MineForslag'
import AdminForslag from './pages/admin/AdminForslag'
import KunSkriv from './components/KunSkriv'

// Beskyttede ruter ligger under <Layout> (login-gate). Admin-ruten har desuden
// sit eget rolle-tjek i komponenten (redirect til / for ikke-admins).
// APV-ruter for handlinger/kemikalier/maskiner/påbud tilføjes i deres egne faser.
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Forside />} />
            <Route path="/kemikalier" element={<KemikalieListe />} />
            <Route path="/kemikalier/:id" element={<KemikalieDetalje />} />
            <Route path="/maskiner" element={<MaskineListe />} />
            <Route path="/maskiner/:id" element={<MaskineDetalje />} />
            <Route path="/maskiner/:id/dagligt-tjek" element={<KunSkriv><DagligtTjek /></KunSkriv>} />
            <Route path="/maskiner/:id/tjek/:tjekId" element={<DagligtTjekVis />} />
            <Route path="/dagligt-tjek" element={<KunSkriv><VaelgLift /></KunSkriv>} />
            <Route path="/paabud" element={<PaabudListe />} />
            <Route path="/paabud/:id" element={<PaabudDetalje />} />
            <Route path="/fund" element={<FundListe />} />
            <Route path="/fund/nyt" element={<KunSkriv><NytFund /></KunSkriv>} />
            <Route path="/fund/:id" element={<FundDetalje />} />
            <Route path="/fund/:id/foreslag-aendring" element={<KunSkriv><ForeslaaAendring /></KunSkriv>} />
            <Route path="/mine-forslag" element={<KunSkriv><MineForslag /></KunSkriv>} />
            <Route path="/admin/forslag" element={<AdminForslag />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
