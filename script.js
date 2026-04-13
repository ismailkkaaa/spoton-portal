const COUNTRIES = ["Georgia", "Uzbekistan", "Tajikistan"];
const AUTO_LOGOUT_MS = 6 * 60 * 60 * 1000;

const screens = {
  mainLogin: document.getElementById("mainLoginScreen"),
  countrySelection: document.getElementById("countrySelectionScreen"),
  countryLogin: document.getElementById("countryLoginScreen"),
  app: document.getElementById("appScreen")
};

const mainLoginForm = document.getElementById("mainLoginForm");
const roleInput = document.getElementById("roleInput");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const mainLoginButton = document.getElementById("mainLoginButton");
const mainLoginMessage = document.getElementById("mainLoginMessage");

const countryGrid = document.getElementById("countryGrid");
const countrySelectionMessage = document.getElementById("countrySelectionMessage");
const countrySelectionLogoutButton = document.getElementById("countrySelectionLogoutButton");

const countryLoginForm = document.getElementById("countryLoginForm");
const countryLoginTitle = document.getElementById("countryLoginTitle");
const countryLoginSubtitle = document.getElementById("countryLoginSubtitle");
const countryUsernameInput = document.getElementById("countryUsernameInput");
const countryPasswordInput = document.getElementById("countryPasswordInput");
const countryLoginButton = document.getElementById("countryLoginButton");
const countryLoginMessage = document.getElementById("countryLoginMessage");
const backToCountriesButton = document.getElementById("backToCountriesButton");

const headerCountryText = document.getElementById("headerCountryText");
const countryFilterField = document.getElementById("countryFilterField");
const countryFilterSelect = document.getElementById("countryFilterSelect");
const searchInput = document.getElementById("searchInput");
const userChip = document.getElementById("userChip");
const logoutButton = document.getElementById("logoutButton");
const appMessage = document.getElementById("appMessage");

const studentsCount = document.getElementById("studentsCount");
const filesCount = document.getElementById("filesCount");
const storageCount = document.getElementById("storageCount");

const newStudentButton = document.getElementById("newStudentButton");
const studentForm = document.getElementById("studentForm");
const studentFormMode = document.getElementById("studentFormMode");
const studentFormStudentId = document.getElementById("studentFormStudentId");
const studentNameInput = document.getElementById("studentNameInput");
const studentPhoneInput = document.getElementById("studentPhoneInput");
const studentEmailInput = document.getElementById("studentEmailInput");
const studentCountryInput = document.getElementById("studentCountryInput");
const studentCourseInput = document.getElementById("studentCourseInput");
const studentStatusInput = document.getElementById("studentStatusInput");
const cancelStudentFormButton = document.getElementById("cancelStudentFormButton");
const saveStudentButton = document.getElementById("saveStudentButton");
const studentsTableBody = document.getElementById("studentsTableBody");
const studentsEmptyState = document.getElementById("studentsEmptyState");

const editStudentButton = document.getElementById("editStudentButton");
const deleteStudentButton = document.getElementById("deleteStudentButton");
const studentDetailEmpty = document.getElementById("studentDetailEmpty");
const studentDetailPanel = document.getElementById("studentDetailPanel");
const detailStudentId = document.getElementById("detailStudentId");
const detailStudentName = document.getElementById("detailStudentName");
const detailStudentCourse = document.getElementById("detailStudentCourse");
const detailLastUpdated = document.getElementById("detailLastUpdated");
const detailStudentPhone = document.getElementById("detailStudentPhone");
const detailStudentEmail = document.getElementById("detailStudentEmail");
const detailStudentCountry = document.getElementById("detailStudentCountry");
const detailStatusSelect = document.getElementById("detailStatusSelect");

const fileInput = document.getElementById("fileInput");
const uploadFileButton = document.getElementById("uploadFileButton");
const filesTableBody = document.getElementById("filesTableBody");
const filesEmptyState = document.getElementById("filesEmptyState");

const state = {
  user: null,
  selectedCountry: "",
  countryAuthenticated: false,
  pendingCountry: "",
  activeCountry: "",
  students: [],
  summary: { students: 0, files: 0, storage_bytes: 0 },
  selectedStudentId: ""
};

