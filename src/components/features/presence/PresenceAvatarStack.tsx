'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { PresenceMember } from '@/stores/usePresenceStore';

interface PresenceAvatarStackProps {
  members: Map<string, PresenceMember>;
  maxVisible?: number;
  size?: number;
  className?: string;
  onClick?: () => void;
  'aria-expanded'?: boolean;
}

function getInitial(name: string): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

export function PresenceAvatarStack({
  members,
  maxVisible = 5,
  size = 28,
  className,
  onClick,
  'aria-expanded': ariaExpanded,
}: PresenceAvatarStackProps) {
  const shouldReduceMotion = useReducedMotion();
  const memberList = Array.from(members.values());
  const visible = memberList.slice(0, maxVisible);
  const overflow = memberList.length - maxVisible;
  const count = memberList.length;

  if (count === 0) return null;

  const readerLabel = count === 1 ? '1 reader in room' : `${count} readers in room`;

  const isClickable = !!onClick;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={cn(
        'flex items-center',
        isClickable && 'cursor-pointer min-h-[44px]',
        className,
      )}
      aria-label={readerLabel}
      role={isClickable ? 'button' : 'group'}
      tabIndex={isClickable ? 0 : undefined}
      aria-expanded={isClickable ? ariaExpanded : undefined}
      onClick={onClick}
      onKeyDown={isClickable ? handleKeyDown : undefined}
    >
      <AnimatePresence mode="popLayout">
        {visible.map((member, index) => (
          <motion.div
            key={member.id}
            layout={!shouldReduceMotion}
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: 'easeOut' }}
          >
            <motion.div
              animate={
                shouldReduceMotion
                  ? {}
                  : { scale: [1, 1.05, 1] }
              }
              transition={
                shouldReduceMotion
                  ? {}
                  : {
                      repeat: 2,
                      duration: 3,
                      ease: 'easeInOut',
                      delay: index * 0.5,
                    }
              }
              className="relative rounded-full border-2 border-white bg-amber-100 flex items-center justify-center overflow-hidden"
              style={{
                width: size,
                height: size,
                marginLeft: index === 0 ? 0 : -8,
                zIndex: maxVisible - index,
              }}
              title={member.name}
            >
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span
                  className="text-xs font-medium text-amber-700"
                  aria-hidden="true"
                >
                  {getInitial(member.name)}
                </span>
              )}
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
      {overflow > 0 && (
        <div
          className="relative rounded-full border-2 border-white bg-amber-50 flex items-center justify-center text-xs font-medium text-amber-700"
          style={{
            width: size,
            height: size,
            marginLeft: -8,
            zIndex: 0,
          }}
          data-testid="overflow-indicator"
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
