

const SUPABASE_URL = "https://sbtnssogxfmzfwbmwaej.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_q283-naEBWr5pzyRU4iWNA_gAD49hm-";

const state = {
  employees: [],
  currentEmployee: null,
  pinInput: "",
  clockInterval: null,
  dashboardMonth: "",
};

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}

async function supabaseRequest(path, options = {}) {
  const headers = { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`, ...options.headers };
  if (options.body) headers["Content-Type"] = "application/json";
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers });
  const text = await response.text();
  let result = null;
  try { result = text ? JSON.parse(text) : null; } catch (error) { /* Respons bukan JSON. */ }
  if (!response.ok) throw new Error(result?.message || result?.hint || "Permintaan ke Supabase gagal.");
  return result;
}

function currentMonthValue() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function todayValue() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function employeePhoto(employee) {
  return employee.foto || "Assets/profile.jpg";
}

function showSection(sectionId) {
  document.querySelectorAll(".page-section").forEach((section) => section.classList.add("d-none"));
  document.getElementById(sectionId).classList.remove("d-none");
}

async function loadEmployeesFromSupabase() {
  const [employees, attendance] = await Promise.all([
    supabaseRequest("employees?select=id,nama,jabatan,foto,pin&is_active=eq.true&order=nama"),
    supabaseRequest(`attendance?select=employee_id,check_in,check_out&attendance_date=eq.${todayValue()}`),
  ]);
  const attendanceByEmployee = new Map(attendance.map((record) => [record.employee_id, record]));
  return employees.map((employee) => {
    const record = attendanceByEmployee.get(employee.id);
    return { ...employee, status: record?.check_out ? "selesai" : record?.check_in ? "sedang_bekerja" : "belum_absen", jamMasuk: record?.check_in || "", jamPulang: record?.check_out || "" };
  });
}

function renderEmployees() {
  const grid = document.getElementById("employeeGrid");
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

function showToast(message, type = "success") {
  const toastElement = document.getElementById("mainToast");
  const icon = document.getElementById("toastIcon");
  document.getElementById("toastMessage").textContent = message;
  toastElement.classList.remove("text-bg-success", "text-bg-danger");
  toastElement.classList.add(type === "error" ? "text-bg-danger" : "text-bg-success");
  icon.className = type === "error" ? "bi bi-exclamation-circle-fill fs-5" : "bi bi-check-circle-fill fs-5";
  bootstrap.Toast.getOrCreateInstance(toastElement, { delay: 2500 }).show();
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
  if (state.currentEmployee && state.pinInput.length === state.currentEmployee.pin.length) submitPin();
}

function submitPin() {
  if (!state.currentEmployee || state.pinInput !== state.currentEmployee.pin) {
    updatePinDots(true);
    showToast("PIN salah. Silakan coba lagi.", "error");
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
  const today = todayValue();
  const column = action === "check_in" ? "check_in" : "check_out";
  const payload = { employee_id: employee.id, attendance_date: today, [column]: new Date().toISOString() };
  const method = action === "check_in" ? "POST" : "PATCH";
  const path = action === "check_in"
    ? "attendance?on_conflict=employee_id,attendance_date"
    : `attendance?employee_id=eq.${encodeURIComponent(employee.id)}&attendance_date=eq.${today}`;
  const headers = action === "check_in" ? { Prefer: "resolution=merge-duplicates,return=minimal" } : { Prefer: "return=minimal" };
  await supabaseRequest(path, { method, headers, body: JSON.stringify(payload) });
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
    state.employees = await loadEmployeesFromSupabase();
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
  document.getElementById("btnPinBack").addEventListener("click", goHome);
  document.getElementById("btnLogout").addEventListener("click", goHome);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("homeDate").textContent = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
  bindEvents();
  initEmployeeGrid();
});
