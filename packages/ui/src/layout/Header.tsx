'use client';

import { Bell, CircleHelp, LogOut, Menu, Search, Settings, User } from 'lucide-react';
import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../primitives/avatar';
import { Badge } from '../primitives/badge';
import { Button } from '../primitives/button';
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
}: HeaderProps): React.ReactNode {
  const [searchQuery, setSearchQuery] = React.useState('');

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

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 lg:px-6">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {showMobileMenu && onMenuToggle && (
          <Button
            variant="ghost"
            size="icon"
            className="group lg:hidden text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={onMenuToggle}
            aria-label="Toggle menu"
          >
            <Menu
              className="h-5 w-5 text-zinc-500 dark:text-zinc-400 transition-colors group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
              strokeWidth={1.5}
            />
          </Button>
        )}

        {title && (
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
            {title}
          </h1>
        )}

        {/* Search Bar */}
        {onSearch && (
          <form onSubmit={handleSearchSubmit} className="hidden md:flex md:w-80">
            <div className="relative w-full">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                strokeWidth={1.5}
              />
              <Input
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-80 h-9 pl-9 pr-4 text-sm bg-zinc-100 dark:bg-zinc-800 border-0 rounded-md placeholder:text-zinc-500 focus:ring-2 focus:ring-indigo-600/20 focus:bg-white dark:focus:bg-zinc-900"
              />
            </div>
          </form>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
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
                <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-rose-600 text-[10px] font-medium text-white">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
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
            >
              <Avatar className="h-8 w-8">
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                <AvatarFallback className="bg-indigo-600 text-white text-xs">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start text-left md:flex">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {user.name}
                </span>
                <Badge
                  variant="secondary"
                  className="text-xs font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 capitalize"
                >
                  {user.role}
                </Badge>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
          >
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
