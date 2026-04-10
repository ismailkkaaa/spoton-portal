const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");
const logoutButton = document.getElementById("logoutButton");
const currentUserText = document.getElementById("currentUserText");
const globalSearchInput = document.getElementById("globalSearchInput");
const globalSearchResults = document.getElementById("globalSearchResults");
const appMessage = document.getElementById("appMessage");
const countryGrid = document.getElementById("countryGrid");
const courseGrid = document.getElementById("courseGrid");
const studentsTableBody = document.getElementById("studentsTableBody");
const studentsEmptyState = document.getElementById("studentsEmptyState");
const studentsTitle = document.getElementById("studentsTitle");
const studentsSubtitle = document.getElementById("studentsSubtitle");
const studentsPermissionNote = document.getElementById("studentsPermissionNote");
const addStudentButton = document.getElementById("addStudentButton");
const studentSearchInput = document.getElementById("studentSearchInput");
const fileSearchInput = document.getElementById("fileSearchInput");
const filesTableBody = document.getElementById("filesTableBody");
const filesEmptyState = document.getElementById("filesEmptyState");
const fileInput = document.getElementById("fileInput");
const uploadButton = document.getElementById("uploadButton");
const detailTitle = document.getElementById("detailTitle");
const detailSubtitle = document.getElementById("detailSubtitle");
const editStudentButton = document.getElementById("editStudentButton");
const studentNumberValue = document.getElementById("studentNumberValue");
const studentNameValue = document.getElementById("studentNameValue");
const studentPhoneValue = document.getElementById("studentPhoneValue");
const studentEmailValue = document.getElementById("studentEmailValue");
const studentStatusValue = document.getElementById("studentStatusValue");
const statusEditor = document.getElementById("statusEditor");
const studentStatusSelect = document.getElementById("studentStatusSelect");
const storageText = document.getElementById("storageText");
const storageBar = document.getElementById("storageBar");
const screens = document.querySelectorAll(".screen");
const views = document.querySelectorAll(".view");
const crumbHome = document.getElementById("crumbHome");
const crumbCountry = document.getElementById("crumbCountry");
const crumbCourse = document.getElementById("crumbCourse");
const crumbStudent = document.getElementById("crumbStudent");
const backToCountriesButton = document.getElementById("backToCountriesButton");
const backToStudentsButton = document.getElementById("backToStudentsButton");
const courseTitle = document.getElementById("courseTitle");
const courseSubtitle = document.getElementById("courseSubtitle");
const totalStudentsStat = document.getElementById("totalStudentsStat");
const totalFilesStat = document.getElementById("totalFilesStat");
const storageUsedStat = document.getElementById("storageUsedStat");
const viewAllStudentsButton = document.getElementById("viewAllStudentsButton");
const backToHomeButton = document.getElementById("backToHomeButton");
const allStudentsSearchInput = document.getElementById("allStudentsSearchInput");
const allStudentsCountryFilter = document.getElementById("allStudentsCountryFilter");
const allStudentsCourseFilter = document.getElementById("allStudentsCourseFilter");
const allStudentsStatusFilter = document.getElementById("allStudentsStatusFilter");
const allStudentsTableBody = document.getElementById("allStudentsTableBody");
const allStudentsEmptyState = document.getElementById("allStudentsEmptyState");

const SESSION_KEY = "spoton-student-portal-session";
const TOTAL_STORAGE_MB = 10 * 1024;
const COUNTRY_PREFIXES = {
  Georgia: "GEO",
  Uzbekistan: "UZB",
  Tajikistan: "TJK"
};

const users = {
  admin: { password: "admin123", role: "Admin" },
  staff: { password: "staff123", role: "Staff" }
};

const countryCourseMap = {
  Georgia: ["MBBS", "BSc Nursing", "BBA", "MBA"],
  Uzbekistan: ["MBBS", "BSc"],
  Tajikistan: ["MBBS", "BSc"]
};

