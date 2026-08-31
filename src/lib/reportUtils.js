import { base44 } from '@/api/base44Client';

const STORAGE_KEY = 'reported_user_emails';

export function getLocalReportedEmails() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function addLocalReportedEmail(email) {
  if (!email) return;
  try {
    const list = getLocalReportedEmails();
    if (!list.includes(email)) {
      list.push(email);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  } catch (e) {}
}

export async function fetchReportedEmails(userEmail) {
  const local = getLocalReportedEmails();
  if (!userEmail) return new Set(local);
  try {
    const reports = await base44.entities.Report.filter({ reporter_email: userEmail }).catch(() => []);
    const serverEmails = reports.map((r) => r.reported_email).filter(Boolean);
    const combined = new Set([...local, ...serverEmails]);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...combined]));
    } catch (e) {}
    return combined;
  } catch (e) {
    return new Set(local);
  }
}
