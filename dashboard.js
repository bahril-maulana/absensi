const SUPABASE_URL = "https://sbtnssogxfmzfwbmwaej.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_q283-naEBWr5pzyRU4iWNA_gAD49hm-";
const HR_USERNAME = "admin bahril";
const HR_PASSWORD = "admin 123";
const state = { isAuthenticated: sessionStorage.getItem("hr_authenticated") === "true", employees: [], records: [], selectedEmployeeId: "" };

async function supabaseRequest(path, options = {}) {
  const headers = { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`, ...options.headers };
  if (options.body) headers["Content-Type"] = "application/json";
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers });
  const text = await response.text();
  let result = null;
  try { result = text ? JSON.parse(text) : null; } catch (error) { /* Respons bukan JSON. */ }
  if (!response.ok) throw new Error(result?.message || result?.error_description || result?.hint || "Permintaan ke Supabase gagal.");
  return result;
}

function signIn(username, password) {
  if (username !== HR_USERNAME || password !== HR_PASSWORD) throw new Error("Username atau password salah.");
  state.isAuthenticated = true;
  sessionStorage.setItem("hr_authenticated", "true");
}

function localMonth() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function nextMonth(month) { const [year, monthNumber] = month.split("-").map(Number); const date = new Date(year, monthNumber, 1); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function formatDate(value) { return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
function formatTime(value) { return value ? new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }) : "-"; }
function getShift(value) {
  if (!value) return "-";
  const hour = new Date(value).getHours();
  if (hour >= 9 && hour < 14) return "Shift Pagi";
  if (hour >= 14 && hour <= 19) return "Shift Siang";
  return "-";
}
function durationMinutes(start, end) { return !start || !end ? null : Math.max(0, Math.round((new Date(end) - new Date(start)) / 60000)); }
function formatDuration(minutes) { return minutes == null ? "-" : `${Math.floor(minutes / 60)}j ${String(minutes % 60).padStart(2, "0")}m`; }
function duration(start, end) { return formatDuration(durationMinutes(start, end)); }
function additionalHours(start, end) {
  const totalMinutes = durationMinutes(start, end);
  return totalMinutes == null ? null : Math.max(0, totalMinutes - 8 * 60);
}
function escapeHtml(value) { const element = document.createElement("span"); element.textContent = value == null ? "" : String(value); return element.innerHTML; }

function renderEmployeeList() {
  document.getElementById("hrEmployeeCount").textContent = state.employees.length;
  document.getElementById("hrEmployeeList").innerHTML = state.employees.map((employee) => `<button type="button" class="hr-employee-filter ${state.selectedEmployeeId === employee.id ? "active" : ""}" data-employee-id="${escapeHtml(employee.id)}"><span class="hr-employee-avatar"><i class="bi bi-person-fill"></i></span><span><strong>${escapeHtml(employee.nama)}</strong><small>${escapeHtml(employee.id)}</small></span></button>`).join("");
  document.querySelectorAll("[data-employee-id]").forEach((button) => button.addEventListener("click", () => { state.selectedEmployeeId = button.dataset.employeeId; renderEmployeeList(); renderEmployeeTracking(); }));
}

function renderAttendanceTable() {
  const selectedRecords = state.records;
  document.getElementById("adminDashboardCount").textContent = `${selectedRecords.length} catatan absensi`;
  const table = document.getElementById("adminAttendanceRows");
  table.innerHTML = selectedRecords.length ? selectedRecords.map((record) => { const employee = state.employees.find((item) => item.id === record.employee_id); return `<tr><td>${escapeHtml(formatDate(record.attendance_date))}</td><td><strong>${escapeHtml(employee?.nama || record.employee_id)}</strong><small class="d-block text-muted">${escapeHtml(record.employee_id)}</small></td><td>${escapeHtml(formatTime(record.check_in))}</td><td><span class="record-status">${escapeHtml(getShift(record.check_in))}</span></td><td>${escapeHtml(formatTime(record.check_out))}</td><td>${escapeHtml(duration(record.check_in, record.check_out))}</td><td>${escapeHtml(formatDuration(additionalHours(record.check_in, record.check_out)))}</td><td><span class="record-status">${record.check_out ? "Selesai" : "Bekerja"}</span></td></tr>`; }).join("") : '<tr><td colspan="8" class="text-center py-5 text-muted"><i class="bi bi-inbox d-block fs-2 mb-2"></i>Belum ada data absensi.</td></tr>';
}

function renderEmployeeTracking() {
  const table = document.getElementById("employeeAttendanceRows");
  const employee = state.employees.find((item) => item.id === state.selectedEmployeeId);
  const records = state.records.filter((record) => record.employee_id === state.selectedEmployeeId);
  document.getElementById("employeeTrackingTitle").textContent = employee ? `Tracking ${employee.nama}` : "Tracking absensi";
  document.getElementById("employeeTrackingCount").textContent = employee ? `${records.length} catatan absensi` : "Pilih profil untuk melihat absensi.";
  table.innerHTML = employee && records.length ? records.map((record) => `<tr><td>${escapeHtml(formatDate(record.attendance_date))}</td><td>${escapeHtml(formatTime(record.check_in))}</td><td><span class="record-status">${escapeHtml(getShift(record.check_in))}</span></td><td>${escapeHtml(formatTime(record.check_out))}</td><td>${escapeHtml(duration(record.check_in, record.check_out))}</td><td>${escapeHtml(formatDuration(additionalHours(record.check_in, record.check_out)))}</td><td><span class="record-status">${record.check_out ? "Selesai" : "Bekerja"}</span></td></tr>`).join("") : '<tr><td colspan="7" class="text-center py-5 text-muted">Pilih profil karyawan terlebih dahulu.</td></tr>';
}

function showDashboardView(view) {
  const showEmployees = view === "employees";
  document.getElementById("summary").classList.toggle("d-none", showEmployees);
  document.getElementById("employees").classList.toggle("d-none", !showEmployees);
  document.getElementById("btnSummaryView").classList.toggle("active", !showEmployees);
  document.getElementById("btnEmployeesView").classList.toggle("active", showEmployees);
}

async function loadDashboard() {
  const month = document.getElementById("adminMonth").value || localMonth();
  const loading = document.getElementById("adminDashboardLoading");
  const errorBox = document.getElementById("adminDashboardError");
  loading.classList.remove("d-none"); errorBox.classList.add("d-none");
  try {
    const [employees, records] = await Promise.all([
      supabaseRequest("employees?select=id,nama&is_active=eq.true"),
      supabaseRequest(`attendance?select=employee_id,attendance_date,check_in,check_out&attendance_date=gte.${month}-01&attendance_date=lt.${nextMonth(month)}-01&order=attendance_date.desc`),
    ]);
    state.employees = employees;
    state.records = records;
    renderEmployeeList();
    document.getElementById("adminDashboardMonth").textContent = new Date(`${month}-01T00:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    document.getElementById("metricEmployees").textContent = employees.length;
    document.getElementById("metricPresent").textContent = new Set(records.map((record) => record.employee_id)).size;
    document.getElementById("metricAbsent").textContent = Math.max(0, employees.length - new Set(records.map((record) => record.employee_id)).size);
    document.getElementById("metricFinished").textContent = records.filter((record) => record.check_out).length;
    renderAttendanceTable();
  } catch (error) { errorBox.textContent = error.message; errorBox.classList.remove("d-none"); }
  finally { loading.classList.add("d-none"); }
}