const dataStore = {
  Georgia: {
    MBBS: [
      {
        id: crypto.randomUUID(),
        studentNumber: "GEO-1001",
        name: "Aarav Sharma",
        phone: "+995 555 100 101",
        email: "aarav.sharma@example.com",
        status: "Application Created",
        lastUpdated: "Apr 10, 2026",
        files: [
          { id: crypto.randomUUID(), name: "Passport_Copy.pdf", sizeLabel: "2.4 MB", sizeMb: 2.4, date: "Apr 10, 2026" },
          { id: crypto.randomUUID(), name: "Admission_Form.pdf", sizeLabel: "1.3 MB", sizeMb: 1.3, date: "Apr 09, 2026" }
        ]
      },
      {
        id: crypto.randomUUID(),
        studentNumber: "GEO-1002",
        name: "Nino Beridze",
        phone: "+995 555 220 220",
        email: "nino.beridze@example.com",
        status: "Application In Progress",
        lastUpdated: "Apr 08, 2026",
        files: [
          { id: crypto.randomUUID(), name: "Offer_Letter.pdf", sizeLabel: "1.8 MB", sizeMb: 1.8, date: "Apr 08, 2026" }
        ]
      }
    ],
    "BSc Nursing": [
      {
        id: crypto.randomUUID(),
        studentNumber: "GEO-1003",
        name: "Maya George",
        phone: "+995 555 300 410",
        email: "maya.george@example.com",
        status: "Visa Approved",
        lastUpdated: "Apr 05, 2026",
        files: []
      }
    ],
    BBA: [],
    MBA: []
  },
  Uzbekistan: {
    MBBS: [
      {
        id: crypto.randomUUID(),
        studentNumber: "UZB-2001",
        name: "Rahul Verma",
        phone: "+998 90 111 2222",
        email: "rahul.verma@example.com",
        status: "Application Pending",
        lastUpdated: "Apr 07, 2026",
        files: [
          { id: crypto.randomUUID(), name: "Visa_Document.pdf", sizeLabel: "1.9 MB", sizeMb: 1.9, date: "Apr 07, 2026" }
        ]
      }
    ],
    BSc: []
  },
  Tajikistan: {
    MBBS: [],
    BSc: [
      {
        id: crypto.randomUUID(),
        studentNumber: "TJK-3001",
        name: "Dilshod Karimov",
        phone: "+992 900 123 456",
        email: "dilshod.karimov@example.com",
        status: "Application Rejected",
        lastUpdated: "Apr 06, 2026",
        files: []
      }
    ]
  }
};

const state = {
  user: null,
  country: "",
  course: "",
  studentId: ""
};

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function escapeHtml(value) {
  const entities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  };

  return String(value ?? "").replace(/[&<>"']/g, (character) => entities[character]);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(value, query) {
  const safeValue = escapeHtml(value);
  const normalizedQuery = String(query || "").trim();
  if (!normalizedQuery) return safeValue;

  const pattern = new RegExp(`(${escapeRegExp(normalizedQuery)})`, "ig");
  return safeValue.replace(pattern, "<mark>$1</mark>");
}

function setStatusMessage(target, type, text) {
  target.hidden = false;
  target.className = `status-message ${type}`;
  target.textContent = text;
}

function clearStatusMessage(target) {
  target.hidden = true;
  target.className = "status-message";
  target.textContent = "";
}

function showScreen(screenName) {
  screens.forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screen === screenName);
  });
}

function showView(viewName) {
  views.forEach((view) => {
    view.classList.toggle("active", view.dataset.view === viewName);
  });
}

function getSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSession() {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user: state.user }));
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function ensureAuthenticated() {
  if (state.user) return true;
  clearSession();
  showScreen("login");
  setStatusMessage(loginMessage, "error", "Please log in to continue.");
  return false;
}

function getCurrentStudents() {
  if (!state.country || !state.course) return [];
  return dataStore[state.country][state.course];
}

function getCurrentStudent() {
  return getCurrentStudents().find((student) => student.id === state.studentId) || null;
}

function getTodayLabel() {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  });
}

function getTotalUsedStorageMb() {
  return Object.values(dataStore)
    .flatMap((country) => Object.values(country))
    .flat()
    .flatMap((student) => student.files)
    .reduce((total, file) => total + (file.sizeMb || 0), 0);
}

function formatStorage(totalMb) {
  if (totalMb >= 1024) return `${(totalMb / 1024).toFixed(1)} GB`;
  return `${Math.round(totalMb)} MB`;
}

