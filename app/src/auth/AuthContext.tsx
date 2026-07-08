import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { Rol } from "@/types/domain";

export interface SesionUsuario {
  user: User;
  /** Tenant y roles llegan como custom claims del token (propuesta técnica §2) */
  tenantId: string;
  roles: Rol[];
}

interface AuthContextValue {
  sesion: SesionUsuario | null;
  cargando: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<SesionUsuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setSesion(null);
        setCargando(false);
        return;
      }
      const token = await user.getIdTokenResult();
      const tenantId = (token.claims.tenantId as string) ?? "";
      const roles = (token.claims.roles as Rol[]) ?? [];
      setSesion({ user, tenantId, roles });
      setCargando(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ sesion, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

export function tieneRol(sesion: SesionUsuario | null, ...roles: Rol[]): boolean {
  if (!sesion) return false;
  // Dirección tiene visibilidad transversal de todos los pasos (D17)
  if (sesion.roles.includes("admin") || sesion.roles.includes("direccion")) return true;
  return roles.some((r) => sesion.roles.includes(r));
}
