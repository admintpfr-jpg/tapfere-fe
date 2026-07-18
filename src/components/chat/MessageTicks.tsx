import { Check, CheckCheck } from 'lucide-react';

export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

/**
 * WhatsApp-style delivery ticks, shown only on the current user's own messages.
 * - SENT      → single grey check
 * - DELIVERED → double grey check
 * - READ      → double blue check
 */
export default function MessageTicks({
  status,
  isMe,
}: {
  status?: MessageStatus;
  isMe: boolean;
}) {
  if (!isMe) return null;

  if (status === 'READ') {
    return <CheckCheck size={15} strokeWidth={2.5} className="text-sky-500" />;
  }
  if (status === 'DELIVERED') {
    return <CheckCheck size={15} strokeWidth={2.5} className="text-gray-400" />;
  }
  // SENT (or undefined = just sent, not yet acked)
  return <Check size={13} strokeWidth={3} className="text-gray-400" />;
}