function updateStorageUsage() {
  const usedMb = getTotalUsedStorageMb();
  const percent = Math.min((usedMb / TOTAL_STORAGE_MB) * 100, 100);
  storageText.textContent = `Used: ${formatStorage(usedMb)} / ${formatStorage(TOTAL_STORAGE_MB)}`;
  storageBar.style.width = `${percent}%`;
}

function updateDashboardStats() {
  const allStudents = getAllStudents();
  const totalStudents = allStudents.length;
  
  const totalFiles = allStudents.reduce((count, { student }) => 
    count + student.files.length, 0
  );
  
  const usedMb = getTotalUsedStorageMb();
  
  totalStudentsStat.textContent = totalStudents;
  totalFilesStat.textContent = totalFiles;
  storageUsedStat.textContent = formatStorage(usedMb);
  
  updateStorageUsage();
}

function updateHeader() {
  currentUserText.textContent = state.user ? `${state.user.username} - ${state.user.role}` : "-";
}

function isAdmin() {
  return state.user?.role === "Admin";
}

function canDeleteFiles() {
  return isAdmin();
}

function canManageStudents() {
  return isAdmin();
}

function getStatusClassName(status) {
  switch (status) {
    case "Application Created":
      return "status-created";
    case "Application In Progress":
      return "status-in-progress";
    case "Application Pending":
      return "status-pending";
    case "Application Rejected":
      return "status-rejected";
    case "Application Approved":
    case "Visa Approved":
      return "status-approved";
    default:
      return "status-created";
  }
}

function renderStatusBadge(status) {
  return `<span class="status-badge ${getStatusClassName(status)}">${escapeHtml(status)}</span>`;
}

function syncRolePermissions() {
  const admin = isAdmin();
  addStudentButton.hidden = !admin;
  editStudentButton.hidden = !admin;
  statusEditor.hidden = !admin;
  studentStatusSelect.disabled = !admin;
  studentsPermissionNote.hidden = admin;
}

function updateBreadcrumbs() {
  crumbCountry.textContent = state.country || "Country";
  crumbCountry.disabled = !state.country;
  crumbCourse.textContent = state.course || "Course";
  crumbCourse.disabled = !state.course;
  const student = getCurrentStudent();
  crumbStudent.textContent = student ? student.name : "Student";
  crumbStudent.disabled = !student;
}

function getAllStudents() {
  return Object.entries(dataStore).flatMap(([countryName, courses]) =>
    Object.entries(courses).flatMap(([courseName, students]) =>
      students.map((student) => ({
        student,
        country: countryName,
        course: courseName
      }))
    )
  );
}

function getStudentSearchText(student) {
  return [
    student.studentNumber,
    student.name,
    student.phone,
    student.email
  ].map(normalizeText).join(" ");
}

function matchesStudentQuery(student, query) {
  if (!query) return true;
  return getStudentSearchText(student).includes(normalizeText(query));
}

function matchesFileQuery(file, query) {
  if (!query) return true;
  return normalizeText(file.name).includes(normalizeText(query));
}

function getFileType(fileName) {
  const extension = fileName.split('.').pop().toLowerCase();
  
  const pdfExtensions = ['pdf'];
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
  const docExtensions = ['doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx'];
  
  if (pdfExtensions.includes(extension)) {
    return { type: 'pdf', label: 'PDF', className: 'file-type-pdf' };
  }
  
  if (imageExtensions.includes(extension)) {
    return { type: 'image', label: extension.toUpperCase(), className: 'file-type-image' };
  }
  
  if (docExtensions.includes(extension)) {
    return { type: 'doc', label: extension.toUpperCase(), className: 'file-type-doc' };
  }
  
  return { type: 'other', label: extension.toUpperCase() || 'FILE', className: 'file-type-other' };
}

function getMatchingStudents(query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];
  return getAllStudents().filter(({ student }) => matchesStudentQuery(student, normalizedQuery));
}

function getMatchingFiles(query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  return getAllStudents().flatMap(({ student, country, course }) =>
    student.files
      .filter((file) => matchesFileQuery(file, normalizedQuery))
      .map((file) => ({
        file,
        student,
        country,
        course
      }))
  );
}

