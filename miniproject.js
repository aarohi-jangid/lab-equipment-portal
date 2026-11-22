const DEFAULT_EQUIPMENT = [
  { id: "EQ-101", name: "Arduino Uno R4 Kit", category: "Microcontrollers", lab: "Embedded Lab 1" },
  { id: "EQ-102", name: "Raspberry Pi 5 (8GB)", category: "Microcontrollers", lab: "IoT Lab 2" },
  { id: "EQ-103", name: "ESP32 Dev Module Pack", category: "Microcontrollers", lab: "IoT Lab 2" },
  { id: "EQ-201", name: "Ultrasonic & IR Sensor Kit", category: "Sensors", lab: "Robotics Lab" },
  { id: "EQ-202", name: "MPU6050 Gyro + Accelerometer", category: "Sensors", lab: "Robotics Lab" },
  { id: "EQ-301", name: "Digital Storage Oscilloscope", category: "Lab Equipment", lab: "Electronics Lab" },
  { id: "EQ-302", name: "DC Regulated Power Supply", category: "Lab Equipment", lab: "Electronics Lab" },
  { id: "EQ-401", name: "Cisco Managed Switch (24-Port)", category: "Networking", lab: "Networks Lab" }
];

const DEFAULT_REQUESTS = [
  {
    requestId: "REQ-501",
    name: "LoRa SX1278 Transceiver Module",
    category: "Networking",
    qty: 2,
    lab: "IoT Lab 2",
    requestedBy: "Siddharth Rao (2500320100021)",
    purpose: "Long-range campus telemetry mini-project",
    status: "Pending"
  }
];

function getDefaultBookings() {
  const now = Date.now();
  const hour = 60 * 60 * 1000;

  return [
    {
      bookingId: "BK-1001",
      itemId: "EQ-102",
      studentName: "Rohan Verma",
      rollNo: "2500320100112",
      startTime: new Date(now - 1 * hour).toISOString(),
      endTime: new Date(now + 2 * hour).toISOString(),
      returned: false
    },
    {
      bookingId: "BK-1002",
      itemId: "EQ-301",
      studentName: "Ananya Singh",
      rollNo: "2500320100089",
      startTime: new Date(now - 5 * hour).toISOString(),
      endTime: new Date(now - 1 * hour).toISOString(),
      returned: false
    }
  ];
}

let equipmentList = JSON.parse(localStorage.getItem("lab_equipment")) || [...DEFAULT_EQUIPMENT];
let bookings = JSON.parse(localStorage.getItem("lab_bookings")) || getDefaultBookings();
let equipmentRequests = JSON.parse(localStorage.getItem("lab_requests")) || [...DEFAULT_REQUESTS];

function saveData() {
  localStorage.setItem("lab_equipment", JSON.stringify(equipmentList));
  localStorage.setItem("lab_bookings", JSON.stringify(bookings));
  localStorage.setItem("lab_requests", JSON.stringify(equipmentRequests));
}

function generateNextEquipmentId() {
  const maxNum = equipmentList.reduce((max, item) => {
    const match = item.id.match(/^EQ-(\d+)$/);
    const num = match ? parseInt(match[1], 10) : 100;
    return Math.max(max, num);
  }, 100);
  return `EQ-${maxNum + 1}`;
}

function getItemStatus(itemId) {
  const now = new Date();
  const activeBookings = bookings.filter((b) => b.itemId === itemId && !b.returned);

  if (activeBookings.length === 0) return "Available";

  const hasOverdue = activeBookings.some((b) => new Date(b.endTime) < now);
  if (hasOverdue) return "Overdue";

  return "Booked";
}

function formatDateTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

function renderStats() {
  const total = equipmentList.length;
  let available = 0;
  let booked = 0;
  let overdue = 0;

  equipmentList.forEach((item) => {
    const status = getItemStatus(item.id);
    if (status === "Available") available++;
    else if (status === "Booked") booked++;
    else if (status === "Overdue") overdue++;
  });

  document.getElementById("totalCount").textContent = total;
  document.getElementById("availableCount").textContent = available;
  document.getElementById("bookedCount").textContent = booked;
  document.getElementById("overdueCount").textContent = overdue;
}

