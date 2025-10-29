import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Swap from './pages/Swap';
import UsersAndPayments from './pages/UsersAndPayments';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';
import Marketplace from './pages/Marketplace';
import CreateAuction from './pages/CreateAuction';
import AuctionDetail from './pages/AuctionDetail';
import Games from './pages/Games';
import CoinFlip from './pages/CoinFlip';
import Blackjack from './pages/Blackjack';
import Plinko from './pages/Plinko';
import Crash from './pages/Crash';
import Trading from './pages/Trading';
import NFTMarket from './pages/NFTMarket';
import MintNFT from './pages/MintNFT';
import NFTDetail from './pages/NFTDetail';
import MyNFTs from './pages/MyNFTs';

function App() {
  return (
    <Router>
      <ToastProvider>
        <AuthProvider>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/swap"
            element={
              <ProtectedRoute>
                <Swap />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <UsersAndPayments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/send"
            element={<Navigate to="/users" replace />}
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/marketplace"
            element={
              <ProtectedRoute>
                <Marketplace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/auctions"
            element={<Navigate to="/marketplace" replace />}
          />
          <Route
            path="/escrow"
            element={<Navigate to="/marketplace" replace />}
          />
          <Route
            path="/auctions/create"
            element={
              <ProtectedRoute>
                <CreateAuction />
              </ProtectedRoute>
            }
          />
          <Route
            path="/auctions/:id"
            element={
              <ProtectedRoute>
                <AuctionDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games"
            element={
              <ProtectedRoute>
                <Games />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/coinflip"
            element={
              <ProtectedRoute>
                <CoinFlip />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/blackjack"
            element={
              <ProtectedRoute>
                <Blackjack />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/plinko"
            element={
              <ProtectedRoute>
                <Plinko />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/crash"
            element={
              <ProtectedRoute>
                <Crash />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crypto"
            element={
              <ProtectedRoute>
                <Trading />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trading"
            element={
              <ProtectedRoute>
                <Trading />
              </ProtectedRoute>
            }
          />
          <Route
            path="/nft-market"
            element={
              <ProtectedRoute>
                <NFTMarket />
              </ProtectedRoute>
            }
          />
          <Route
            path="/nft/mint"
            element={
              <ProtectedRoute>
                <MintNFT />
              </ProtectedRoute>
            }
          />
          <Route
            path="/nft/:id"
            element={
              <ProtectedRoute>
                <NFTDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-nfts"
            element={
              <ProtectedRoute>
                <MyNFTs />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </Router>
  );
}

export default App;

