import Link from 'next/link';

// Fixed bottom navigation from the Zelli MVP (Figma 08/10/11/12). "For you" is
// the discovery feed (/listings) and "Shortlist" is /shortlist. Preferences
// routes to onboarding (the only preference editor today); Profile has no route
// yet, so it renders as an inert placeholder rather than a dead link.

export type ZelliNavKey = 'feed' | 'shortlist' | 'preferences' | 'profile';

interface NavItem {
  key: ZelliNavKey;
  href: string | null;
  icon: string;
  label: string;
}

const ITEMS: NavItem[] = [
  { key: 'feed', href: '/listings', icon: '⌂', label: 'For you' },
  { key: 'shortlist', href: '/shortlist', icon: '♡', label: 'Shortlist' },
  { key: 'preferences', href: '/onboarding', icon: '⚙', label: 'Preferences' },
  { key: 'profile', href: null, icon: '○', label: 'Profile' },
];

/** Height (px) the fixed bar occupies; pages should reserve this much bottom space. */
export const ZELLI_BOTTOM_NAV_HEIGHT = 64;

export default function ZelliBottomNav({ active }: { active: ZelliNavKey }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 flex h-16 items-center justify-around border-t border-zelli-border bg-zelli-surface pb-[env(safe-area-inset-bottom)]"
    >
      {ITEMS.map((item) => {
        const isActive = item.key === active;
        const inner = (
          <span
            className={`flex flex-col items-center gap-1 ${
              isActive ? 'text-zelli-accent' : 'text-zelli-ink'
            }`}
          >
            <span aria-hidden className="text-lg leading-none">
              {item.icon}
            </span>
            <span className="text-[11px] font-bold">{item.label}</span>
          </span>
        );

        if (!item.href) {
          return (
            <span key={item.key} aria-disabled className="opacity-40">
              {inner}
            </span>
          );
        }

        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-zelli-accent"
          >
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}
