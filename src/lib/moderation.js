import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';

/**
 * Meldingen behandelen. De database controleert bij elke actie of je beheerder bent;
 * de checks hier bepalen alleen of de knop zichtbaar is.
 */

export async function isAppAdmin() {
  const { data, error } = await supabase.rpc('is_app_admin');
  return !error && data === true;
}

export async function listReports(status = 'open') {
  const { data, error } = await supabase.rpc('admin_list_reports', { p_status: status });
  if (error) throw error;
  return data || [];
}

/** resolution: 'no_action' (geen overtreding) of 'warned' (gebruiker krijgt een waarschuwing) */
export async function resolveReport(reportId, resolution) {
  const { error } = await supabase.rpc('admin_resolve_report', { p_report_id: reportId, p_resolution: resolution });
  if (error) throw error;
}

/** Verbant de gebruiker, wist alle gegevens en verwijdert daarna de bestanden uit de opslag. */
export async function banUser(email, reason) {
  const { data: files, error } = await supabase.rpc('admin_ban_user', { p_email: email, p_reason: reason || null });
  if (error) throw error;
  const failed = [];
  for (const url of files || []) {
    const ok = await base44.integrations.Core.DeleteFile({ file_url: url }).catch(() => false);
    if (!ok) failed.push(url);
  }
  return { failedFiles: failed };
}