function renderEquipment() {
  const grid = document.getElementById("equipmentGrid");
  const searchQuery = document.getElementById("searchInput").value.trim().toLowerCase();
  const categoryVal = document.getElementById("categoryFilter").value;
  const statusVal = document.getElementById("statusFilter").value;

  grid.innerHTML = "";

  const filtered = equipmentList.filter((item) => {
    const currentStatus = getItemStatus(item.id);
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery) ||
      item.id.toLowerCase().includes(searchQuery);
    const matchesCategory = categoryVal === "All" || item.category === categoryVal;
    const matchesStatus = statusVal === "All" || currentStatus === statusVal;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<p style="color:#64748b;">No equipment matches your filter criteria.</p>`;
    return;
  }

  filtered.forEach((item) => {
    const status = getItemStatus(item.id);
    const badgeClass =
      status === "Available"
        ? "badge-available"
        : status === "Overdue"
        ? "badge-overdue"
        : "badge-booked";

    const card = document.createElement("div");
    card.className = "item-card";
    card.innerHTML = `
      <div>
        <div class="card-top">
          <span class="item-id">${item.id}</span>
          <span class="badge ${badgeClass}">${status}</span>
        </div>
        <h3 class="item-title" style="margin-top:10px;">${item.name}</h3>
        <p class="item-meta">${item.category} &bull; ${item.lab}</p>
      </div>
      <button class="btn btn-primary" onclick="openBookingModal('${item.id}')">
        Book Time Slot
      </button>
    `;
    grid.appendChild(card);
  });
}

function renderRequestsTable() {
  const tbody = document.getElementById("requestsTableBody");
  tbody.innerHTML = "";

  if (equipmentRequests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#64748b;">No new equipment requests submitted.</td></tr>`;
    return;
  }

  const sorted = [...equipmentRequests].reverse();

  sorted.forEach((req) => {
    let badgeClass = "badge-pending";
    if (req.status === "Approved") badgeClass = "badge-available";
    else if (req.status === "Rejected") badgeClass = "badge-overdue";

    const actionHtml =
      req.status === "Pending"
        ? `<button class="btn btn-return" onclick="approveRequest('${req.requestId}')">Approve &amp; Add</button>
           <button class="btn btn-reject" onclick="rejectRequest('${req.requestId}')">Decline</button>`
        : `<span style="color:#64748b;font-size:0.82rem;">${req.status}</span>`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${req.name}</strong></td>
      <td>${req.category} &bull; ${req.lab}</td>
      <td>${req.qty}</td>
      <td>${req.requestedBy}</td>
      <td>${req.purpose}</td>
      <td><span class="badge ${badgeClass}">${req.status}</span></td>
      <td>${actionHtml}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderBookingsTable() {
  const tbody = document.getElementById("bookingTableBody");
  tbody.innerHTML = "";

  if (bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#64748b;">No bookings recorded yet.</td></tr>`;
    return;
  }

  const now = new Date();
  const sorted = [...bookings].reverse();

  sorted.forEach((b) => {
    const item = equipmentList.find((eq) => eq.id === b.itemId);
    const itemName = item ? `${item.name} (${item.id})` : b.itemId;

    let statusText = "Active";
    let badgeClass = "badge-booked";

    if (b.returned) {
      statusText = "Returned";
      badgeClass = "badge-returned";
    } else if (new Date(b.endTime) < now) {
      statusText = "Overdue";
      badgeClass = "badge-overdue";
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${itemName}</strong></td>
      <td>${b.studentName}</td>
      <td>${b.rollNo}</td>
      <td>${formatDateTime(b.startTime)}</td>
      <td>${formatDateTime(b.endTime)}</td>
      <td><span class="badge ${badgeClass}">${statusText}</span></td>
      <td>
        ${
          b.returned
            ? `<span style="color:#64748b;font-size:0.82rem;">Completed</span>`
            : `<button class="btn btn-return" onclick="markReturned('${b.bookingId}')">Mark Returned</button>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openBookingModal(itemId) {
  const item = equipmentList.find((eq) => eq.id === itemId);
  if (!item) return;

  document.getElementById("selectedItemId").value = item.id;
  document.getElementById("modalItemTitle").textContent = `${item.name} (${item.id}) — ${item.lab}`;
  document.getElementById("formError").classList.add("hidden");
  document.getElementById("bookingForm").reset();

  const startDefault = new Date(Date.now() + 5 * 60 * 1000);
  const endDefault = new Date(Date.now() + 65 * 60 * 1000);
  document.getElementById("startTime").value = toLocalInputString(startDefault);
  document.getElementById("endTime").value = toLocalInputString(endDefault);

  const activeSlots = bookings.filter((b) => b.itemId === itemId && !b.returned);
  const slotsBox = document.getElementById("existingSlotsBox");

  if (activeSlots.length === 0) {
    slotsBox.innerHTML = `<strong>Availability:</strong> No active reservations. All slots open.`;
  } else {
    const listItems = activeSlots
      .map((s) => `<li>${formatDateTime(s.startTime)} &rarr; ${formatDateTime(s.endTime)} (${s.studentName})</li>`)
      .join("");
    slotsBox.innerHTML = `<strong>Currently Reserved Slots:</strong><ul>${listItems}</ul>`;
  }

  document.getElementById("bookingModal").classList.remove("hidden");
}

function toLocalInputString(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function closeBookingModal() {
  document.getElementById("bookingModal").classList.add("hidden");
}

function openRequestModal() {
  document.getElementById("requestForm").reset();
  document.getElementById("reqQty").value = 1;
  document.getElementById("requestFormError").classList.add("hidden");
  document.getElementById("requestModal").classList.remove("hidden");
}

function closeRequestModal() {
  document.getElementById("requestModal").classList.add("hidden");
}

document.getElementById("requestForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const name = document.getElementById("reqEquipmentName").value.trim();
  const category = document.getElementById("reqCategory").value;
  const qty = parseInt(document.getElementById("reqQty").value, 10);
  const lab = document.getElementById("reqLab").value.trim();
  const requestedBy = document.getElementById("reqBy").value.trim();
  const purpose = document.getElementById("reqPurpose").value.trim();
  const errorBox = document.getElementById("requestFormError");

  if (!name || !lab || !requestedBy || !purpose || qty < 1) {
    errorBox.textContent = "Please fill out all fields with a valid quantity.";
    errorBox.classList.remove("hidden");
    return;
  }

  equipmentRequests.push({
    requestId: "REQ-" + Math.floor(1000 + Math.random() * 9000),
    name,
    category,
    qty,
    lab,
    requestedBy,
    purpose,
    status: "Pending"
  });

  saveData();
  closeRequestModal();
  renderRequestsTable();
});

// Approve Request & Onboard Equipment into Inventory
function approveRequest(requestId) {
  const req = equipmentRequests.find((r) => r.requestId === requestId);
  if (!req || req.status !== "Pending") return;

  req.status = "Approved";

  for (let i = 0; i < req.qty; i++) {
    const label = req.qty > 1 ? `${req.name} #${i + 1}` : req.name;
    equipmentList.push({
      id: generateNextEquipmentId(),
      name: label,
      category: req.category,
      lab: req.lab
    });
  }

  saveData();
  refreshUI();
}

function rejectRequest(requestId) {
  const req = equipmentRequests.find((r) => r.requestId === requestId);
  if (!req || req.status !== "Pending") return;

  req.status = "Rejected";
  saveData();
  renderRequestsTable();
}

document.getElementById("bookingForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const itemId = document.getElementById("selectedItemId").value;
  const studentName = document.getElementById("studentName").value.trim();
  const rollNo = document.getElementById("rollNo").value.trim();
  const startVal = document.getElementById("startTime").value;
  const endVal = document.getElementById("endTime").value;
  const errorBox = document.getElementById("formError");

  const newStart = new Date(startVal);
  const newEnd = new Date(endVal);

  if (newEnd <= newStart) {
    errorBox.textContent = "Invalid Time Window: End time must be after start time.";
    errorBox.classList.remove("hidden");
    return;
  }

  const conflict = bookings.find((b) => {
    if (b.itemId !== itemId || b.returned) return false;
    const existingStart = new Date(b.startTime);
    const existingEnd = new Date(b.endTime);
    return newStart < existingEnd && newEnd > existingStart;
  });

  if (conflict) {
    errorBox.textContent = `Slot Conflict! Already booked by ${conflict.studentName} from ${formatDateTime(
      conflict.startTime
    )} to ${formatDateTime(conflict.endTime)}.`;
    errorBox.classList.remove("hidden");
    return;
  }

  bookings.push({
    bookingId: "BK-" + Math.floor(1000 + Math.random() * 9000),
    itemId,
    studentName,
    rollNo,
    startTime: newStart.toISOString(),
    endTime: newEnd.toISOString(),
    returned: false
  });

  saveData();
  closeBookingModal();
  refreshUI();
});

function markReturned(bookingId) {
  const target = bookings.find((b) => b.bookingId === bookingId);
  if (target) {
    target.returned = true;
    saveData();
    refreshUI();
  }
}

document.getElementById("searchInput").addEventListener("input", renderEquipment);
document.getElementById("categoryFilter").addEventListener("change", renderEquipment);
document.getElementById("statusFilter").addEventListener("change", renderEquipment);

document.getElementById("closeBookingModalBtn").addEventListener("click", closeBookingModal);
document.getElementById("cancelBookingModalBtn").addEventListener("click", closeBookingModal);

document.getElementById("openRequestModalBtn").addEventListener("click", openRequestModal);
document.getElementById("closeRequestModalBtn").addEventListener("click", closeRequestModal);
document.getElementById("cancelRequestModalBtn").addEventListener("click", closeRequestModal);

document.getElementById("resetDemoBtn").addEventListener("click", () => {
  equipmentList = [...DEFAULT_EQUIPMENT];
  bookings = getDefaultBookings();
  equipmentRequests = [...DEFAULT_REQUESTS];
  saveData();
  refreshUI();
});

function refreshUI() {
  renderStats();
  renderEquipment();
  renderRequestsTable();
  renderBookingsTable();
}

saveData();
refreshUI();