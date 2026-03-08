import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isAnnouncementAdmin } from '../../_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAnnouncementAdmin(role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Fetch announcement with target info
    const { data: announcement, error: announcementError } = await supabase
      .from('announcements')
      .select(
        'id, title, status, read_count, published_at, target_roles, target_departments, target_employees'
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (announcementError || !announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    // Fetch all reads with user/employee data for breakdowns
    const {
      data: reads,
      error: readsError,
      count: readCountExact,
    } = await supabase
      .from('announcement_reads')
      .select('id, user_id, read_at', { count: 'exact' })
      .eq('announcement_id', id)
      .order('read_at', { ascending: true });

    if (readsError) {
      return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
    }

    const readRecords = (reads ?? []) as Array<{ id: string; user_id: string; read_at: string }>;

    // Time series: daily read counts
    const dailyMap = new Map<string, number>();
    for (const read of readRecords) {
      const key = read.read_at.slice(0, 10);
      dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
    }
    const timeSeries = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }));

    // Unique readers
    const uniqueReaderIds = new Set(readRecords.map((r) => r.user_id));
    const uniqueReaders = uniqueReaderIds.size;

    // Fetch reader profiles for role/department breakdown
    const viewsByRole: Record<string, number> = {};
    const viewsByDepartment: Record<string, number> = {};

    if (uniqueReaderIds.size > 0) {
      const readerIdsArr = Array.from(uniqueReaderIds);

      // Fetch users with roles
      const { data: readerUsers } = await supabase
        .from('users')
        .select('id, role')
        .in('id', readerIdsArr);

      if (readerUsers) {
        for (const u of readerUsers) {
          const r = u.role ?? 'unknown';
          viewsByRole[r] = (viewsByRole[r] ?? 0) + 1;
        }
      }

      // Fetch employees with departments
      const { data: readerEmployees } = await supabase
        .from('employees')
        .select('user_id, department_id')
        .in('user_id', readerIdsArr);

      if (readerEmployees) {
        const deptIds = [
          ...new Set(readerEmployees.map((e: { department_id: string | null }) => e.department_id).filter(Boolean)),
        ] as Array<string>;

        let deptNames: Record<string, string> = {};
        if (deptIds.length > 0) {
          const { data: depts } = await supabase
            .from('departments')
            .select('id, name')
            .in('id', deptIds);
          if (depts) {
            deptNames = Object.fromEntries(depts.map((d: { id: string; name: string }) => [d.id, d.name]));
          }
        }

        for (const emp of readerEmployees) {
          const deptName = emp.department_id
            ? (deptNames[emp.department_id] ?? 'Unknown')
            : 'No Department';
          viewsByDepartment[deptName] = (viewsByDepartment[deptName] ?? 0) + 1;
        }
      }
    }

    // Calculate targeted users count (approximate)
    let totalTargeted = 0;
    const hasTargeting =
      announcement.target_roles?.length > 0 ||
      announcement.target_departments?.length > 0 ||
      announcement.target_employees?.length > 0;

    if (hasTargeting) {
      // Count targeted users from employees/roles/departments
      const { count: targetedCount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null);
      totalTargeted = targetedCount ?? 0;
    } else {
      // If no targeting, all active users are targeted
      const { count: allUsersCount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null);
      totalTargeted = allUsersCount ?? 0;
    }

    const readRate = totalTargeted > 0 ? Math.round((uniqueReaders / totalTargeted) * 100) : 0;

    // Average time to read (from published_at)
    let avgTimeToReadMs: number | null = null;
    if (announcement.published_at && readRecords.length > 0) {
      const publishedAt = new Date(announcement.published_at).getTime();
      const totalReadTime = readRecords.reduce((sum, r) => {
        return sum + (new Date(r.read_at).getTime() - publishedAt);
      }, 0);
      avgTimeToReadMs = totalReadTime / readRecords.length;
    }

    return NextResponse.json({
      data: {
        announcement,
        totalViews: readCountExact ?? 0,
        uniqueReaders,
        totalTargeted,
        readRate,
        avgTimeToReadMs,
        viewsByRole,
        viewsByDepartment,
        timeSeries,
        reads: readRecords,
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/announcements/[id]/analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
