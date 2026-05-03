import { Navigate, Route, Routes } from "react-router-dom";
import { AppFrame } from "./components/AppFrame";
import { DeploymentPage } from "./pages/DeploymentPage";
import { GalleryPage } from "./pages/GalleryPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { MyVotesPage } from "./pages/MyVotesPage";
import { ProposalDetailPage } from "./pages/ProposalDetailPage";
import { I18nProvider } from "./i18n";
import { WalletProvider } from "./wallet";

export default function App() {
  return (
    <I18nProvider>
      <WalletProvider>
        <AppFrame>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/my-votes" element={<MyVotesPage />} />
            <Route path="/admin" element={<DeploymentPage />} />
            <Route path="/deployment" element={<DeploymentPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/proposal/:id" element={<ProposalDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppFrame>
      </WalletProvider>
    </I18nProvider>
  );
}