function generateStudentNumber(country) {
  const prefix = COUNTRY_PREFIXES[country] || "STD";
  const allStudentNumbers = getAllStudents()
    .filter((entry) => entry.country === country)
    .map(({ student }) => student.studentNumber);
  
  const maxNumber = allStudentNumbers.reduce((max, num) => {
    const match = num.match(/\d+/);
    return match ? Math.max(max, parseInt(match[0], 10)) : max;
  }, 0);
  
  return `${prefix}-${String(maxNumber + 1).padStart(4, '0')}`;
}

function renderCountries() {
  countryGrid.innerHTML = Object.keys(countryCourseMap)
    .map((country) => `
      <button class="selection-card" type="button" data-country="${country}">
        <strong>${country}</strong>
        <span>Open courses and student records</span>
      </button>
    `)
    .join("");
}

function renderCourses() {
  if (!state.country) return;

  courseTitle.textContent = `${state.country} Courses`;
  courseSubtitle.textContent = "Select a course to view students.";
  courseGrid.innerHTML = countryCourseMap[state.country]
    .map((course) => `
      <button class="selection-card" type="button" data-course="${course}">
        <strong>${course}</strong>
        <span>View students in this course</span>
      </button>
    `)
    .join("");
}

function renderStudents() {
  const localSearch = normalizeText(studentSearchInput.value);
  const globalSearch = normalizeText(globalSearchInput.value);
  const search = localSearch || globalSearch;
  const students = getCurrentStudents().filter((student) => matchesStudentQuery(student, search));

  studentsTitle.textContent = `${state.country} - ${state.course}`;
  studentsSubtitle.textContent = "Manage students and open their document records.";
  studentsEmptyState.hidden = students.length > 0;
  syncRolePermissions();

  if (!students.length) {
    studentsTableBody.innerHTML = "";
    studentsEmptyState.querySelector("h4").textContent = search
      ? "No matching students"
      : "No students available";
    studentsEmptyState.querySelector("p").textContent = search
      ? "Search by student ID, name, phone number, or email."
      : "Add a student to begin managing files for this course.";
    return;
  }

  studentsTableBody.innerHTML = students
    .map((student) => `
      <tr class="${search ? "table-match" : ""}">
        <td>${highlightText(student.studentNumber, search)}</td>
        <td>${highlightText(student.name, search)}</td>
        <td>${highlightText(student.phone, search)}</td>
        <td>${highlightText(student.email, search)}</td>
        <td>${renderStatusBadge(student.status)}</td>
        <td>${escapeHtml(student.lastUpdated || "-")}</td>
        <td><button class="button button-secondary" type="button" data-student-id="${student.id}">Open</button></td>
      </tr>
    `)
    .join("");
}