let autoLogoutTimer = null;

function showScreen(name) {
  Object.entries(screens).forEach(([screenName, element]) => {
    element.classList.toggle("active", screenName === name);
  });
}

function clearMessage(target) {
  target.hidden = true;
  target.className = "status-message";
  target.textContent = "";
}

function setMessage(target, type, text) {
  target.hidden = false;
  target.className = `status-message ${type}`;
  target.textContent = text;
}

function setLoading(button, loadingText, isLoading) {
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.textContent = loadingText;
    return;
  }

  button.disabled = false;
  button.textContent = button.dataset.originalText || button.textContent;
}

function escapeHtml(value) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, (character) => map[character]);
}

function formatStorage(bytes) {
  const size = Number(bytes || 0);
  if (size >= 1024 * 1024 * 1024) return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(2)} KB`;
  return `${size} B`;
}

function isAdmin() {
  return state.user?.role === "Admin";
}

function currentCountryScope() {
  return isAdmin() ? state.activeCountry : state.selectedCountry;
}

function selectedStudent() {
  return state.students.find((student) => student.student_id === state.selectedStudentId) || null;
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {})
    },
    ...options
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(payload?.error || "Request failed");
    error.status = response.status;
    throw error;
  }

  return payload;
}

async function safeLoad(action) {
  try {
    await action();
  } catch (error) {
    if (error.status === 401) {
      await logout(true);
      return;
    }
    setMessage(appMessage, "error", error.message);
  }
}

async function logout(showExpiredMessage = false) {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
  } catch {
    // Local reset is enough if server logout fails.
  }

  state.user = null;
  state.selectedCountry = "";
  state.countryAuthenticated = false;
  state.pendingCountry = "";
  state.activeCountry = "";
  state.students = [];
  state.summary = { students: 0, files: 0, storage_bytes: 0 };
  state.selectedStudentId = "";
  clearTimeout(autoLogoutTimer);
  resetStudentForm();
  renderStudents();
  renderStudentDetail();
  clearMessage(appMessage);
  clearMessage(countrySelectionMessage);
  clearMessage(countryLoginMessage);

  if (showExpiredMessage) {
    setMessage(mainLoginMessage, "error", "You have been logged out after 6 hours of inactivity.");
  } else {
    clearMessage(mainLoginMessage);
  }

  showScreen("mainLogin");
}

function resetAutoLogoutTimer() {
  clearTimeout(autoLogoutTimer);
  if (!state.user) return;
  autoLogoutTimer = window.setTimeout(() => logout(true), AUTO_LOGOUT_MS);
}

function bindActivityListeners() {
  ["click", "keydown", "mousemove", "touchstart", "scroll"].forEach((eventName) => {
    window.addEventListener(eventName, () => {
      if (state.user) resetAutoLogoutTimer();
    }, { passive: true });
  });
}

function populateCountryOptions() {
  studentCountryInput.innerHTML = COUNTRIES.map((country) => `<option value="${country}">${country}</option>`).join("");
  countryFilterSelect.innerHTML = [
    `<option value="">All Countries</option>`,
    ...COUNTRIES.map((country) => `<option value="${country}">${country}</option>`)
  ].join("");
}

function renderCountrySelection() {
  countryGrid.innerHTML = COUNTRIES.map((country) => `
    <button class="country-card" type="button" data-country="${country}">
      <strong>${country}</strong>
      <span>Continue to ${country} access</span>
    </button>
  `).join("");
}

function renderHeader() {
  userChip.textContent = state.user ? `${state.user.username} · ${state.user.role}` : "-";
  const label = isAdmin() ? (state.activeCountry || "All Countries") : (state.selectedCountry || "-");
  headerCountryText.textContent = `Current Country: ${label}`;
  countryFilterField.hidden = !isAdmin();
  countryFilterSelect.value = state.activeCountry || "";
}

function renderSummary() {
  studentsCount.textContent = state.summary.students ?? 0;
  filesCount.textContent = state.summary.files ?? 0;
  storageCount.textContent = formatStorage(state.summary.storage_bytes);
}

function renderStudents() {
  studentsEmptyState.hidden = state.students.length > 0;
  studentsTableBody.innerHTML = state.students.map((student) => `
    <tr class="${student.student_id === state.selectedStudentId ? "selected-row" : ""}">
      <td>${escapeHtml(student.student_id)}</td>
      <td>${escapeHtml(student.name)}</td>
      <td>${escapeHtml(student.country)}</td>
      <td>${escapeHtml(student.course)}</td>
      <td><span class="status-badge">${escapeHtml(student.status)}</span></td>
      <td>${escapeHtml(String(student.file_count ?? 0))}</td>
      <td>${escapeHtml(student.last_updated)}</td>
      <td><button class="link-button" type="button" data-open-student="${student.student_id}">Open</button></td>
    </tr>
  `).join("");
}

function renderFiles(files) {
  filesEmptyState.hidden = files.length > 0;
  filesTableBody.innerHTML = files.map((file) => `
    <tr>
      <td>${escapeHtml(file.file_name)}</td>
      <td>${escapeHtml(formatStorage(file.file_size))}</td>
      <td>${escapeHtml(file.upload_date)}</td>
      <td>
        <div class="row-actions">
          <button class="button button-secondary" type="button" data-download-file="${file.id}">Download</button>
          ${isAdmin() ? `<button class="button button-danger" type="button" data-delete-file="${file.id}">Delete</button>` : ""}
        </div>
      </td>
    </tr>
  `).join("");
}

function renderStudentDetail() {
  const student = selectedStudent();
  if (!student) {
    studentDetailEmpty.hidden = false;
    studentDetailPanel.hidden = true;
    editStudentButton.hidden = true;
    deleteStudentButton.hidden = true;
    return;
  }

  studentDetailEmpty.hidden = true;
  studentDetailPanel.hidden = false;
  editStudentButton.hidden = !isAdmin();
  deleteStudentButton.hidden = !isAdmin();

  detailStudentId.textContent = student.student_id;
  detailStudentName.textContent = student.name;
  detailStudentCourse.textContent = student.course;
  detailLastUpdated.textContent = student.last_updated;
  detailStudentPhone.textContent = student.phone;
  detailStudentEmail.textContent = student.email;
  detailStudentCountry.textContent = student.country;
  detailStatusSelect.value = student.status;
  detailStatusSelect.disabled = !isAdmin();

  renderFiles(student.files || []);
}

function resetStudentForm() {
  studentForm.reset();
  studentForm.hidden = true;
  studentFormMode.value = "create";
  studentFormStudentId.value = "";
  if (!isAdmin()) {
    studentCountryInput.value = state.selectedCountry || COUNTRIES[0];
  }
}

function openStudentForm(mode, student = null) {
  if (!isAdmin()) return;
  studentForm.hidden = false;
  studentFormMode.value = mode;
  studentFormStudentId.value = student?.student_id || "";
  studentNameInput.value = student?.name || "";
  studentPhoneInput.value = student?.phone || "";
  studentEmailInput.value = student?.email || "";
  studentCountryInput.value = student?.country || state.activeCountry || COUNTRIES[0];
  studentCourseInput.value = student?.course || "";
  studentStatusInput.value = student?.status || "Application Created";
}

async function loadDashboard() {
  const country = currentCountryScope();
  const search = searchInput.value.trim();
  const summaryUrl = new URL("/api/dashboard/summary", window.location.origin);
  const studentsUrl = new URL("/api/students", window.location.origin);

  if (country) {
    summaryUrl.searchParams.set("country", country);
    studentsUrl.searchParams.set("country", country);
  }
  if (search) {
    studentsUrl.searchParams.set("q", search);
  }

  const [summaryPayload, studentsPayload] = await Promise.all([
    apiRequest(summaryUrl.pathname + summaryUrl.search),
    apiRequest(studentsUrl.pathname + studentsUrl.search)
  ]);

  state.summary = summaryPayload.summary;
  state.students = studentsPayload.students;

  if (state.selectedStudentId && !state.students.some((student) => student.student_id === state.selectedStudentId)) {
    state.selectedStudentId = "";
  }

  renderHeader();
  renderSummary();
  renderStudents();
  renderStudentDetail();
}

async function loadStudentDetail(studentId) {
  const [studentPayload, filesPayload] = await Promise.all([
    apiRequest(`/api/students/${encodeURIComponent(studentId)}`),
    apiRequest(`/api/students/${encodeURIComponent(studentId)}/files`)
  ]);

  const index = state.students.findIndex((student) => student.student_id === studentId);
  if (index >= 0) {
    state.students[index] = {
      ...state.students[index],
      ...studentPayload.student,
      files: filesPayload.files,
      file_count: filesPayload.files.length
    };
  }

  state.selectedStudentId = studentId;
  renderStudents();
  renderStudentDetail();
}

async function refreshAfterMutation(studentId = "") {
  await loadDashboard();
  if (studentId && state.students.some((student) => student.student_id === studentId)) {
    await loadStudentDetail(studentId);
  } else {
    state.selectedStudentId = "";
    renderStudentDetail();
  }
}

async function restoreSession() {
  try {
    const payload = await apiRequest("/api/auth/me");
    state.user = payload.user;
    state.selectedCountry = payload.selected_country || "";
    state.countryAuthenticated = Boolean(payload.country_authenticated);
    state.activeCountry = isAdmin() ? (state.selectedCountry || "") : state.selectedCountry;
    newStudentButton.hidden = !isAdmin();
    studentCountryInput.disabled = !isAdmin();
    resetAutoLogoutTimer();

    if (!isAdmin() && !state.countryAuthenticated) {
      renderCountrySelection();
      showScreen("countrySelection");
      return;
    }

    await loadDashboard();
    showScreen("app");
  } catch {
    showScreen("mainLogin");
  }
}

mainLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(mainLoginMessage);
  setLoading(mainLoginButton, "Signing in...", true);

  try {
    const payload = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        role: roleInput.value,
        username: usernameInput.value.trim(),
        password: passwordInput.value
      })
    });

    state.user = payload.user;
    state.selectedCountry = payload.selected_country || "";
    state.countryAuthenticated = Boolean(payload.country_authenticated);
    state.activeCountry = isAdmin() ? (state.selectedCountry || "") : "";
    newStudentButton.hidden = !isAdmin();
    studentCountryInput.disabled = !isAdmin();
    mainLoginForm.reset();
    resetAutoLogoutTimer();

    if (isAdmin()) {
      await loadDashboard();
      showScreen("app");
      return;
    }

    renderCountrySelection();
    showScreen("countrySelection");
  } catch (error) {
    setMessage(mainLoginMessage, "error", error.message);
  } finally {
    setLoading(mainLoginButton, "Signing in...", false);
  }
});

countryGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-country]");
  if (!button) return;
  state.pendingCountry = button.dataset.country;
  countryLoginTitle.textContent = `${state.pendingCountry} Login`;
  countryLoginSubtitle.textContent = `Enter the country credentials for ${state.pendingCountry}.`;
  clearMessage(countryLoginMessage);
  countryLoginForm.reset();
  showScreen("countryLogin");
});

countrySelectionLogoutButton.addEventListener("click", () => logout(false));
backToCountriesButton.addEventListener("click", () => showScreen("countrySelection"));
logoutButton.addEventListener("click", () => logout(false));

countryLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(countryLoginMessage);
  setLoading(countryLoginButton, "Signing in...", true);

  try {
    const payload = await apiRequest("/api/auth/country-login", {
      method: "POST",
      body: JSON.stringify({
        country: state.pendingCountry,
        username: countryUsernameInput.value.trim(),
        password: countryPasswordInput.value
      })
    });

    state.selectedCountry = payload.selected_country;
    state.countryAuthenticated = Boolean(payload.country_authenticated);
    state.activeCountry = payload.selected_country;
    resetAutoLogoutTimer();
    await loadDashboard();
    showScreen("app");
  } catch (error) {
    setMessage(countryLoginMessage, "error", error.message);
  } finally {
    setLoading(countryLoginButton, "Signing in...", false);
  }
});

countryFilterSelect.addEventListener("change", () => {
  safeLoad(async () => {
    state.activeCountry = countryFilterSelect.value;
    state.selectedStudentId = "";
    await loadDashboard();
  });
});

searchInput.addEventListener("input", () => {
  safeLoad(loadDashboard);
});

newStudentButton.addEventListener("click", () => {
  clearMessage(appMessage);
  openStudentForm("create");
});

cancelStudentFormButton.addEventListener("click", () => {
  resetStudentForm();
});

studentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage(appMessage);
  setLoading(saveStudentButton, "Saving...", true);

  const payload = {
    name: studentNameInput.value.trim(),
    phone: studentPhoneInput.value.trim(),
    email: studentEmailInput.value.trim(),
    country: studentCountryInput.value,
    course: studentCourseInput.value.trim(),
    status: studentStatusInput.value
  };

  try {
    let result;
    if (studentFormMode.value === "edit") {
      result = await apiRequest(`/api/students/${encodeURIComponent(studentFormStudentId.value)}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    } else {
      result = await apiRequest("/api/students", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    resetStudentForm();
    await refreshAfterMutation(result.student.student_id);
    setMessage(appMessage, "success", "Student saved successfully.");
  } catch (error) {
    setMessage(appMessage, "error", error.message);
  } finally {
    setLoading(saveStudentButton, "Saving...", false);
  }
});

studentsTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-student]");
  if (!button) return;
  safeLoad(() => loadStudentDetail(button.dataset.openStudent));
});

editStudentButton.addEventListener("click", () => {
  const student = selectedStudent();
  if (!student) return;
  openStudentForm("edit", student);
});

deleteStudentButton.addEventListener("click", () => {
  const student = selectedStudent();
  if (!student) return;
  if (!window.confirm(`Delete student ${student.student_id}?`)) return;

  safeLoad(async () => {
    await apiRequest(`/api/students/${encodeURIComponent(student.student_id)}`, {
      method: "DELETE"
    });
    state.selectedStudentId = "";
    await refreshAfterMutation();
    setMessage(appMessage, "success", "Student deleted successfully.");
  });
});

detailStatusSelect.addEventListener("change", () => {
  const student = selectedStudent();
  if (!student || !isAdmin()) return;

  safeLoad(async () => {
    await apiRequest(`/api/students/${encodeURIComponent(student.student_id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: detailStatusSelect.value })
    });
    await refreshAfterMutation(student.student_id);
    setMessage(appMessage, "success", "Student status updated.");
  });
});

uploadFileButton.addEventListener("click", () => {
  const student = selectedStudent();
  if (!student) {
    setMessage(appMessage, "error", "Select a student first.");
    return;
  }
  if (!fileInput.files.length) {
    setMessage(appMessage, "error", "Choose a file before uploading.");
    return;
  }

  safeLoad(async () => {
    setLoading(uploadFileButton, "Uploading...", true);
    const payload = new FormData();
    payload.append("file", fileInput.files[0]);
    await apiRequest(`/api/students/${encodeURIComponent(student.student_id)}/files`, {
      method: "POST",
      body: payload
    });
    fileInput.value = "";
    await refreshAfterMutation(student.student_id);
    setMessage(appMessage, "success", "File uploaded successfully.");
  }).finally(() => {
    setLoading(uploadFileButton, "Uploading...", false);
  });
});

filesTableBody.addEventListener("click", (event) => {
  const student = selectedStudent();
  if (!student) return;

  const downloadButton = event.target.closest("[data-download-file]");
  if (downloadButton) {
    window.location.href = `/api/students/${encodeURIComponent(student.student_id)}/files/${downloadButton.dataset.downloadFile}/download`;
    return;
  }

  const deleteButton = event.target.closest("[data-delete-file]");
  if (!deleteButton) return;
  if (!window.confirm("Delete this file?")) return;

  safeLoad(async () => {
    await apiRequest(`/api/students/${encodeURIComponent(student.student_id)}/files/${deleteButton.dataset.deleteFile}`, {
      method: "DELETE"
    });
    await refreshAfterMutation(student.student_id);
    setMessage(appMessage, "success", "File deleted successfully.");
  });
});

populateCountryOptions();
renderCountrySelection();
bindActivityListeners();
restoreSession();
