import { useEffect } from 'react';
import { supabase } from '../services/supabaseClient.js';
import { useApp } from '../context/useApp.js';

// Subscribes to Supabase Realtime on the appointments table.
// When another user creates/updates/deletes an appointment, the local state
// is updated automatically — preventing double-booking across sessions.
export function useRealtime() {
  const { actions } = useApp();

  useEffect(() => {
    const channel = supabase
      .channel('appointments-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'appointments' }, (payload) => {
        const row = payload.new;
        actions.addAppointment(toApiShape(row));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'appointments' }, (payload) => {
        const row = payload.new;
        actions.updateAppointment(toApiShape(row));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'appointments' }, (payload) => {
        actions.deleteAppointment(payload.old.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}

// Mirror of backend toApiShape — converts DB snake_case to camelCase
function toApiShape(row) {
  return {
    id:            row.id,
    firstName:     row.first_name,
    lastName:      row.last_name,
    address:       row.address,
    contactNumber: row.contact_number,
    facebookUrl:   row.facebook_url   ?? '',
    date:          row.date,
    startTime:     row.start_time,
    endTime:       row.end_time,
    procedure:     row.procedure,
    doctor:        row.doctor,
    status:        row.status,
    notes:         row.notes          ?? '',
    clientId:      row.client_id      ?? null,
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
  };
}