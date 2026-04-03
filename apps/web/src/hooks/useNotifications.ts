'use client';

import type { NotificationType } from '@/lib/notifications/presentation';
import { type NotificationFilters, queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// --- Types ---

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  expires_at: string | null;
}

interface NotificationListResponse {
  data: Array<NotificationRecord>;
  unreadCount: number;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// --- Hooks ---

/** Fetch paginated notifications for the current user */
export function useNotifications(filters: NotificationFilters = {}) {
  return useQuery({
    queryKey: queryKeys.notifications.list(filters),
    queryFn: async (): Promise<NotificationListResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', String(filters.page));
      if (filters.pageSize) params.append('pageSize', String(filters.pageSize));
      if (filters.isRead !== undefined) params.append('isRead', String(filters.isRead));
      if (filters.type) params.append('type', filters.type);

      const response = await fetch(`/api/notifications?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
  });
}

/** Poll unread notification count every 30s */
export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: async (): Promise<number> => {
      const params = new URLSearchParams({ isRead: 'false', pageSize: '1' });
      const response = await fetch(`/api/notifications?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch unread count');
      const data: NotificationListResponse = await response.json();
      return data.unreadCount;
    },
    refetchInterval: 30_000, // Poll every 30 seconds
    staleTime: 15_000,
  });
}

/** Mark a single notification as read */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<{ data: NotificationRecord }> => {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error('Failed to mark notification as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/** Mark all notifications as read */
export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ success: boolean }> => {
      const response = await fetch('/api/notifications', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to mark all as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/** Delete a notification */
export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean }> => {
      const response = await fetch(`/api/notifications?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete notification');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
