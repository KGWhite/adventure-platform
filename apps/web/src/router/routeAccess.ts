import type { Role } from '../types/auth.js';

// Big screens and the /status kiosk are read-only and need no login
export const isPublicPath = (path: string) => path.startsWith('/display') || path.startsWith('/status');

// World node controls that change game state: STAFF or ADMIN only
export const isStaffPath = (path: string) =>
  path.startsWith('/staff') || path.startsWith('/actor') || path.startsWith('/guild');

export const canAccess = (role: Role, path: string) => {
  if (path.startsWith('/admin')) return role === 'ADMIN';
  if (isStaffPath(path)) return role === 'STAFF' || role === 'ADMIN';
  if (path.startsWith('/user')) return role !== 'STAFF';
  return false;
};

export const homePath = (role: Role) => {
  if (role === 'ADMIN') return '/admin';
  if (role === 'STAFF') return '/staff';
  return '/user';
};

// Where to go after login: back to the page that asked for it (?next=), if
// this role may open it, otherwise the role's home page.
export const landingPath = (role: Role) => {
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && canAccess(role, next) ? next : homePath(role);
};
