# ValTrack API Logic Flow & Architecture

This document outlines the API logic flow and architectural changes required to support multi-branch operations, granular area management, and baggage management as defined in the new database schema.

## 1. Multi-Branch Architecture

### Concept
The system is now scoped by **Branch**. A global admin can manage all branches, while branch-specific staff operate within their assigned branch.

### Frontend Logic
1.  **Branch Selection (Admin)**:
    - On login/dashboard, admins see a branch selector.
    - **API Call**: `GET /branches` (List all branches).
    - **State**: The selected `branch_id` is stored in the application state (e.g., Context, Redux, or URL query param `?branch_id=...`).
    - **Persistence**: Persist selection in `localStorage` or session to maintain context across reloads.

2.  **Data Scoping**:
    - All subsequent data fetches must filter by the selected `branch_id`.
    - **Example**: Fetching incidents for the current branch.
      ```javascript
      const { data } = await supabase
        .from('incidents')
        .select('*')
        .eq('branch_id', selectedBranchId);
      ```

### Backend / Database (RLS)
- **RLS Policies**: In a production environment, Row Level Security policies should enforce that staff can only access data where `branch_id` matches their profile's `assigned_branch_id`.
- For Admins, they bypass this restriction or have access to all.

---

## 2. Granular Area Management

### Hierarchy
- **Branch** (e.g., ValACE Malinta)
  - **Floor** (e.g., 2nd Floor)
    - **Area** (e.g., Children's Area, Computer Area)

### API Workflows

#### Fetching Hierarchy
To render the floor map or management view:
1.  **Fetch Floors and Areas**:
    ```javascript
    const { data } = await supabase
      .from('floors')
      .select(`
        id,
        floor_number,
        label,
        areas (
          id,
          name,
          type,
          capacity,
          current_occupancy: area_attendance(count) -- Virtual field if using aggregation view or separate query
        )
      `)
      .eq('branch_id', selectedBranchId)
      .order('floor_number');
    ```

#### Managing Areas (Admin)
- **Add Area**:
  - Input: `floor_id`, `name`, `type`, `capacity`.
  - **API Call**: `POST /areas`.
- **Edit Area**:
  - Input: `area_id`, updates.
  - **API Call**: `PATCH /areas?id=eq.{area_id}`.
- **Delete Area**:
  - **API Call**: `DELETE /areas?id=eq.{area_id}`.
  - *Cascading Delete*: This will automatically remove associated `area_attendance` and `baggage` due to Foreign Key constraints.

### Capacity Logic
- Max Capacity is now defined per **Area**.
- **Real-time Check**:
  - Before allowing a check-in, the system must count active attendance records for the target area.
  ```javascript
  const { count } = await supabase
    .from('area_attendance')
    .select('id', { count: 'exact', head: true })
    .eq('area_id', targetAreaId)
    .eq('status', 'active');
  
  if (count >= areaCapacity) throw new Error("Area Full");
  ```

---

## 3. In/Out Tracking (Area-Based)

### Workflow
Users are tracked per area. A user can be "inside" the building but move between areas.

1.  **Check-In (Entry to Area)**:
    - **API Call**: `POST /area_attendance`
    - Payload: `{ patron_id, area_id, entry_time: new Date() }`.
    - *Validation*: Ensure user is not already checked into *another* area? (Optional business rule: User can only be in one area at a time).
      - If enforcing "One Area at a Time": Check for any active attendance record for this patron and close it before creating a new one.

2.  **Check-Out (Exit from Area)**:
    - **API Call**: `PATCH /area_attendance?id=eq.{attendance_id}`
    - Payload: `{ exit_time: new Date(), status: 'exited' }`.

3.  **Movement (Transfer)**:
    - Treat as a transactional **Check-Out** from Source Area and **Check-In** to Destination Area.

---

## 4. Baggage Management (Renamed from Slot Management)

### Structure
Baggage lockers are assigned to specific Areas (e.g., lockers near the entrance of the Children's Area).

### data Model
- Table: `baggage`
- Columns: `id` (e.g., "A1-L1"), `area_id`, `status` (occupied/available), `patron_id`.

### API Workflows
1.  **View Lockers**:
    - Fetch lockers for a specific area.
    ```javascript
    const { data } = await supabase
      .from('baggage')
      .select('*')
      .eq('area_id', currentAreaId);
    ```

2.  **Assign Locker**:
    - **API Call**: `PATCH /baggage?id=eq.{locker_id}`
    - Payload: `{ status: 'occupied', patron_id: userPatronId, check_in_time: new Date() }`.

3.  **Release Locker**:
    - **API Call**: `PATCH /baggage?id=eq.{locker_id}`
    - Payload: `{ status: 'available', patron_id: null, check_in_time: null }`.

---

## 5. ERD Reference (Simplified)

```mermaid
erDiagram
    BRANCH ||--|{ FLOOR : has
    BRANCH ||--|{ PROFILE : assigned_to (staff)
    FLOOR ||--|{ AREA : contains
    AREA ||--|{ AREA_ATTENDANCE : logs
    AREA ||--|{ BAGGAGE : hosts
    BRANCH ||--|{ INCIDENT : reports
    BRANCH ||--|{ ANNOUNCEMENT : broadcasts

    BRANCH {
        uuid id PK
        string name
    }
    FLOOR {
        uuid id PK
        uuid branch_id FK
        int floor_number
    }
    AREA {
        uuid id PK
        uuid floor_id FK
        string name
        string type
        int capacity
    }
    AREA_ATTENDANCE {
        bigint id PK
        uuid area_id FK
        string patron_id
        timestamp entry_time
        string status
    }
    BAGGAGE {
        string id PK
        uuid area_id FK
        string status
        string patron_id
    }
```