function logout() { sessionStorage.removeItem("hr_authenticated"); state.isAuthenticated = false; document.getElementById("hrDashboard").classList.add("d-none"); document.getElementById("hrLogin").classList.remove("d-none"); }

function bindEvents() {
  document.getElementById("hrLoginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const errorBox = document.getElementById("hrLoginError"); errorBox.classList.add("d-none");
    try { signIn(document.getElementById("hrUsername").value.trim(), document.getElementById("hrPassword").value); document.getElementById("hrLogin").classList.add("d-none"); document.getElementById("hrDashboard").classList.remove("d-none"); document.getElementById("adminMonth").value = localMonth(); loadDashboard(); }
    catch (error) { errorBox.textContent = error.message; errorBox.classList.remove("d-none"); }
  });
  document.getElementById("btnRefreshDashboard").addEventListener("click", loadDashboard);
  document.getElementById("adminMonth").addEventListener("change", loadDashboard);
  document.getElementById("btnHrLogout").addEventListener("click", logout);
  document.getElementById("btnSummaryView").addEventListener("click", (event) => { event.preventDefault(); showDashboardView("summary"); });
  document.getElementById("btnEmployeesView").addEventListener("click", (event) => { event.preventDefault(); showDashboardView("employees"); });
  document.getElementById("btnTogglePassword").addEventListener("click", () => { const input = document.getElementById("hrPassword"); const icon = document.querySelector("#btnTogglePassword i"); input.type = input.type === "password" ? "text" : "password"; icon.className = input.type === "password" ? "bi bi-eye" : "bi bi-eye-slash"; });
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  if (state.isAuthenticated) { document.getElementById("hrLogin").classList.add("d-none"); document.getElementById("hrDashboard").classList.remove("d-none"); document.getElementById("adminMonth").value = localMonth(); loadDashboard(); }
});
