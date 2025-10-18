export type BookingPolicies = {
  slot_increment_minutes: number; // default 30
  max_duration_minutes: number;   // default 90
  max_advance_days: number;       // default 7
  max_active_bookings_per_member: number; // default 2
  min_cancel_notice_minutes: number; // default 60
};

export type AvailabilitySlot = {
  start: Date;  // UTC
  end: Date;    // UTC
  isAvailable: boolean;
  reasons?: string[]; // e.g., ["booked", "blockout", "outside-hours"]
};
