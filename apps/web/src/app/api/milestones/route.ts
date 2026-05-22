import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = Number.parseInt(searchParams.get('days') || '30', 10);
    const type = searchParams.get('type') || 'all'; // 'birthday', 'anniversary', 'all'

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    // Fetch employees with birthday and date_hired — exclude terminated/deleted records
    const { data: employees, error } = await supabase
      .from('employees')
      .select(
        'id, user_id, first_name, last_name, birthday, date_hired, position, department, date_terminated'
      )
      .is('deleted_at', null)
      .is('date_terminated', null);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch milestones' },
        { status: 500 }
      );
    }

    // Get user avatars
    const userIds = (employees || []).map((e: { user_id: string | null }) => e.user_id).filter(Boolean);
    let users: Array<{ id: string; avatar_url: string | null; role: string | null; status: string | null }> | null = null;
    if (userIds.length > 0) {
      const { data } = await supabase
        .from('users')
        .select('id, avatar_url, role, status')
        .in('id', userIds);
      users = data;
    }

    const userMap = new Map(
      (users || []).map((u) => [u.id, { avatar_url: u.avatar_url, role: u.role, status: u.status }])
    );

    // Department is stored as text directly on the employees table
    // No need to join with a departments table

    const milestones: Array<{
      employeeId: string;
      userId: string | null;
      fullName: string;
      avatarUrl: string | null;
      role: string | null;
      department: string | null;
      position: string | null;
      type: 'birthday' | 'anniversary';
      date: string;
      upcomingDate: string;
      daysUntil: number;
      yearsCount?: number;
    }> = [];

    for (const emp of employees || []) {
      const userData = emp.user_id ? userMap.get(emp.user_id) : null;

      // Skip terminated employees — date_terminated filter handles most cases;
      // this is a secondary guard for accounts where only users.status was updated.
      if (userData?.status === 'terminated') continue;

      const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();

      // Check birthdays
      if ((type === 'all' || type === 'birthday') && emp.birthday) {
        const birthday = new Date(emp.birthday);
        const upcomingBirthday = new Date(
          today.getFullYear(),
          birthday.getMonth(),
          birthday.getDate()
        );

        // If birthday already passed this year, check next year
        if (upcomingBirthday < today) {
          upcomingBirthday.setFullYear(upcomingBirthday.getFullYear() + 1);
        }

        const daysUntil = Math.ceil(
          (upcomingBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntil >= 0 && daysUntil <= days) {
          milestones.push({
            employeeId: emp.id,
            userId: emp.user_id,
            fullName,
            avatarUrl: userData?.avatar_url ?? null,
            role: userData?.role ?? null,
            department: emp.department || null,
            position: emp.position ?? null,
            type: 'birthday',
            date: emp.birthday,
            upcomingDate: upcomingBirthday.toISOString().split('T')[0] ?? '',
            daysUntil,
          });
        }
      }

      // Check work anniversaries
      if ((type === 'all' || type === 'anniversary') && emp.date_hired) {
        const hireDate = new Date(emp.date_hired);
        const upcomingAnniversary = new Date(
          today.getFullYear(),
          hireDate.getMonth(),
          hireDate.getDate()
        );

        if (upcomingAnniversary < today) {
          upcomingAnniversary.setFullYear(upcomingAnniversary.getFullYear() + 1);
        }

        const daysUntil = Math.ceil(
          (upcomingAnniversary.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntil >= 0 && daysUntil <= days) {
          const yearsCount = upcomingAnniversary.getFullYear() - hireDate.getFullYear();
          // Skip 0-year anniversaries — hired this year, no full year completed yet
          if (yearsCount < 1) continue;
          milestones.push({
            employeeId: emp.id,
            userId: emp.user_id,
            fullName,
            avatarUrl: userData?.avatar_url ?? null,
            role: userData?.role ?? null,
            department: emp.department || null,
            position: emp.position ?? null,
            type: 'anniversary',
            date: emp.date_hired,
            upcomingDate: upcomingAnniversary.toISOString().split('T')[0] ?? '',
            daysUntil,
            yearsCount,
          });
        }
      }
    }

    // Sort by soonest first
    milestones.sort((a, b) => a.daysUntil - b.daysUntil);

    // Group milestones
    const grouped = {
      today: milestones.filter((m) => m.daysUntil === 0),
      thisWeek: milestones.filter((m) => m.daysUntil > 0 && m.daysUntil <= 7),
      thisMonth: milestones.filter((m) => m.daysUntil > 7 && m.daysUntil <= 30),
      later: milestones.filter((m) => m.daysUntil > 30),
    };

    return NextResponse.json({
      data: milestones,
      grouped,
      summary: {
        total: milestones.length,
        birthdays: milestones.filter((m) => m.type === 'birthday').length,
        anniversaries: milestones.filter((m) => m.type === 'anniversary').length,
        today: grouped.today.length,
        thisWeek: grouped.thisWeek.length,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
