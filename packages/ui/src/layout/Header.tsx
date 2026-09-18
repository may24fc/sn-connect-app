'use client';

import {
  Bell,
  ChevronDown,
  CircleHelp,
  Gift,
  Grid2x2,
  LogOut,
  Menu,
  Moon,
  Phone,
  Search,
  Settings,
  Sun,
  Trophy,
  User,
} from 'lucide-react';
import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../primitives/avatar';
import { Badge } from '../primitives/badge';
import { Button } from '../primitives/button';
import { CountBadge } from '../primitives/count-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../primitives/dropdown-menu';
import { Input } from '../primitives/input';

export interface HeaderUser {
  name: string;
  email: string;
  avatarUrl?: string;
  role: string;
}

export interface HeaderProps {
  user: HeaderUser;
  onMenuToggle?: () => void;
  onSearch?: (query: string) => void;
  onLogout: () => void;
  onProfileClick: () => void;
  onSettingsClick?: () => void;
  /** @deprecated Use notificationSlot instead */
  notificationCount?: number;
  /** @deprecated Use notificationSlot instead */
  onNotificationsClick?: () => void;
  /** Render slot for the notification bell component (replaces legacy notificationCount/onNotificationsClick) */
  notificationSlot?: React.ReactNode;
  /** Render slot for the AI assistant icon button (renders beside the notification bell) */
  aiChatSlot?: React.ReactNode;
  /** Callback for the Help / guided tour button */
  onHelpClick?: (() => void) | undefined;
  showMobileMenu?: boolean;
  title?: string;
  /** Current theme value ('light' | 'dark' | 'system') */
  theme?: string | undefined;
  /** Callback to change the theme */
  onThemeChange?: (theme: string) => void;
}

export function Header({
  user,
  onMenuToggle,
  onSearch,
  onLogout,
  onProfileClick,
  onSettingsClick,
  notificationCount = 0,
  onNotificationsClick,
  notificationSlot,
  aiChatSlot,
  onHelpClick,
  showMobileMenu = true,
  title,
  theme,
  onThemeChange,
}: HeaderProps): React.ReactNode {
  const [searchQuery, setSearchQuery] = React.useState('');

  const formatRoleLabel = (role: string): string => {
    return role
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  };

  const handleSearchSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Booking link for the "Call with Steven" action. Set in the hosting environment.
  const bookingUrl =
    process.env.NEXT_PUBLIC_CALL_WITH_STEVEN_URL ?? process.env.NEXT_PUBLIC_STEVEN_BOOKING_URL;
  const embedUrl =
    process.env.NEXT_PUBLIC_CALL_WITH_STEVEN_EMBED_URL ??
    process.env.NEXT_PUBLIC_STEVEN_BOOKING_EMBED_URL;

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card px-4 shadow-[0_1px_0_rgb(23_80_99/0.025)] lg:px-6">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {showMobileMenu && onMenuToggle && (
          <Button
            variant="ghost"
            size="icon"
            className="group text-muted-foreground hover:bg-primary-muted hover:text-primary lg:hidden"
            onClick={onMenuToggle}
            aria-label="Toggle menu"
          >
            <Menu
              className="h-5 w-5 transition-colors"
              strokeWidth={1.5}
            />
          </Button>
        )}

        {title && (
          <h1 className="font-heading text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h1>
        )}

        {/* Search Bar */}
        {onSearch && (
          <form onSubmit={handleSearchSubmit} className="hidden md:flex md:w-80">
            <div className="relative w-full">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                strokeWidth={1.5}
              />
              <Input
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-80 rounded-md border-border bg-secondary/55 pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:bg-card"
              />
            </div>
          </form>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Call with Steven: show when booking or embed env is provided. If an embed URL is configured, open the internal embed page; otherwise open the external booking link in a new tab. */}
        {(bookingUrl || embedUrl) &&
          (embedUrl ? (
            <Button asChild variant="ghost" size="icon">
              <a href="/booking/steven" aria-label="Call with Steven">
                <Phone className="h-5 w-5" strokeWidth={1.5} />
              </a>
            </Button>
          ) : (
            <Button asChild variant="ghost" size="icon">
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Call with Steven"
              >
                <Phone className="h-5 w-5" strokeWidth={1.5} />
              </a>
            </Button>
          ))}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="group gap-2 px-2"
              aria-label="Open company activities"
            >
              <Trophy
                className="h-5 w-5 transition-colors"
                strokeWidth={1.5}
              />
              <span className="hidden xl:inline">Activities</span>
              <ChevronDown className="hidden h-3.5 w-3.5 xl:inline" strokeWidth={1.5} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Company activities</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/leaderboard">
                <Trophy className="mr-2 h-4 w-4" />
                Company Leaderboard
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/bingo">
                <Grid2x2 className="mr-2 h-4 w-4" />
                Wellness Bingo
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/christmas-tree">
                <Gift className="mr-2 h-4 w-4" />
                Christmas Wish Tree
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Help / Guided Tour */}
        {onHelpClick && (
          <Button
            variant="ghost"
            size="icon"
            className="group text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={onHelpClick}
            aria-label="Help — start guided tour"
          >
            <CircleHelp
              className="h-5 w-5 text-zinc-500 dark:text-zinc-400 transition-colors group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
              strokeWidth={1.5}
            />
          </Button>
        )}

        {/* AI Assistant */}
        {aiChatSlot}

        {/* Notifications */}
        {notificationSlot ??
          (onNotificationsClick && (
            <Button
              variant="ghost"
              size="icon"
              className="group relative text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={onNotificationsClick}
              aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ''}`}
            >
              <Bell
                className="h-5 w-5 text-zinc-500 dark:text-zinc-400 transition-colors group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
                strokeWidth={1.5}
              />
              {notificationCount > 0 && (
                <CountBadge
                  className="absolute -top-1 -right-1"
                  variant="danger"
                  size="sm"
                  count={notificationCount}
                  max={9}
                />
              )}
            </Button>
          ))}

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              data-tour="user-menu"
              aria-label="Open profile menu"
            >
              <Avatar className="h-8 w-8 ring-1 ring-primary/20">
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start text-left md:flex">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {user.name}
                </span>
                <Badge
                  variant="secondary"
                  className="text-xs font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                >
                  {formatRoleLabel(user.role)}
                </Badge>
              </div>
              <ChevronDown className="h-4 w-4 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover border border-border">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{user.name}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-200 dark:bg-zinc-800" />
            <DropdownMenuItem
              onClick={onProfileClick}
              className="text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <User className="mr-2 h-4 w-4 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} />
              Profile
            </DropdownMenuItem>
            {onSettingsClick && (
              <DropdownMenuItem
                onClick={onSettingsClick}
                className="text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <Settings
                  className="mr-2 h-4 w-4 text-zinc-500 dark:text-zinc-400"
                  strokeWidth={1.5}
                />
                Settings
              </DropdownMenuItem>
            )}
            {onThemeChange && (
              <DropdownMenuItem
                onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
                className="text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {theme === 'dark' ? (
                  <Sun className="mr-2 h-4 w-4 text-amber-500" strokeWidth={1.5} />
                ) : (
                  <Moon
                    className="mr-2 h-4 w-4 text-zinc-500 dark:text-zinc-400"
                    strokeWidth={1.5}
                  />
                )}
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-zinc-200 dark:bg-zinc-800" />
            <DropdownMenuItem
              onClick={onLogout}
              className="text-rose-600 dark:text-rose-400 focus:text-rose-600 dark:focus:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <LogOut className="mr-2 h-4 w-4 text-rose-500" strokeWidth={1.5} />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
