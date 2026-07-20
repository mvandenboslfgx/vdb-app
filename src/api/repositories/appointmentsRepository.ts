import { mockStore } from '@/api/mockData';
import { delay, requireLiveSupabase, shouldUseMockApi } from '@/api/repositories/_utils';
import { DomainError, fromSupabaseError } from '@/lib/errors';
import { mapAppointment, mapAvailabilitySlot } from '@/lib/mappers';
import type { Appointment, AppointmentSlot } from '@/types/domain';

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

/**
 * List slots that are still bookable (RLS also enforces `is_bookable = true`
 * for non-staff, this filter just avoids fetching rows the caller cannot
 * book anyway).
 */
export async function listAvailableSlots(): Promise<AppointmentSlot[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [];
  }
  const supabase = requireLiveSupabase();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('availability_slots')
    .select('*')
    .eq('is_bookable', true)
    .gte('starts_at', nowIso)
    .order('starts_at', { ascending: true });
  if (error) throw fromSupabaseError(error);
  return (data ?? [])
    .filter((row) => row.booked_count < row.capacity)
    .map(mapAvailabilitySlot);
}

export interface BookSlotInput {
  slotId: string;
  title: string;
  notes?: string;
}

/**
 * Book a slot via the `book_appointment_slot` SECURITY DEFINER RPC. The
 * database performs the atomic capacity check + booked_count claim -- this
 * repository never writes to `availability_slots` directly.
 */
export async function bookSlot(input: BookSlotInput): Promise<Appointment> {
  if (shouldUseMockApi()) {
    await delay();
    const appointment: Appointment = {
      id: `appt-${Date.now()}`,
      title: input.title,
      startsAt: new Date().toISOString(),
      endsAt: new Date().toISOString(),
      status: 'requested',
      location: null,
      timezone: 'Europe/Amsterdam',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockStore.appointments.push(appointment);
    return appointment;
  }

  const supabase = requireLiveSupabase();
  const { data, error } = await supabase
    .rpc('book_appointment_slot', {
      p_slot_id: input.slotId,
      p_title: input.title,
      p_notes: input.notes ?? undefined,
    });
  if (error) throw fromSupabaseError(error);
  return mapAppointment(data);
}

/**
 * Cancel an appointment via the `cancel_appointment` SECURITY DEFINER RPC.
 * Freeing the linked slot's `booked_count` is handled by the
 * `trg_appointment_slot_capacity` trigger, not by this repository.
 */
export async function cancelAppointment(id: string, reason?: string): Promise<Appointment> {
  if (shouldUseMockApi()) {
    await delay();
    const appointment = mockStore.appointments.find((a) => a.id === id);
    if (!appointment) throw DomainError.notFound('Appointment not found');
    appointment.status = 'cancelled';
    appointment.updatedAt = new Date().toISOString();
    return { ...appointment };
  }

  const supabase = requireLiveSupabase();
  const { data, error } = await supabase
    .rpc('cancel_appointment', {
      p_appointment_id: id,
      p_reason: reason ?? undefined,
    });
  if (error) throw fromSupabaseError(error);
  return mapAppointment(data);
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
  listAvailableSlots,
  bookSlot,
  cancelAppointment,
};
