import { mockStore } from '@/api/mockData';
import { delay, shouldUseMockApi } from '@/api/repositories/_utils';
import { getSupabase } from '@/lib/supabase';
import type { Appointment } from '@/types/domain';

export async function listAppointments(): Promise<Appointment[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.appointments];
  }
  const supabase = getSupabase();
  if (!supabase) return [...mockStore.appointments];
  const { data, error } = await supabase.from('appointments').select('*').order('starts_at', {
    ascending: true,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as Appointment[];
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.appointments.find((a) => a.id === id) ?? null;
  }
  const supabase = getSupabase();
  if (!supabase) return mockStore.appointments.find((a) => a.id === id) ?? null;
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Appointment | null;
}

export async function requestAppointment(input: {
  title: string;
  startsAt: string;
  endsAt: string;
  location?: string | null;
}): Promise<Appointment> {
  if (shouldUseMockApi()) {
    await delay();
    const appointment: Appointment = {
      id: `appt-${Date.now()}`,
      title: input.title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: 'requested',
      location: input.location ?? null,
      timezone: 'Europe/Amsterdam',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockStore.appointments.push(appointment);
    return appointment;
  }

  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      title: input.title,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      location: input.location ?? null,
      status: 'requested',
      timezone: 'Europe/Amsterdam',
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Appointment;
}

export const appointmentsRepository = {
  list: listAppointments,
  get: getAppointment,
  request: requestAppointment,
};
