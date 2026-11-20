/** Convierte errores de Supabase/Postgres en mensajes claros en español. */
export function friendlyError(err: unknown): string {
  const raw =
    typeof err === 'string' ? err
    : err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message)
    : 'Error desconocido';

  // Mensajes propios de la base de datos: "CODIGO: texto legible"
  const m = raw.match(/^([A-Z_]{4,}):\s*(.+)$/s);
  if (m) return m[2];

  if (raw === 'SUPABASE_NO_CONFIGURADO') return 'El backend (Supabase) no está configurado. Revise el archivo .env.local (vea README).';
  if (raw === 'FECHA_INVALIDA') return 'La fecha u hora no es válida.';
  if (/Invalid login credentials/i.test(raw)) return 'Correo o contraseña incorrectos.';
  if (/Email not confirmed/i.test(raw)) return 'Debe confirmar su correo antes de iniciar sesión. Revise su bandeja de entrada.';
  if (/User already registered/i.test(raw)) return 'Ya existe una cuenta con ese correo. Inicie sesión.';
  if (/Password should be at least/i.test(raw)) return 'La contraseña debe tener al menos 8 caracteres.';
  if (/rate limit/i.test(raw)) return 'Demasiados intentos. Espere unos minutos e intente de nuevo.';
  if (/Failed to fetch|NetworkError|fetch failed/i.test(raw)) return 'No hay conexión con el servidor. Verifique su internet.';
  if (/row-level security|permission denied/i.test(raw)) return 'No tiene permiso para realizar esta acción.';
  if (/appointments_time_order/.test(raw)) return 'La hora de fin debe ser posterior a la de inicio.';
  if (/appointments_customer_phone_check/.test(raw)) return 'El teléfono no es válido (7 a 20 dígitos).';
  if (/appointments_vehicle_plate_check/.test(raw)) return 'La placa no es válida (3 a 10 letras/números).';
  if (/business_invitations_pending_email_idx|duplicate key/.test(raw)) return 'Ese registro ya existe.';
  if (/violates check constraint/.test(raw)) return 'Algún dato no es válido. Revise el formulario.';
  return raw;
}
