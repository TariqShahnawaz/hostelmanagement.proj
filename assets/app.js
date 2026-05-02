(() => {
  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function fmtDate(ts) {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return "-";
    }
  }

  function setActiveNav() {
    const path = (location.pathname.split("/").pop() || "").toLowerCase();
    qsa("[data-nav]").forEach((a) => {
      const v = (a.getAttribute("data-nav") || "").toLowerCase();
      if (v && path.includes(v)) a.classList.add("active");
    });
  }

  function toast(message, type = "success") {
    const host = qs("#toastHost");
    if (!host) return alert(message);

    const el = document.createElement("div");
    el.className = `toast align-items-center text-bg-${type} border-0`;
    el.setAttribute("role", "alert");
    el.setAttribute("aria-live", "assertive");
    el.setAttribute("aria-atomic", "true");
    el.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>`;
    host.appendChild(el);

    const t = new bootstrap.Toast(el, { delay: 2600 });
    t.show();
    el.addEventListener("hidden.bs.toast", () => el.remove());
  }

  function ensureStateLoaded() {
    return window.HMS.loadState();
  }

  function fillRoomOptions(selectEl, state, { includeFull = true } = {}) {
    const rooms = state.rooms.slice().sort((a, b) => a.id.localeCompare(b.id));
    selectEl.innerHTML = "";
    for (const room of rooms) {
      const { occupied, available } = window.HMS.roomAvailability(room);
      if (!includeFull && available <= 0) continue;
      const opt = document.createElement("option");
      opt.value = room.id;
      opt.textContent = `${room.id} — ${occupied}/${room.capacity} occupied`;
      selectEl.appendChild(opt);
    }
  }

  function renderDashboard() {
    const state = ensureStateLoaded();
    const s = window.HMS.stats(state);

    const occupiedEl = qs("#kpiOccupiedRooms");
    const availableEl = qs("#kpiAvailableRooms");
    const studentsEl = qs("#kpiTotalStudents");
    const updatedEl = qs("#lastUpdatedAt");
    if (occupiedEl) occupiedEl.textContent = String(s.occupiedRooms);
    if (availableEl) availableEl.textContent = String(s.availableRooms);
    if (studentsEl) studentsEl.textContent = String(s.totalStudents);
    if (updatedEl) updatedEl.textContent = fmtDate(state.lastUpdatedAt);

    const tbody = qs("#recentAllocationsBody");
    if (tbody) {
      const rows = window.HMS.listRecentAllocations(state, 8);
      tbody.innerHTML = "";
      if (rows.length === 0) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="5" class="text-center muted py-4">No allocations yet.</td>`;
        tbody.appendChild(tr);
      } else {
        for (const r of rows) {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td><span class="badge badge-soft">${r.roomId}</span></td>
            <td>${r.regNo}</td>
            <td>${r.name}</td>
            <td class="muted">${r.dept}</td>
            <td class="muted">${fmtDate(r.allocatedAt)}</td>`;
          tbody.appendChild(tr);
        }
      }
    }

    const resetBtn = qs("#btnResetData");
    if (resetBtn && !resetBtn.dataset.bound) {
      resetBtn.dataset.bound = "1";
      resetBtn.addEventListener("click", () => {
        window.HMS.resetState();
        toast("Dummy data reset.", "info");
        renderDashboard();
      });
    }
  }

  function renderRooms() {
    const state = ensureStateLoaded();
    const tbody = qs("#roomsBody");
    if (!tbody) return;

    const query = (qs("#roomsSearch")?.value || "").trim().toLowerCase();
    const filter = qs("#roomsFilter")?.value || "all";

    const rooms = state.rooms
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id))
      .filter((r) => {
        if (query && !r.id.toLowerCase().includes(query) && !r.floor.toLowerCase().includes(query)) return false;
        const { available, occupied } = window.HMS.roomAvailability(r);
        if (filter === "available" && available <= 0) return false;
        if (filter === "occupied" && occupied <= 0) return false;
        return true;
      });

    tbody.innerHTML = "";
    for (const room of rooms) {
      const { occupied, available } = window.HMS.roomAvailability(room);
      const status =
        available > 0
          ? `<span class="badge text-bg-success">Available</span>`
          : `<span class="badge text-bg-danger">Full</span>`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><span class="badge badge-soft">${room.id}</span></td>
        <td class="muted">${room.floor}</td>
        <td>${room.capacity}</td>
        <td>${occupied}</td>
        <td>${available}</td>
        <td>${status}</td>
        <td class="text-end">
          <a class="btn btn-sm btn-outline-light" href="allocation.html?room=${encodeURIComponent(room.id)}">Allocate</a>
        </td>`;
      tbody.appendChild(tr);
    }

    const countEl = qs("#roomsCount");
    if (countEl) countEl.textContent = `${rooms.length} room(s)`;
  }

  function bindRoomsControls() {
    const search = qs("#roomsSearch");
    const filter = qs("#roomsFilter");
    if (search && !search.dataset.bound) {
      search.dataset.bound = "1";
      search.addEventListener("input", () => renderRooms());
    }
    if (filter && !filter.dataset.bound) {
      filter.dataset.bound = "1";
      filter.addEventListener("change", () => renderRooms());
    }
  }

  function renderAllocation() {
    const state = ensureStateLoaded();
    const roomSelect = qs("#allocRoom");
    if (!roomSelect) return;

    fillRoomOptions(roomSelect, state, { includeFull: false });

    const params = new URLSearchParams(location.search);
    const preRoom = params.get("room");
    if (preRoom) roomSelect.value = preRoom;

    const form = qs("#allocationForm");
    if (form && !form.dataset.bound) {
      form.dataset.bound = "1";
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const nextState = ensureStateLoaded();
        const roomId = qs("#allocRoom")?.value || "";
        const regNo = (qs("#allocRegNo")?.value || "").trim();
        const name = (qs("#allocName")?.value || "").trim();
        const dept = (qs("#allocDept")?.value || "").trim();

        if (!roomId || !regNo || !name || !dept) {
          toast("Please fill all fields.", "warning");
          return;
        }

        const res = window.HMS.allocateStudent({ state: nextState, roomId, regNo, name, dept });
        if (!res.ok) {
          toast(res.message || "Allocation failed.", "danger");
          return;
        }
        form.reset();
        fillRoomOptions(qs("#allocRoom"), res.state, { includeFull: false });
        toast(`Allocated ${name} to ${roomId}.`, "success");
      });
    }
  }

  function renderVacate() {
    const state = ensureStateLoaded();
    const roomSelect = qs("#vacateRoom");
    if (!roomSelect) return;

    fillRoomOptions(roomSelect, state, { includeFull: true });

    function refreshStudentOptions() {
      const st = ensureStateLoaded();
      const roomId = qs("#vacateRoom")?.value || "";
      const studentSelect = qs("#vacateStudent");
      if (!studentSelect) return;

      const room = window.HMS.getRoom(st, roomId);
      studentSelect.innerHTML = "";
      if (!room || room.occupants.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "No students in this room";
        studentSelect.appendChild(opt);
        studentSelect.disabled = true;
        return;
      }

      studentSelect.disabled = false;
      for (const o of room.occupants.slice().sort((a, b) => a.regNo.localeCompare(b.regNo))) {
        const opt = document.createElement("option");
        opt.value = o.regNo;
        opt.textContent = `${o.regNo} — ${o.name}`;
        studentSelect.appendChild(opt);
      }
    }

    if (!roomSelect.dataset.bound) {
      roomSelect.dataset.bound = "1";
      roomSelect.addEventListener("change", () => refreshStudentOptions());
    }
    refreshStudentOptions();

    const form = qs("#vacateForm");
    if (form && !form.dataset.bound) {
      form.dataset.bound = "1";
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const nextState = ensureStateLoaded();
        const roomId = qs("#vacateRoom")?.value || "";
        const regNo = qs("#vacateStudent")?.value || "";
        if (!roomId || !regNo) {
          toast("Select a room and student.", "warning");
          return;
        }

        const res = window.HMS.vacateStudent({ state: nextState, roomId, regNo });
        if (!res.ok) {
          toast(res.message || "Vacate failed.", "danger");
          return;
        }
        fillRoomOptions(qs("#vacateRoom"), res.state, { includeFull: true });
        refreshStudentOptions();
        toast(`Vacated ${regNo} from ${roomId}.`, "success");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    setActiveNav();

    const page = document.body.getAttribute("data-page") || "";
    if (page === "dashboard") renderDashboard();
    if (page === "rooms") {
      bindRoomsControls();
      renderRooms();
    }
    if (page === "allocation") renderAllocation();
    if (page === "vacate") renderVacate();
  });
})();

