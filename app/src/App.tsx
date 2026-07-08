import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { Layout } from "@/components/Layout";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { CatalogoPage } from "@/pages/CatalogoPage";

function RutasPrivadas() {
  const { sesion, cargando } = useAuth();
  const { t } = useTranslation();
  if (cargando) return <p className="pantalla-carga">{t("common.loading")}</p>;
  if (!sesion) return <Navigate to="/login" replace />;
  return <Layout />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RutasPrivadas />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/catalogo" element={<CatalogoPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
