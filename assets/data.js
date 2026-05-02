(() => {
  const STORAGE_KEY = "hms_state_v1";

  const defaultRooms = [
    { id: "A-101", floor: "A", capacity: 2 },
    { id: "A-102", floor: "A", capacity: 3 },
    { id: "A-103", floor: "A", capacity: 2 },
    { id: "B-201", floor: "B", capacity: 2 },
    { id: "B-202", floor: "B", capacity: 3 },
    { id: "C-301", floor: "C", capacity: 1 },
  ];

  function createDefaultState() {
    const rooms = defaultRooms.map((r) => ({
      ...r,
      occupants: [],
    }));

    // Seed a little dummy data
    rooms[0].occupants.push({ regNo: "2026-001", name: "Ali Khan", dept: "CS", allocatedAt: Date.now() - 86400000 });
    rooms[1].occupants.push({ regNo: "2026-002", name: "Ayesha Noor", dept: "SE", allocatedAt: Date.now() - 7200000 });

    return {
      rooms,
      lastUpdatedAt: Date.now(),
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultState();
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.rooms)) return createDefaultState();
      return parsed;
    } catch {
      return createDefaultState();
    }
  }

  function saveState(state) {
    const next = { ...state, lastUpdatedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function resetState() {
    const s = createDefaultState();
    saveState(s);
    return s;
  }

  function getRoom(state, roomId) {
    return state.rooms.find((r) => r.id === roomId) || null;
  }

  function roomAvailability(room) {
    const occupied = room.occupants.length;
    const available = Math.max(0, room.capacity - occupied);
    return { occupied, available };
  }

  function stats(state) {
    let occupiedRooms = 0;
    let availableRooms = 0;
    let totalStudents = 0;
    for (const room of state.rooms) {
      const a = roomAvailability(room);
      totalStudents += a.occupied;
      if (a.occupied > 0) occupiedRooms += 1;
      if (a.available > 0) availableRooms += 1;
    }
    return { occupiedRooms, availableRooms, totalStudents };
  }

  function listRecentAllocations(state, limit = 6) {
    const entries = [];
    for (const room of state.rooms) {
      for (const occ of room.occupants) {
        entries.push({ ...occ, roomId: room.id });
      }
    }
    entries.sort((a, b) => (b.allocatedAt || 0) - (a.allocatedAt || 0));
    return entries.slice(0, limit);
  }

  function allocateStudent({ state, roomId, regNo, name, dept }) {
    const room = getRoom(state, roomId);
    if (!room) return { ok: false, message: "Room not found." };

    const { available } = roomAvailability(room);
    if (available <= 0) return { ok: false, message: "Selected room is full." };

    const existing = state.rooms.some((r) => r.occupants.some((o) => o.regNo.toLowerCase() === regNo.toLowerCase()));
    if (existing) return { ok: false, message: "This registration number is already allocated." };

    room.occupants.push({
      regNo,
      name,
      dept,
      allocatedAt: Date.now(),
    });
    return { ok: true, state: saveState(state) };
  }

  function vacateStudent({ state, roomId, regNo }) {
    const room = getRoom(state, roomId);
    if (!room) return { ok: false, message: "Room not found." };

    const idx = room.occupants.findIndex((o) => o.regNo.toLowerCase() === regNo.toLowerCase());
    if (idx === -1) return { ok: false, message: "Student not found in selected room." };

    room.occupants.splice(idx, 1);
    return { ok: true, state: saveState(state) };
  }

  window.HMS = {
    loadState,
    saveState,
    resetState,
    getRoom,
    roomAvailability,
    stats,
    listRecentAllocations,
    allocateStudent,
    vacateStudent,
  };
})();

