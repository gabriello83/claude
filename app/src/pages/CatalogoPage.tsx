import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { db } from "@/lib/firebase";
import { useAuth } from "@/auth/AuthContext";
import type { ModeloMaquina } from "@/types/domain";

export function CatalogoPage() {
  const { t } = useTranslation();
  const { sesion } = useAuth();
  const [modelos, setModelos] = useState<ModeloMaquina[] | null>(null);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    if (!sesion) return;
    const ref = collection(db, "tenants", sesion.tenantId, "modelosMaquina");
    getDocs(query(ref, orderBy("codigo")))
      .then((snap) =>
        setModelos(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ModeloMaquina)),
      )
      .catch(() => setModelos([]));
  }, [sesion]);

  const visibles = useMemo(() => {
    if (!modelos) return [];
    const q = filtro.trim().toLowerCase();
    if (!q) return modelos;
    return modelos.filter((m) =>
      [m.codigo, m.marca, m.modelo, m.clase].join(" ").toLowerCase().includes(q),
    );
  }, [modelos, filtro]);

  if (modelos === null) return <p>{t("common.loading")}</p>;

  return (
    <section>
      <h1>{t("catalogo.title")}</h1>
      <input
        className="buscador"
        placeholder={t("catalogo.buscar")}
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
      />
      {modelos.length === 0 ? (
        <p>{t("catalogo.empty")}</p>
      ) : (
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("catalogo.codigo")}</th>
                <th>{t("catalogo.clase")}</th>
                <th>{t("catalogo.marca")}</th>
                <th>{t("catalogo.modelo")}</th>
                <th>{t("catalogo.canales")}</th>
                <th>{t("catalogo.filas")}</th>
                <th>{t("catalogo.columnas")}</th>
                <th>{t("catalogo.contenedores")}</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((m) => (
                <tr key={m.id}>
                  <td>{m.codigo}</td>
                  <td>{m.clase}</td>
                  <td>{m.marca}</td>
                  <td>{m.modelo}</td>
                  <td>{m.canales}</td>
                  <td>{m.filas}</td>
                  <td>{m.columnas}</td>
                  <td>{m.contenedores}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
