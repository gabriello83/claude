import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { Layout } from "@/components/Layout";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { CatalogoPage } from "@/pages/CatalogoPage";
import { ExpedientesPage } from "@/pages/ExpedientesPage";
import { NuevoExpedientePage } from "@/pages/NuevoExpedientePage";
import { ExpedienteDetallePage } from "@/pages/ExpedienteDetallePage";

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
            <Route path="/expedientes" element={<ExpedientesPage />} />
            <Route path="/expedientes/nuevo" element={<NuevoExpedientePage />} />
            <Route path="/expedientes/:id" element={<ExpedienteDetallePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
