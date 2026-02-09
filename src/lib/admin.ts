export function getAdminIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? '').split(',').filter(Boolean);
}

export function isAdmin(userId: string): boolean {
  return getAdminIds().includes(userId);
}
