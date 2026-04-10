import { Navigate, Route, Routes } from "react-router-dom";
import { AppFrame } from "./components/AppFrame";
import { DeploymentPage } from "./pages/DeploymentPage";
import { GalleryPage } from "./pages/GalleryPage";
import { HomePage } from "./pages/HomePage";
import { MyVotesPage } from "./pages/MyVotesPage";
import { ProposalDetailPage } from "./pages/ProposalDetailPage";
import { WalletProvider } from "./wallet";

export default function App() {
  return (
    <WalletProvider>
      <AppFrame>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/my-votes" element={<MyVotesPage />} />
          <Route path="/deployment" element={<DeploymentPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/proposal/:id" element={<ProposalDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppFrame>
    </WalletProvider>
  );
}
