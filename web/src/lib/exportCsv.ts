/** Build a CSV string and trigger a browser download. */

import { isContractOverdue, isDueThisWeek, nextActionDue } from './phase1Data';
import type { Phase1Contract } from '@/types/phase1';

const CSV_HEADERS = [
  'Contract number',
  'Title',
  'Vendor',
  'Category',
  'Requester',
  'Procurement owner',
  'Priority',
  'Overall status',
  'Value (USD)',
  'Term start',
  'Term end',
  'Next action due',
  'Overdue',
  'Due this week',
  'Open lanes',
];

export function buildContractsCsv(rows: Phase1Contract[]): string {
  const body = rows.map(toCsvRow);
  return [CSV_HEADERS, ...body].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

function toCsvRow(c: Phase1Contract): string[] {
  const openLanes = c.lanes
    .filter((lane) => lane.status === 'in_review' || lane.status === 'waiting')
    .map((lane) => lane.id)
    .join('; ');

  return [
    c.num,
    c.title,
    c.vendor,
    c.category,
    c.requester,
    c.owner,
    c.priority,
    c.overallStatus,
    String(c.value),
    c.startDate ?? '',
    c.endDate ?? '',
    nextActionDue(c) ?? '',
    isContractOverdue(c) ? 'yes' : 'no',
    isDueThisWeek(c) ? 'yes' : 'no',
    openLanes,
  ];
}

function csvCell(value: string): string {
  const needsQuoting = /[",\r\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuoting ? `"${escaped}"` : escaped;
}

export function downloadContractsCsv(rows: Phase1Contract[], filename: string): void {
  const csv = buildContractsCsv(rows);
  // Excel-friendly UTF-8 BOM so accented characters render correctly.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
