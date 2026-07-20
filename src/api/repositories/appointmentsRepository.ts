import { mockStore } from '@/api/mockData';
import { delay, requireLiveSupabase, shouldUseMockApi } from '@/api/repositories/_utils';
import { DomainError, fromSupabaseError } from '@/lib/errors';
import { mapAppointment } from '@/lib/mappers';
import type { Appointment } from '@/types/domain';

export async function listAppointments(): Promise<Appointment[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.appointments];
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.from('appointments').select('*').order('starts_at', {
    ascending: true,
  });
  if (error) throw fromSupabaseError(error);
  return (data ?? []).map(mapAppointment);
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.appointments.find((a) => a.id === id) ?? null;
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw fromSupabaseError(error);
  return data ? mapAppointment(data) : null;
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

  const supabase = requireLiveSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw DomainError.unauthorized('You must be signed in to request an appointment.');
  }

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      customer_user_id: userData.user.id,
      notes: input.title,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      location: input.location ?? null,
      status: 'requested',
      timezone: 'Europe/Amsterdam',
    })
    .select('*')
    .single();
  if (error) throw fromSupabaseError(error);
  return mapAppointment(data);
}

export const appointmentsRepository = {
  list: listAppointments,
  get: getAppointment,
  request: requestAppointment,
};
