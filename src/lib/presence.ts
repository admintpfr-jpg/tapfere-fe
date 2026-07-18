import { formatDistanceToNow } from 'date-fns';

/** Human-readable presence subtitle for a chat header. */
export function formatPresence(
  online: boolean,
  lastSeen: string | null,
): string {
  if (online) return 'Online';
  if (!lastSeen) return 'Offline';
  return `Last seen ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}`;
}
