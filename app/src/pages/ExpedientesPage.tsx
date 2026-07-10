import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { col } from "@/lib/db";
import { useAuth, tieneRol, veTodasDelegaciones } from "@/auth/AuthContext";
import type { Expediente } from "@/types/domain";

export function ExpedientesPage() {
  const { t } = useTranslation();
  const { sesion } = useAuth();
  const [expedientes, setExpedientes] = useState<Expediente[] | null>(null);

  useEffect(() => {
    if (!sesion) return;
    // Aislamiento por delegación (D31): admin/dirección ven todas; el resto,
    // solo la suya. El filtro es obligatorio porque las reglas deniegan lo demás.
    const base = col.expedientes(sesion.tenantId);
    const q = veTodasDelegaciones(sesion)
      ? query(base, orderBy("creadoEn", "desc"))
      : query(base, where("delegacionId", "==", sesion.delegacionId), orderBy("creadoEn", "desc"));
    return onSnapshot(q, (snap) =>
      setExpedientes(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expediente)),
    );
  }, [sesion]);

  return (
    <section>
      <div className="titulo-con-accion">
        <h1>{t("expedientes.title")}</h1>
        {tieneRol(sesion, "comercial") && (
          <Link className="boton-enlace" to="/expedientes/nuevo">
            {t("expedientes.nuevo")}
          </Link>
        )}
      </div>
      {expedientes === null ? (
        <p>{t("common.loading")}</p>
      ) : expedientes.length === 0 ? (
        <p>{t("expedientes.empty")}</p>
      ) : (
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("expedientes.cliente")}</th>
                <th>{t("expedientes.tipo")}</th>
                <th>{t("expedientes.tipoOferta")}</th>
                <th>{t("expedientes.estado")}</th>
                <th>{t("expedientes.tareasPendientes")}</th>
                <th>{t("expedientes.creado")}</th>
              </tr>
            </thead>
            <tbody>
              {expedientes.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link to={`/expedientes/${e.id}`}>{e.clienteNombre}</Link>
                  </td>
                  <td>{t(`expedientes.tipos.${e.tipo}`)}</td>
                  <td>{t(`expedientes.ofertas.${e.tipoOferta}`)}</td>
                  <td>
                    <span className={`badge estado-${e.estado}`}>
                      {t(`expedientes.estados.${e.estado}`)}
                    </span>
                  </td>
                  <td>{e.tareas.filter((x) => x.estado === "pendiente").length}</td>
                  <td>{new Date(e.creadoEn).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
