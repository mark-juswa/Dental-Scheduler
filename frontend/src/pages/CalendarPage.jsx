import CalendarWrap from '../components/calendar/CalendarWrap.jsx';

export default function CalendarPage() {
  return (
    <div className="view active" id="view-calendar" style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
      <CalendarWrap />
    </div>
  );
}