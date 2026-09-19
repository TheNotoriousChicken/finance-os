import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeString(str: string): string {
  return str.trim().toUpperCase().replace(/\s+/g, ' ');
}

export function getMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getQuarter(date: Date = new Date()): { q: number; year: number; label: string } {
  const month = date.getMonth(); // 0-indexed
  const q = Math.floor(month / 3) + 1;
  return { q, year: date.getFullYear(), label: `Q${q} ${date.getFullYear()}` };
}

export function getQuarterBounds(date: Date = new Date()): { start: Date; end: Date } {
  const { q, year } = getQuarter(date);
  const startMonth = (q - 1) * 3; // 0-indexed
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
  return { start, end };
}

export function formatDate(date: Date | string, format: 'short' | 'long' | 'relative' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (format === 'relative') {
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
  }
  if (format === 'long') {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function daysUntil(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function sha256(str: string): string {
  const { createHash } = require('crypto');
  return createHash('sha256').update(str).digest('hex');
}
