import {
  LANE_STATUS_LABEL,
  isLaneOpen,
  laneDef,
  type ContractLane,
  type Phase1Contract,
} from '@/types/phase1';
import { formatFullDate } from '@/lib/formatters';

export const ME_NAME = 'Lisa Farkas';

export type TabId = 'details' | 'documents' | 'comments' | 'notes' | 'activity';

export interface DocItem {
  id: string;
  name: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface CommentItem {
  id: string;
  author: string;
  text: string;
  when: string;
  isInternal: boolean;
}

export interface NoteItem {
  id: string;
  author: string;
  text: string;
  when: string;
}

export interface ActivityItem {
  icon: string;
  text: string;
  when: string;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function ynLabel(v: boolean | null | undefined): string {
  if (v == null) return 'Not specified';
  return v ? 'Yes' : 'No';
}

export function formatTerm(start: string | null, end: string | null): string {
  if (!start && !end) return '—';
  if (start && end) return `${formatFullDate(start)} – ${formatFullDate(end)}`;
  if (start) return `From ${formatFullDate(start)}`;
  return `Through ${formatFullDate(end)}`;
}

export function laneSummaryLabel(lanes: ContractLane[]): string {
  const open = lanes.filter(isLaneOpen);
  if (open.length === 0) return 'Ready to file';
  if (open.length === 1) return `With ${laneDef(open[0].id).label}`;
  return `In review · ${open.length} lanes`;
}

export function seedDocs(contract: Phase1Contract | undefined): DocItem[] {
  if (!contract) return [];
  return [
    {
      id: crypto.randomUUID(),
      name: `${contract.num} - Vendor draft.pdf`,
      size: 482133,
      uploadedBy: contract.requester,
      uploadedAt: contract.startDate ?? new Date().toISOString(),
    },
  ];
}

export function seedComments(contract: Phase1Contract | undefined): CommentItem[] {
  if (!contract) return [];
  return [
    {
      id: crypto.randomUUID(),
      author: contract.requester,
      text: 'Submitted the latest draft from the vendor. Anything you need from me?',
      when: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      isInternal: false,
    },
  ];
}

export function seedNotes(contract: Phase1Contract | undefined): NoteItem[] {
  if (!contract) return [];
  return [];
}

export function seedActivity(c: Phase1Contract | undefined): ActivityItem[] {
  if (!c) return [];
  const events: ActivityItem[] = [];
  events.push({
    icon: 'file-plus',
    text: `Contract created by ${c.requester}`,
    when: '12 days ago',
  });
  events.push({
    icon: 'identification-badge',
    text: `Procurement owner set to ${c.owner}`,
    when: '11 days ago',
  });
  c.lanes.forEach((l) => {
    if (['in_review', 'approved', 'waiting', 'complete'].includes(l.status)) {
      events.push({
        icon: 'arrow-right',
        text: `${laneDef(l.id).label} lane set to ${LANE_STATUS_LABEL[l.status]}`,
        when: formatFullDate(l.lastUpdated),
      });
    }
  });
  return events.reverse();
}