function renderStudentDetail() {
  const student = getCurrentStudent();
  if (!student) {
    state.studentId = "";
    showView("students");
    updateBreadcrumbs();
    return;
  }

  detailTitle.textContent = student.name;
  detailSubtitle.textContent = `${state.country} - ${state.course}`;
  studentNumberValue.textContent = student.studentNumber;
  studentNameValue.textContent = student.name;
  studentPhoneValue.textContent = student.phone;
  studentEmailValue.textContent = student.email;
  studentStatusValue.innerHTML = renderStatusBadge(student.status);
  studentStatusSelect.value = student.status;
  syncRolePermissions();

  const localSearch = normalizeText(fileSearchInput.value);
  const globalSearch = normalizeText(globalSearchInput.value);
  const search = localSearch || globalSearch;
  const files = student.files.filter((file) => matchesFileQuery(file, search));

  filesEmptyState.hidden = files.length > 0;
  if (!files.length) {
    filesTableBody.innerHTML = "";
    filesEmptyState.querySelector("h4").textContent = search
      ? "No matching files"
      : "No files uploaded";
    filesEmptyState.querySelector("p").textContent = search
      ? "Try a different file name."
      : "Upload a document to store it under this student.";
  } else {
    filesTableBody.innerHTML = files
      .map((file) => {
        const fileType = getFileType(file.name);
        return `
          <tr class="${search ? "table-match" : ""}">
            <td>
              <span class="file-type-icon ${fileType.className}">${fileType.label}</span>
            </td>
            <td>${highlightText(file.name, search)}</td>
            <td>${escapeHtml(file.sizeLabel)}</td>
            <td>${escapeHtml(file.date)}</td>
            <td>
              <div class="file-actions">
                <button class="button button-secondary" type="button" data-action="download" data-file-id="${file.id}">Download</button>
                ${canDeleteFiles() ? `<button class="button button-danger" type="button" data-action="delete" data-file-id="${file.id}">Delete</button>` : ""}
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  updateBreadcrumbs();
}

function renderAllStudents() {
  const search = normalizeText(allStudentsSearchInput.value);
  const countryFilter = allStudentsCountryFilter.value;
  const courseFilter = allStudentsCourseFilter.value;
  const statusFilter = allStudentsStatusFilter.value;

  const allStudents = getAllStudents();
  
  const filtered = allStudents.filter(({ student, country, course }) => {
    // Apply search filter
    if (search && !matchesStudentQuery(student, search)) return false;
    
    // Apply country filter
    if (countryFilter && country !== countryFilter) return false;
    
    // Apply course filter
    if (courseFilter && course !== courseFilter) return false;
    
    // Apply status filter
    if (statusFilter && student.status !== statusFilter) return false;
    
    return true;
  });

  allStudentsEmptyState.hidden = filtered.length > 0;

  if (!filtered.length) {
    allStudentsTableBody.innerHTML = "";
    return;
  }

  allStudentsTableBody.innerHTML = filtered
    .map(({ student, country, course }) => `
      <tr class="${search ? "table-match" : ""}">
        <td>${highlightText(student.studentNumber, search)}</td>
        <td>${highlightText(student.name, search)}</td>
        <td>${escapeHtml(country)}</td>
        <td>${escapeHtml(course)}</td>
        <td>${highlightText(student.phone, search)}</td>
        <td>${highlightText(student.email, search)}</td>
        <td>${renderStatusBadge(student.status)}</td>
        <td>${escapeHtml(student.lastUpdated || "-")}</td>
        <td><button class="button button-secondary" type="button" data-student-id="${student.id}" data-country="${country}" data-course="${course}">Open</button></td>
      </tr>
    `)
    .join("");
}

function openAllStudentsView() {
  allStudentsSearchInput.value = "";
  allStudentsCountryFilter.value = "";
  allStudentsCourseFilter.value = "";
  allStudentsStatusFilter.value = "";
  renderAllStudents();
  showView("all-students");
  clearStatusMessage(appMessage);
  renderGlobalSearchResults();
}

function renderGlobalSearchResults() {
  const query = globalSearchInput.value.trim();
  if (!query) {
    globalSearchResults.hidden = true;
    globalSearchResults.innerHTML = "";
    return;
  }

  const matchingStudents = getMatchingStudents(query).slice(0, 8);
  const matchingFiles = getMatchingFiles(query).slice(0, 5);
  const sections = [];

  if (matchingStudents.length) {
    sections.push(`
      <section class="search-result-group">
        <div class="search-result-label">Students</div>
        ${matchingStudents.map(({ student, country, course }) => `
          <button
            class="search-result-item"
            type="button"
            data-search-student-id="${student.id}"
            data-search-country="${country}"
            data-search-course="${course}"
          >
            <strong>${highlightText(student.name, query)}</strong>
            <span class="search-result-meta">${highlightText(student.studentNumber, query)} | ${highlightText(student.phone, query)} | ${highlightText(student.email, query)}</span>
            <span class="search-result-meta">${escapeHtml(country)} | ${escapeHtml(course)}</span>
          </button>
        `).join("")}
      </section>
    `);
  }

  if (matchingFiles.length) {
    sections.push(`
      <section class="search-result-group">
        <div class="search-result-label">Files</div>
        ${matchingFiles.map(({ file, student, country, course }) => `
          <button
            class="search-result-item"
            type="button"
            data-search-student-id="${student.id}"
            data-search-country="${country}"
            data-search-course="${course}"
          >
            <strong>${highlightText(file.name, query)}</strong>
            <span class="search-result-meta">${escapeHtml(student.name)} (${escapeHtml(student.studentNumber)})</span>
            <span class="search-result-meta">${escapeHtml(country)} | ${escapeHtml(course)}</span>
          </button>
        `).join("")}
      </section>
    `);
  }

  globalSearchResults.hidden = false;
  globalSearchResults.innerHTML = sections.length
    ? sections.join("")
    : `<div class="search-result-empty">No matching students or files.</div>`;
}

function openCountriesView() {
  state.country = "";
  state.course = "";
  state.studentId = "";
  studentSearchInput.value = "";
  fileSearchInput.value = "";
  showView("countries");
  updateBreadcrumbs();
  clearStatusMessage(appMessage);
  renderGlobalSearchResults();
}

function openCoursesView(country) {
  state.country = country;
  state.course = "";
  state.studentId = "";
  studentSearchInput.value = "";
  fileSearchInput.value = "";
  renderCourses();
  showView("courses");
  updateBreadcrumbs();
  clearStatusMessage(appMessage);
  renderGlobalSearchResults();
}

function openStudentsView(course) {
  state.course = course;
  state.studentId = "";
  studentSearchInput.value = "";
  fileSearchInput.value = "";
  renderStudents();
  showView("students");
  updateBreadcrumbs();
  clearStatusMessage(appMessage);
  renderGlobalSearchResults();
}

function openStudentDetail(studentId) {
  state.studentId = studentId;
  fileSearchInput.value = "";
  renderStudentDetail();
  showView("student-detail");
  updateBreadcrumbs();
  clearStatusMessage(appMessage);
  renderGlobalSearchResults();
}

function handleLogin(username, password) {
  const normalizedUsername = normalizeText(username);
  const normalizedPassword = String(password || "").trim();

  clearStatusMessage(loginMessage);

  if (!normalizedUsername || !normalizedPassword) {
    setStatusMessage(loginMessage, "error", "Please enter username and password.");
    return;
  }

  const user = users[normalizedUsername];
  if (!user || user.password !== normalizedPassword) {
    setStatusMessage(loginMessage, "error", "Invalid username or password.");
    return;
  }

  state.user = { username: normalizedUsername, role: user.role };
  saveSession();
  clearStatusMessage(loginMessage);
  updateHeader();
  syncRolePermissions();
  updateDashboardStats();
  renderCountries();
  openCountriesView();
  showScreen("app");
}

function addStudent() {
  if (!canManageStudents()) {
    setStatusMessage(appMessage, "error", "Only admin can add students.");
    return;
  }

  const name = window.prompt("Enter student name:");
  if (name === null) return;

  const trimmedName = name.trim();
  if (!trimmedName) {
    setStatusMessage(appMessage, "error", "Student name cannot be empty.");
    return;
  }

  const existing = getCurrentStudents().some(
    (student) => normalizeText(student.name) === normalizeText(trimmedName)
  );

  if (existing) {
    setStatusMessage(appMessage, "error", "A student with that name already exists.");
    return;
  }

  const phone = window.prompt("Enter phone number:", "+000 000 000 000");
  if (phone === null) return;
  const email = window.prompt("Enter email address:", "student@example.com");
  if (email === null) return;

  getCurrentStudents().push({
    id: crypto.randomUUID(),
    studentNumber: generateStudentNumber(state.country),
    name: trimmedName,
    phone: phone.trim() || "-",
    email: email.trim() || "-",
    status: "Application Created",
    lastUpdated: getTodayLabel(),
    files: []
  });

  renderStudents();
  renderGlobalSearchResults();
  setStatusMessage(appMessage, "success", "Student added successfully.");
}

function editStudent() {
  if (!canManageStudents()) {
    setStatusMessage(appMessage, "error", "Only admin can edit student details.");
    return;
  }

  const student = getCurrentStudent();
  if (!student) return;

  const name = window.prompt("Edit student name:", student.name);
  if (name === null) return;
  const trimmedName = name.trim();
  if (!trimmedName) {
    setStatusMessage(appMessage, "error", "Student name cannot be empty.");
    return;
  }

  const duplicate = getCurrentStudents().some(
    (entry) => entry.id !== student.id && normalizeText(entry.name) === normalizeText(trimmedName)
  );
  if (duplicate) {
    setStatusMessage(appMessage, "error", "Another student with that name already exists.");
    return;
  }

  const phone = window.prompt("Edit phone number:", student.phone);
  if (phone === null) return;
  const email = window.prompt("Edit email address:", student.email);
  if (email === null) return;

  student.name = trimmedName;
  student.phone = phone.trim() || "-";
  student.email = email.trim() || "-";
  student.lastUpdated = getTodayLabel();

  renderStudents();
  renderStudentDetail();
  renderGlobalSearchResults();
  setStatusMessage(appMessage, "success", "Student updated successfully.");
}

function uploadFileForStudent() {
  const student = getCurrentStudent();
  if (!student) return;

  if (!fileInput.files.length) {
    setStatusMessage(appMessage, "error", "Please choose a file before uploading.");
    return;
  }

  const file = fileInput.files[0];
  const sizeMb = Number((file.size / (1024 * 1024)).toFixed(2));
  const sizeLabel = sizeMb >= 1
    ? `${sizeMb.toFixed(2)} MB`
    : `${Math.max(1, Math.round(file.size / 1024))} KB`;

  student.files.unshift({
    id: crypto.randomUUID(),
    name: file.name,
    sizeLabel,
    sizeMb: sizeMb > 0 ? sizeMb : file.size / 1024 / 1024,
    date: getTodayLabel()
  });

  student.lastUpdated = getTodayLabel();
  fileInput.value = "";
  renderStudentDetail();
  renderGlobalSearchResults();
  updateDashboardStats();
  setStatusMessage(appMessage, "success", "File uploaded successfully.");
}

function deleteFile(fileId) {
  if (!canDeleteFiles()) {
    setStatusMessage(appMessage, "error", "Only admin can delete files.");
    return;
  }

  const student = getCurrentStudent();
  if (!student) return;

  const target = student.files.find((file) => file.id === fileId);
  if (!target) {
    setStatusMessage(appMessage, "error", "File could not be found.");
    return;
  }

  if (!window.confirm(`Are you sure you want to delete "${target.name}"?`)) {
    return;
  }

  student.files = student.files.filter((file) => file.id !== fileId);
  renderStudentDetail();
  renderGlobalSearchResults();
  updateDashboardStats();
  setStatusMessage(appMessage, "success", "File deleted successfully.");
}

function updateStudentStatus(nextStatus) {
  if (!canManageStudents()) {
    setStatusMessage(appMessage, "error", "Only admin can update student status.");
    return;
  }

  const student = getCurrentStudent();
  if (!student) return;

  student.status = nextStatus;
  student.lastUpdated = getTodayLabel();
  renderStudents();
  renderStudentDetail();
  renderGlobalSearchResults();
  setStatusMessage(appMessage, "success", "Student status updated.");
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loginButton.disabled = true;
  loginButton.textContent = "Signing in...";
  handleLogin(usernameInput.value, passwordInput.value);
  loginButton.disabled = false;
  loginButton.textContent = "Login";
});

logoutButton.addEventListener("click", () => {
  clearSession();
  state.user = null;
  state.country = "";
  state.course = "";
  state.studentId = "";
  globalSearchInput.value = "";
  globalSearchResults.hidden = true;
  globalSearchResults.innerHTML = "";
  updateHeader();
  syncRolePermissions();
  clearStatusMessage(appMessage);
  clearStatusMessage(loginMessage);
  showScreen("login");
});

countryGrid.addEventListener("click", (event) => {
  if (!ensureAuthenticated()) return;
  const button = event.target.closest("[data-country]");
  if (!button) return;
  openCoursesView(button.dataset.country);
});

courseGrid.addEventListener("click", (event) => {
  if (!ensureAuthenticated()) return;
  const button = event.target.closest("[data-course]");
  if (!button) return;
  openStudentsView(button.dataset.course);
});

studentsTableBody.addEventListener("click", (event) => {
  if (!ensureAuthenticated()) return;
  const button = event.target.closest("[data-student-id]");
  if (!button) return;
  openStudentDetail(button.dataset.studentId);
});

filesTableBody.addEventListener("click", (event) => {
  if (!ensureAuthenticated()) return;
  const button = event.target.closest("[data-action]");
  if (!button) return;

  if (button.dataset.action === "download") {
    setStatusMessage(appMessage, "success", "Download started.");
    return;
  }

  if (button.dataset.action === "delete") {
    deleteFile(button.dataset.fileId);
  }
});

studentSearchInput.addEventListener("input", () => {
  if (!ensureAuthenticated()) return;
  renderStudents();
});

fileSearchInput.addEventListener("input", () => {
  if (!ensureAuthenticated()) return;
  renderStudentDetail();
});

globalSearchInput.addEventListener("input", () => {
  if (!ensureAuthenticated()) return;

  renderGlobalSearchResults();

  const activeView = document.querySelector(".view.active")?.dataset.view;
  if (activeView === "students") {
    renderStudents();
  }

  if (activeView === "student-detail") {
    renderStudentDetail();
  }
});

globalSearchResults.addEventListener("click", (event) => {
  if (!ensureAuthenticated()) return;
  const button = event.target.closest("[data-search-student-id]");
  if (!button) return;

  state.country = button.dataset.searchCountry;
  state.course = button.dataset.searchCourse;
  renderCourses();
  openStudentDetail(button.dataset.searchStudentId);
  globalSearchResults.hidden = true;
});

studentStatusSelect.addEventListener("change", () => {
  if (!ensureAuthenticated()) return;
  updateStudentStatus(studentStatusSelect.value);
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".topbar-search")) return;
  if (!globalSearchInput.value.trim()) return;
  globalSearchResults.hidden = true;
});

uploadButton.addEventListener("click", () => {
  if (!ensureAuthenticated()) return;
  uploadFileForStudent();
});

addStudentButton.addEventListener("click", () => {
  if (!ensureAuthenticated()) return;
  addStudent();
});

editStudentButton.addEventListener("click", () => {
  if (!ensureAuthenticated()) return;
  editStudent();
});

crumbHome.addEventListener("click", () => {
  if (!ensureAuthenticated()) return;
  openCountriesView();
});

crumbCountry.addEventListener("click", () => {
  if (!ensureAuthenticated() || !state.country) return;
  openCoursesView(state.country);
});

crumbCourse.addEventListener("click", () => {
  if (!ensureAuthenticated() || !state.country || !state.course) return;
  openStudentsView(state.course);
});

crumbStudent.addEventListener("click", () => {
  if (!ensureAuthenticated() || !state.studentId) return;
  openStudentDetail(state.studentId);
});

backToCountriesButton.addEventListener("click", () => {
  if (!ensureAuthenticated()) return;
  openCountriesView();
});

backToStudentsButton.addEventListener("click", () => {
  if (!ensureAuthenticated()) return;
  openStudentsView(state.course);
});

viewAllStudentsButton.addEventListener("click", () => {
  if (!ensureAuthenticated()) return;
  openAllStudentsView();
});

backToHomeButton.addEventListener("click", () => {
  if (!ensureAuthenticated()) return;
  openCountriesView();
});

allStudentsSearchInput.addEventListener("input", () => {
  if (!ensureAuthenticated()) return;
  renderAllStudents();
});

allStudentsCountryFilter.addEventListener("change", () => {
  if (!ensureAuthenticated()) return;
  renderAllStudents();
});

allStudentsCourseFilter.addEventListener("change", () => {
  if (!ensureAuthenticated()) return;
  renderAllStudents();
});

allStudentsStatusFilter.addEventListener("change", () => {
  if (!ensureAuthenticated()) return;
  renderAllStudents();
});

allStudentsTableBody.addEventListener("click", (event) => {
  if (!ensureAuthenticated()) return;
  const button = event.target.closest("[data-student-id]");
  if (!button) return;
  
  state.country = button.dataset.country;
  state.course = button.dataset.course;
  state.studentId = button.dataset.studentId;
  renderCourses();
  openStudentDetail(button.dataset.studentId);
});

const session = getSession();
if (session?.user && users[session.user.username]) {
  state.user = {
    username: session.user.username,
    role: users[session.user.username].role
  };
  updateHeader();
  syncRolePermissions();
  updateDashboardStats();
  renderCountries();
  openCountriesView();
  showScreen("app");
} else {
  syncRolePermissions();
  showScreen("login");
}
