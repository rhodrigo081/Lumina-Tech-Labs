import { infraLabel } from './infrastructure';

export interface ReportRow { label: string; value: string; }
export interface ReportSection { key: string; title: string; rows: ReportRow[]; }
export interface ParsedReport { title: string; meta: ReportRow[]; sections: ReportSection[]; notes: string[]; }

function splitRow(line: string): ReportRow | null {
  const i = line.indexOf(':');
  if (i <= 0) return null;
  const label = line.slice(0, i).trim();
  const raw = line.slice(i + 1).trim();
  return { label, value: infraLabel(raw) };
}

const isHeading = (line: string) => /[A-ZÀ-Ý]/.test(line) && line === line.toUpperCase() && !line.includes(':');

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export function parseReportText(text: string | undefined | null): ParsedReport | null {
  if (!text?.trim()) return null;
  const blocks = text.replace(/\r\n/g, '\n').split(/\n\s*\n/).map((b) => b.split('\n').filter((l) => l.trim()));
  const [head, ...rest] = blocks.filter((b) => b.length);
  if (!head) return null;

  const title = head[0].trim();
  const meta = head.slice(1).map(splitRow).filter((r): r is ReportRow => !!r);
  const sections: ReportSection[] = [];
  const notes: string[] = [];

  for (const block of rest) {
    const first = block[0].trim();
    if (isHeading(first) && block.length > 1) {
      const rows = block.slice(1).map(splitRow).filter((r): r is ReportRow => !!r);
      if (rows.length) { sections.push({ key: first, title: titleCase(first), rows }); continue; }
    }
    notes.push(block.map((l) => l.trim()).join(' '));
  }
  return sections.length ? { title, meta, sections, notes } : null;
}
