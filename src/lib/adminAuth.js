import { supabase } from '../supabase'

// Lista blanca de administradores para la UI (guards, navbar, vistas).
// ⚠️ Debe coincidir con el correo configurado en src/sql/003_secure_admin_rls.sql.
//
// Nada de lo que se decide aquí protege datos: un atacante puede modificar
// este archivo en su navegador y ver la interfaz de admin, pero cada INSERT/
// UPDATE/DELETE se valida en el servidor contra la RLS con el JWT firmado.
// Esta lista solo evita mostrar UI inservible a quien no es admin.
export const ADMIN_EMAILS = ['DuzielM@gmail.com']

export function isAdminEmail(email) {
  if (typeof email !== 'string') return false
  // Ambos lados normalizados: la RLS ya compara con lower() en el servidor;
  // aquí igual, para que una mayúscula en la lista no expulse al admin real.
  const normalized = email.trim().toLowerCase()
  return ADMIN_EMAILS.some((admin) => admin.trim().toLowerCase() === normalized)
}

// Consulta el estado real de la sesión al cliente de Supabase — nunca flags
// locales mutables. Devuelve la sesión solo si existe y pertenece a un admin.
export async function getAdminSession() {
  if (!supabase) return null

  const { data, error } = await supabase.auth.getSession()
  if (error || !data?.session) return null

  return isAdminEmail(data.session.user?.email) ? data.session : null
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

