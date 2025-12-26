/**
 * User Menu Component
 *
 * A refined dropdown menu displaying user info and sign out action.
 * Uses Headless UI for accessible, animated interactions.
 */

'use client';

import { Fragment } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Menu, Transition } from '@headlessui/react';
import {
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

function UserAvatar({
  user,
  initials,
  size = 'sm',
}: {
  user: { name?: string | null; image?: string | null };
  initials?: string | undefined;
  size?: 'sm' | 'md';
}) {
  const sizeClasses = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  if (user.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.image}
        alt={user.name ?? 'User avatar'}
        className={`${sizeClasses} rounded-full object-cover border border-border-default`}
      />
    );
  }

  if (initials) {
    return (
      <div className={`${sizeClasses} rounded-full bg-bg-tertiary border border-border-default flex items-center justify-center`}>
        <span className={`${textSize} font-medium text-text-secondary`}>
          {initials}
        </span>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses} rounded-full bg-bg-tertiary border border-border-default flex items-center justify-center`}>
      <UserCircleIcon className="h-5 w-5 text-text-tertiary" />
    </div>
  );
}

export function UserMenu() {
  const { data: session, status } = useSession();

  // Loading state - subtle skeleton
  if (status === 'loading') {
    return (
      <div className="ml-3 h-8 w-8 rounded-full bg-bg-tertiary animate-pulse" />
    );
  }

  // Not authenticated
  if (!session?.user) {
    return null;
  }

  const { user } = session;
  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Menu as="div" className="relative ml-3">
      <Menu.Button
        className={`
          flex items-center justify-center
          h-8 w-8 rounded-full
          transition-all duration-150
          hover:border-border-hover hover:bg-bg-hover
          focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary
        `}
      >
        <UserAvatar user={user} initials={initials} size="sm" />
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-150"
        enterFrom="opacity-0 scale-95 translate-y-1"
        enterTo="opacity-100 scale-100 translate-y-0"
        leave="transition ease-in duration-100"
        leaveFrom="opacity-100 scale-100 translate-y-0"
        leaveTo="opacity-0 scale-95 translate-y-1"
      >
        <Menu.Items
          className={`
            absolute right-0 mt-2 w-56
            origin-top-right
            rounded-lg
            border border-border-default
            bg-bg-secondary/95 backdrop-blur-xl
            shadow-xl
            focus:outline-none
            z-50
          `}
        >
          {/* User info section */}
          <div className="px-4 py-3 border-b border-border-subtle">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <UserAvatar user={user} initials={initials} size="md" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary truncate">
                  {user.name ?? 'User'}
                </p>
                <p className="text-xs text-text-tertiary truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Menu.Item>
              {({ active }: { active: boolean }) => (
                <button
                  onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                  className={`
                    flex w-full items-center gap-3 px-4 py-2.5
                    text-sm text-text-secondary
                    transition-colors duration-100
                    ${active ? 'bg-bg-hover text-text-primary' : ''}
                  `}
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                  Sign out
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
