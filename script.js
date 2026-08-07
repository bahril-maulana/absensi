// ID Google Sheet yang menjadi sumber data karyawan.
const GOOGLE_SHEET_ID = "166r3HJnyi8xSYCkvjdJcHjl0eGpsmAZlh9hGqgLI65g";
const GOOGLE_SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`;
const N8N_WEBHOOK_URL = "https://panel.n8n-maulana.site/webhook-test/absen";

const state = {
  employees: [],
  currentEmployee: null,
  pinInput: "",
  clockInterval: null,
};

function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    if (char === '"' && quoted && csvText[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && csvText[index + 1] === "\n") index += 1;
      rows.push([...row, field]);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || row.length) rows.push([...row, field]);
  return rows;
}

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}

function getColumnIndex(headers, name) {
  return headers.findIndex(
    (header) => header.trim().toLowerCase().replace(/[ _-]/g, "") === name
  );
}

async function loadEmployees() {
  const response = await fetch(GOOGLE_SHEET_CSV_URL);
  if (!response.ok) throw new Error("Data dari Google Sheet gagal dimuat.");

  const [headers, ...rows] = parseCsv(await response.text());
  if (!headers) throw new Error("Google Sheet tidak memiliki header.");

  const namaIndex = getColumnIndex(headers, "nama");
  const idIndex = getColumnIndex(headers, "id");
  const jabatanIndex = getColumnIndex(headers, "jabatan");
  const fotoIndex = getColumnIndex(headers, "foto");
  const pinIndex = getColumnIndex(headers, "pin");
  const statusIndex = getColumnIndex(headers, "status");
  const jamMasukIndex = getColumnIndex(headers, "jammasuk");
  const jamPulangIndex = getColumnIndex(headers, "jampulang");

  if (idIndex === -1 || namaIndex === -1 || pinIndex === -1) {
    throw new Error("Google Sheet wajib memiliki kolom id, nama, dan pin.");
  }

  return rows
    .filter((row) => row.some((value) => value.trim()))
    .map((row) => {
      const jamMasuk = jamMasukIndex === -1 ? "" : row[jamMasukIndex]?.trim();
      const jamPulang = jamPulangIndex === -1 ? "" : row[jamPulangIndex]?.trim();
      return {
        id: row[idIndex]?.trim() || "",
        nama: row[namaIndex]?.trim() || "",
        jabatan: row[jabatanIndex]?.trim() || "-",
        foto: fotoIndex === -1 ? "" : row[fotoIndex]?.trim(),
        pin: row[pinIndex]?.trim() || "",
        status: jamPulang ? "selesai" : jamMasuk ? "sedang_bekerja" : (statusIndex === -1 ? "belum_absen" : row[statusIndex]?.trim() || "belum_absen"),
        jamMasuk,
        jamPulang,
      };
    })
    .filter((employee) => employee.id && employee.nama && employee.pin);
}

function showSection(sectionId) {
  document.querySelectorAll(".page-section").forEach((section) => section.classList.add("d-none"));
  document.getElementById(sectionId).classList.remove("d-none");
}

function employeePhoto(employee) {
  // URL foto pada kolom "foto" di Google Sheet diprioritaskan per karyawan.
  // Aset lokal dipakai sebagai cadangan bila URL belum diisi.
  return employee.foto || "Assets/profile.jpg";
}

function renderEmployees() {
  const grid = document.getElementById("employeeGrid");
  document.getElementById("employeeCount").textContent = state.employees.length;
  grid.innerHTML = state.employees.map((employee, index) => {
    const nama = escapeHtml(employee.nama);
    const jabatan = escapeHtml(employee.jabatan);

    return `
      <div class="col-6 col-md-4 col-lg-3">
        <button type="button" class="employee-card h-100 w-100 p-0" data-employee-index="${index}" aria-label="Pilih profil ${nama}">
          <span class="employee-photo-wrap d-block">
            <img src="${escapeHtml(employeePhoto(employee))}" alt="Foto ${nama}" class="employee-photo">
            
            <span class="employee-tag"><i class="bi bi-person-check-fill me-1"></i>Aktif</span>
          </span>
          <span class="employee-card-footer d-flex align-items-center gap-2">
            
            <span class="employee-identity text-start flex-grow-1">
              <span class="employee-name d-block">${nama}<i class="bi bi-patch-check-fill employee-verified" aria-label="Terverifikasi"></i></span>
              <span class="employee-role d-block">${jabatan}</span>
            </span>
            <span class="employee-select" aria-hidden="true"><i class="bi bi-arrow-up-right"></i></span>
          </span>
        </button>
      </div>`;
  }).join("");

  grid.querySelectorAll("[data-employee-index]").forEach((card) => {
    card.addEventListener("click", () => openPinPage(state.employees[card.dataset.employeeIndex]));
  });
}

function updatePinDots(isError = false) {
  document.querySelectorAll(".pin-dot").forEach((dot, index) => {
    dot.classList.toggle("filled", index < state.pinInput.length);
    dot.classList.toggle("error", isError);
  });
}

function openPinPage(employee) {
  state.currentEmployee = employee;
  state.pinInput = "";
  updatePinDots();
  document.getElementById("pinEmployeePhoto").src = employeePhoto(employee);
  document.getElementById("pinEmployeeName").textContent = employee.nama;
  document.getElementById("pinEmployeeRole").textContent = employee.jabatan;
  showSection("section-pin");
}

function handleKeypadInput(key) {
  if (key === "backspace") state.pinInput = state.pinInput.slice(0, -1);
  else if (key === "clear") state.pinInput = "";
  else if (state.pinInput.length < state.currentEmployee.pin.length) state.pinInput += key;
  updatePinDots();
}

function submitPin() {
  if (!state.currentEmployee || state.pinInput !== state.currentEmployee.pin) {
    updatePinDots(true);
    setTimeout(() => {
      state.pinInput = "";
      updatePinDots();
    }, 500);
    return;
  }
  openDashboard();
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function startClock() {
  clearInterval(state.clockInterval);
  const clock = document.getElementById("dashClock");
  const tick = () => { clock.textContent = new Date().toLocaleTimeString("id-ID", { hour12: false }); };
  tick();
  state.clockInterval = setInterval(tick, 1000);
}

function renderAttendance() {
  const employee = state.currentEmployee;
  const body = document.querySelector("#statusCard .card-body");

  if (employee.status === "selesai") {
    body.innerHTML = `
      <i class="bi bi-check-circle-fill status-icon-success mb-2"></i>
      <span class="status-badge status-selesai d-inline-block mb-3">Absensi Selesai</span>
      <div class="time-row"><span class="label">Jam Masuk</span><span class="value">${escapeHtml(employee.jamMasuk || "-")}</span></div>
      <div class="time-row"><span class="label">Jam Pulang</span><span class="value">${escapeHtml(employee.jamPulang || "-")}</span></div>`;
    return;
  }

  if (employee.status === "sedang_bekerja" || employee.status === "hadir") {
    body.innerHTML = `
      <span class="status-badge status-bekerja d-inline-block mb-3">Sedang Bekerja</span>
      <div class="time-row"><span class="label">Jam Masuk</span><span class="value">${escapeHtml(employee.jamMasuk || "-")}</span></div>
      <div class="d-grid mt-4">
        <button id="btnCheckOut" type="button" class="btn btn-app-danger btn-lg rounded-4 py-3">
          <i class="bi bi-box-arrow-right me-2"></i>Absen Pulang
        </button>
      </div>`;
    document.getElementById("btnCheckOut").addEventListener("click", checkOut);
    return;
  }

  body.innerHTML = `
    <span class="status-badge status-belum d-inline-block mb-4">Belum Absen</span>
    <div class="d-grid">
      <button id="btnCheckIn" type="button" class="btn btn-app-primary btn-lg rounded-4 py-3">
        <i class="bi bi-box-arrow-in-right me-2"></i>Absen Masuk
      </button>
    </div>`;
  document.getElementById("btnCheckIn").addEventListener("click", checkIn);
}

function openDashboard() {
  const employee = state.currentEmployee;
  document.getElementById("dashEmployeePhoto").src = employeePhoto(employee);
  document.getElementById("dashEmployeeName").textContent = employee.nama;
  document.getElementById("dashEmployeeRole").textContent = employee.jabatan;
  document.getElementById("dashDate").textContent = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  renderAttendance();
  startClock();
  showSection("section-dashboard");
}

async function sendAttendance(action, time) {
  const employee = state.currentEmployee;
  const payload = {
    action,
    employeeId: employee.id,
    nama: employee.nama,
    timestamp: new Date().toISOString(),
    jamMasuk: action === "check_in" ? time : employee.jamMasuk,
    jamPulang: action === "check_out" ? time : "",
  };

  // URLSearchParams memakai Content-Type sederhana sehingga browser tidak
  // mengirim preflight CORS yang dapat menghentikan request sebelum n8n terpicu.
  await fetch(N8N_WEBHOOK_URL, {
    method: "POST",
    mode: "no-cors",
    body: new URLSearchParams(payload),
  });
}

async function checkIn() {
  const button = document.getElementById("btnCheckIn");
  const time = formatTime();
  button.disabled = true;
  button.textContent = "Mengirim absensi...";

  try {
    await sendAttendance("check_in", time);
    state.currentEmployee.status = "sedang_bekerja";
    state.currentEmployee.jamMasuk = time;
    renderAttendance();
  } catch (error) {
    button.disabled = false;
    button.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Absen Masuk';
    alert(error.message);
  }
}

async function checkOut() {
  const button = document.getElementById("btnCheckOut");
  const time = formatTime();
  button.disabled = true;
  button.textContent = "Mengirim absensi...";

  try {
    await sendAttendance("check_out", time);
    state.currentEmployee.status = "selesai";
    state.currentEmployee.jamPulang = time;
    renderAttendance();
  } catch (error) {
    button.disabled = false;
    button.innerHTML = '<i class="bi bi-box-arrow-right me-2"></i>Absen Pulang';
    alert(error.message);
  }
}

function goHome() {
  clearInterval(state.clockInterval);
  state.currentEmployee = null;
  state.pinInput = "";
  showSection("section-home");
}

async function initEmployeeGrid() {
  const grid = document.getElementById("employeeGrid");
  const loading = document.getElementById("employeeGridLoading");
  grid.classList.add("d-none");
  loading.classList.remove("d-none");

  try {
    state.employees = await loadEmployees();
    renderEmployees();
  } catch (error) {
    grid.innerHTML = `<div class="col-12 text-center text-muted py-5">${escapeHtml(error.message)}</div>`;
  } finally {
    loading.classList.add("d-none");
    grid.classList.remove("d-none");
  }
}

function bindEvents() {
  document.getElementById("pinKeypad").addEventListener("click", (event) => {
    const key = event.target.closest("[data-key]")?.dataset.key;
    if (key) handleKeypadInput(key);
  });
  document.getElementById("btnPinSubmit").addEventListener("click", submitPin);
  document.getElementById("btnPinBack").addEventListener("click", goHome);
  document.getElementById("btnLogout").addEventListener("click", goHome);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("homeDate").textContent = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
  bindEvents();
  initEmployeeGrid();
});
