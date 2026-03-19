# Dental Clinic Scheduling App - Component Analysis

## Overview
This document provides a detailed analysis of the Settings page and procedure-related components in the dental clinic scheduling app, focusing on color management, appointment creation/display, and UI architecture.

---

## 1. PROCEDURE DATA STRUCTURE

### 1.1 Procedure Definitions (`constants.js`)

**PROC_LABELS** - Human-readable labels for 12 procedures:
```javascript
extraction, filling, oralProphylaxis, denture, ortho, prosto, 
consultation, other, cleaning, rootCanal, orthodontics, whitening
```

**PROC_COLORS** - Default color schemes for each procedure (immutable defaults):
- Each procedure has three color channels: `bg` (background), `border` (accent/border), `text`
- Format: `{ bg: '#hexcolor', border: '#hexcolor', text: '#hexcolor' }`
- Examples:
  - extraction: red tones (#fee2e2 bg, #dc2626 border, #7f1d1d text)
  - filling: blue tones (#dbeafe bg, #1d4ed8 border, #1e3a8a text)
  - oralProphylaxis: green tones (#dcfce7 bg, #16a34a border, #14532d text)
  - whitening: cyan tones (#cffafe bg, #0891b2 border, #164e63 text)

**PROCEDURES** - Dropdown options for appointment creation:
- Array of `{ value, label }` objects for 8 core procedures
- Subset: extraction, filling, oralProphylaxis, denture, ortho, prosto, consultation, other

---

## 2. PROCEDURE COLOR CUSTOMIZATION FLOW

### 2.1 Hook: `useProcColors()`

**Purpose**: Provides merged color map combining defaults + user custom overrides

**Logic**:
1. Gets `state.settings.procColors` (custom user-saved overrides)
2. Iterates through all PROC_COLORS defaults
3. **Merges per-procedure**: custom colors override defaults for individual channels
4. Returns merged object with same structure as PROC_COLORS

**Usage Pattern**:
```javascript
const PROC_COLORS = useProcColors();
const color = PROC_COLORS[appt.procedure];  // { bg, border, text }
```

**Key Feature**: Partial overrides allowed - user can customize only specific channels (e.g., just bg) while keeping other channels as defaults.

### 2.2 Settings Page: Procedure Color Editor

**Location**: `SettingsPage.jsx` - "Procedure Colors" section (full-width card, lines 234-418)

**Features**:

#### Collapsed View (Row-level):
- **Visual Preview**: 
  - Chevron icon (collapsed/expanded state)
  - Colored dot showing border color
  - Label (e.g., "Extraction")
  - Three color swatches (bg, border, text) as small squares
  - Sample chip showing full color scheme
  - "CUSTOM" badge if procedure has overrides
  
- **Interaction**: Click row to expand/collapse

#### Expanded View (Edit Panel):
- **Live Preview Block**: Shows how appointment appears with current colors
  - Background colored card with left border
  - Icon, patient name, time range, procedure label, status badge
  
- **Color Channel Rows** (3 channels per procedure):
  1. **Background** (bg)
     - Icon: paint bucket
     - Hint: "Card fill color"
     - Display: hex value + color picker button
  
  2. **Accent/Border** (border)
     - Icon: border style
     - Hint: "Left border & accent"
     - Display: hex value + color picker button
  
  3. **Text** (text)
     - Icon: font
     - Hint: "Label & detail text"
     - Display: hex value + color picker button

- **Color Picker**: 
  - HTML `<input type="color">` hidden under colored label
  - Interactive hover effects (scale + shadow)
  - Triggers `saveProcColor(proc, channel, value)` on change

- **Reset Controls**:
  - Per-procedure reset: "Reset [Procedure] to default" (appears if customized)
  - Global reset: "Reset All" button in header

**Data Flow**:
1. User picks color in picker
2. `saveProcColor(proc, channel, value)` called
3. Updates `settings.procColors[proc][channel]` in state
4. Merged into `settings` object
5. Sent to backend via `settingsApi.save()`
6. UI refreshes immediately via `useProcColors()` hook

**Helper Functions**:
- `saveProcColor(proc, channel, value)`: Saves single color channel
- `resetProcColor(proc)`: Removes all overrides for one procedure
- `resetAllProcColors()`: Clears all custom colors (returns to defaults)
- `isCustomized(proc)`: Checks if procedure has any custom colors saved

---

## 3. PROCEDURE COLORS IN APPOINTMENT CREATION

### 3.1 AppointmentModal Component

**Location**: `AppointmentModal.jsx` - Modal dialog for creating/editing appointments

**Procedure Handling**:
- **Selection**: Dropdown with PROCEDURES array from constants
- **Field**: `form.procedure` stored in appointment object
- **Required**: Yes (validation ensures filled)

**Color Integration**: None visible in modal itself
- Procedure selected but colors only applied when displaying

**Form Fields**:
- Patient info: firstName, lastName, contactNumber, facebookUrl
- Address: Structured Philippines address (region, province, city, barangay)
- Appointment details: date, startTime, endTime
- **Procedure**: Select from list
- Assigned Doctor: dr1 or dr2
- Status: pending, confirmed, completed, cancelled
- Notes: Optional additional info

**Validations**:
- All required fields must be filled
- End time must be after start time
- Conflict detection (optional, based on settings)
- Address must be complete (region, province, city)

---

## 4. PROCEDURE COLORS IN APPOINTMENT DISPLAY

### 4.1 AppointmentBlock Component (Calendar View)

**Location**: `AppointmentBlock.jsx` - Individual appointment block in day/calendar view

**Color Application**:
```javascript
const PROC_COLORS = useProcColors();
const c = PROC_COLORS[appt.procedure] || PROC_COLORS.other;

// Color channels applied directly to block styling
const bg  = isCancelled ? '#f1f5f9' : c.bg;
const bor = isCancelled ? '#94a3b8' : c.border;
const txt = isCancelled ? '#64748b' : c.text;
```

**Cancelled State Override**:
- If status === 'cancelled': gray color scheme replaces procedure colors
- Gray border (#94a3b8), gray text (#64748b)
- Visual indication of cancellation

**Block Styling**:
- `background`: c.bg (procedure background)
- `borderLeftColor`: c.border (left accent bar)
- `color`: c.text (text content)
- Height responsive to time duration
- Positioned absolutely within day column

**Display Content** (responsive to block height):
- Always: Patient name (firstName lastName)
- hpx > 32px: Time range (startTime–endTime)
- hpx > 52px: Procedure tag (PROC_LABELS)
- hpx > 70px: Doctor name with dot indicator (colored by DOCTOR_COLORS)

**Layout Handling**:
- Supports overlapping appointments via column layout
- Each appointment may occupy partial width if overlapping
- Left and width adjusted based on `layout[appt.id]`

**Interactions**:
- Click/hold: Opens popover or initiates drag
- Drag: Move appointment to new date/time/doctor
- Resize (bottom handle): Change end time
- Drag detects conflicts if enabled

---

### 4.2 AppointmentPopover Component

**Location**: `AppointmentPopover.jsx` - Quick-view popover on appointment click

**Color Application**:
```javascript
const PROC_COLORS = useProcColors();
const c = PROC_COLORS[appt.procedure] || PROC_COLORS.other;

// Gradient header using procedure colors
const bg = appt.status === 'cancelled'
  ? 'linear-gradient(135deg,#64748b,#94a3b8)'
  : `linear-gradient(135deg,${c.border},${c.border}cc)`;
```

**Header Styling**:
- Gradient background using procedure's border color
- Cancelled appointments show gray gradient
- White text on gradient background

**Displayed Information**:
- **Header Section**:
  - Close button
  - Procedure badge with tooth icon
  - Patient name
  - Time range
  - Doctor name (dr1Name or dr2Name from settings)

- **Body Section** (Info rows):
  - Date (formatted for PHT timezone)
  - Contact number
  - Address
  - Facebook/Messenger URL (if available)
  - Notes (if present)

- **Status Control Section**:
  - 4 status buttons: Pending, Confirmed, Done, Cancel
  - Quick status update without opening modal
  - Current status highlighted with active styling

- **Action Buttons**:
  - Edit: Opens AppointmentModal for full editing
  - Move: Opens modal with date field focused (reschedule)
  - Cancel: Confirms and marks as cancelled
  - Delete: Confirms and removes appointment

**Color Scheme for Popover Elements**:
- Calendar icon: Light blue (#dbeafe bg, #2563eb color)
- Phone icon: Light green (#dcfce7 bg, #16a34a color)
- Map icon: Light yellow (#fef3c7 bg, #d97706 color)
- Facebook icon: Light purple (#ede9fe bg, #7c3aed color)
- Status buttons have dedicated colors (yellow, blue, green, gray)

---

## 5. UI COMPONENT ARCHITECTURE

### 5.1 Component Hierarchy
```
SettingsPage
  ├─ useApp() context
  ├─ useProcColors() hook
  └─ Procedure Colors Card
      └─ Procedure rows (expandable)
          ├─ Collapsed view (preview)
          └─ Expanded panel (color editors)

AppointmentModal
  ├─ useApp() context
  └─ Form sections
      ├─ Patient info
      ├─ Address (Philippines selector)
      ├─ Appointment details
      └─ Status selection

AppointmentBlock
  ├─ useApp() context
  ├─ useProcColors() hook
  ├─ Drag handler
  ├─ Resize handler
  └─ Display content

AppointmentPopover
  ├─ useApp() context
  ├─ useProcColors() hook
  └─ Info display + action buttons
```

### 5.2 State Management

**App Context** (`useApp()`):
- `state.settings`: 
  - `procColors`: `{ [procName]: { bg, border, text } }` - custom overrides
  - `dr1Name`, `dr2Name`: Doctor names
  - `workStart`, `workEnd`: Working hours
  - `conflictDetect`: Boolean flag
  - `darkMode`, `showWeekends`, `showCancelled`: UI preferences
  
- `state.appointments`: Array of appointment objects
  - Each appointment has: id, firstName, lastName, date, startTime, endTime, procedure, doctor, status, address, contactNumber, facebookUrl, notes

- `state.popover`: Currently open popover state
  - `{ id, x, y }`

- `state.apptModalOpen`: Boolean
- `state.apptModalId`: ID of appointment being edited (null if new)

**Actions**:
- `setSettings(patch)`: Merge settings update
- `updateAppointment(appt)`: Update appointment in state
- `setPopover(data)`: Open popover at coordinates
- `closePopover()`: Close popover
- `openApptModal(id?)`: Open modal for create/edit
- `closeApptModal()`: Close modal

---

## 6. PROCEDURE COLOR DISPLAY PATTERNS

### Default Colors by Procedure

| Procedure | Background | Border | Text | Theme |
|-----------|-----------|--------|------|-------|
| extraction | #fee2e2 | #dc2626 | #7f1d1d | Red |
| filling | #dbeafe | #1d4ed8 | #1e3a8a | Blue |
| oralProphylaxis | #dcfce7 | #16a34a | #14532d | Green |
| denture | #fce7f3 | #db2777 | #831843 | Pink |
| ortho | #fefce8 | #ca8a04 | #713f12 | Amber |
| prosto | #ede9fe | #6d28d9 | #4c1d95 | Purple |
| consultation | #f0fdf4 | #059669 | #064e3b | Teal |
| other | #f1f5f9 | #64748b | #1e293b | Gray |
| cleaning | #dcfce7 | #16a34a | #14532d | Green |
| rootCanal | #ffedd5 | #ea580c | #7c2d12 | Orange |
| orthodontics | #fefce8 | #ca8a04 | #713f12 | Amber |
| whitening | #cffafe | #0891b2 | #164e63 | Cyan |

### Usage Locations

**SettingsPage**:
- Displays all 12 procedures with color editors
- Shows live preview of colors in sample appointment block
- Allows independent customization of bg, border, text

**AppointmentBlock** (Calendar):
- Left border uses `border` color
- Full background uses `bg` color
- Text uses `text` color
- Cancelled appointments override all with gray

**AppointmentPopover**:
- Header gradient uses `border` color
- Badge and text styling based on colors
- Procedure label displays in popover

**AppointmentModal**:
- Does not display procedure colors (selection only)

---

## 7. KEY DESIGN DECISIONS

### Color Customization Architecture
1. **Immutable Defaults**: PROC_COLORS in constants never changes
2. **Override Model**: Custom colors stored separately in `settings.procColors`
3. **Merge Pattern**: `useProcColors()` hook always merges defaults + overrides
4. **Partial Overrides**: Can customize individual channels without affecting others
5. **Granular Reset**: Can reset individual procedures or all at once

### Display Strategy
1. **Procedure-based Coloring**: Each appointment colored by its procedure type
2. **Status Override**: Cancelled appointments always show gray (status takes priority)
3. **Doctor Coloring**: Separate from procedure colors (DOCTOR_COLORS for accent)
4. **Responsive Display**: Appointment block details shown/hidden based on available height

### Accessibility & UX
1. **Live Preview**: Settings page shows sample appointment with real colors
2. **Visual Feedback**: Hover effects on color pickers
3. **Clear Indicators**: "CUSTOM" badge shows which procedures have overrides
4. **Color Hints**: Icon and text explain what each channel controls
5. **Hex Display**: Color values shown in monospace for technical users

---

## 8. DATA FLOW EXAMPLES

### Creating an Appointment with Procedure
1. User opens AppointmentModal (new appointment)
2. Selects procedure from PROCEDURES dropdown
3. Clicks Save → AppointmentModal validates + creates
4. New appointment object sent to backend with `procedure` field
5. On calendar, AppointmentBlock renders with colors from `useProcColors()[procedure]`

### Customizing Procedure Colors
1. User navigates to Settings → Procedure Colors section
2. Clicks row to expand (e.g., "Extraction")
3. Sees live preview block with current red colors
4. Clicks color picker button under "Background"
5. Selects new color → `saveProcColor('extraction', 'bg', '#newcolor')`
6. State updates → backend saves
7. All extraction appointments on calendar immediately re-render with new color

### Overriding Cancelled Status Colors
1. User moves appointment to "cancelled" status (via popover or modal)
2. Appointment's `status` field set to 'cancelled'
3. On AppointmentBlock: `isCancelled = true`
4. Colors override to gray (#f1f5f9, #94a3b8, #64748b)
5. Visual indicates cancellation status regardless of procedure

---

## 9. RELATED UI COMPONENTS & FEATURES

### Other Settings Components
- **Working Hours**: Configure workStart/workEnd hours
- **Doctors**: Customize doctor names (dr1Name, dr2Name)
- **Blocked Dates**: Mark specific dates as unavailable
- **Preferences**: Toggles for darkMode, conflictDetect, showWeekends, showCancelled
- **Data Management**: Export/import JSON backups, reset all data

### Appointment Lifecycle
1. **Creation**: AppointmentModal with form validation
2. **Display**: AppointmentBlock in calendar + AppointmentPopover on click
3. **Editing**: Open modal from popover
4. **Status Changes**: Quick buttons in popover or modal
5. **Moving**: Drag block or use modal to reschedule
6. **Resizing**: Drag bottom handle to change duration
7. **Cancellation**: Soft delete (marked cancelled, still visible)
8. **Deletion**: Hard delete (removed from system)

### Conflict Detection
- Optional feature (settings.conflictDetect)
- Checks if appointment overlaps with same doctor's other appointments
- Prevents double-booking if enabled
- Works during creation, editing, and drag operations

---

## Summary

The dental clinic app uses a **procedure-based color system** with:
- **12 default color schemes** defined in constants
- **User customizable colors** stored in settings.procColors
- **Hook-based merging** via useProcColors() for real-time customization
- **Three color channels** (bg, border, text) per procedure
- **Settings UI** with live preview and expandable procedure rows
- **Calendar display** using procedure colors with status overrides
- **Popover quick-view** showing color-coded appointment details

The architecture is modular, allowing procedure colors to be customized centrally while automatically applying across all appointment views.
