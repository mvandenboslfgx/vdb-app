import {
  mapPortalAppointmentStatus,
  presentAppointmentListItem,
} from '@/lib/appointmentPresentation';

describe('appointmentPresentation', () => {
  it('maps SCHEDULED to scheduled', () => {
    expect(mapPortalAppointmentStatus('SCHEDULED')).toBe('scheduled');
    expect(mapPortalAppointmentStatus('CONFIRMED')).toBe('confirmed');
  });

  it('formats Amsterdam date/time without raw ISO', () => {
    const presented = presentAppointmentListItem(
      {
        title: 'Intakegesprek',
        startsAt: '2026-07-29T21:37:00.000Z',
        endsAt: '2026-07-29T22:37:00.000Z',
        location: 'Online Zoom',
        status: 'scheduled',
      },
      'nl',
      new Date('2026-07-29T10:00:00.000Z'),
    );
    expect(presented.title).toBe('Intakegesprek');
    expect(presented.dateLabel).not.toMatch(/T\d{2}:/);
    expect(presented.timeRangeLabel).toMatch(/\d{2}:\d{2}/);
    expect(presented.locationLabel).toBe('Online');
    expect(presented.statusKey).toBe('scheduled');
  });

  it('handles missing end and location', () => {
    const presented = presentAppointmentListItem(
      {
        title: '',
        startsAt: '2026-07-29T21:37:00.000Z',
        endsAt: '',
        location: null,
        status: 'confirmed',
      },
      'nl',
    );
    expect(presented.title).toBe('Afspraak');
    expect(presented.durationLabel).toBeNull();
    expect(presented.locationLabel).toBeNull();
  });
});
