let data = [];
let filteredData = [];
let currentPage = 1;
const rowsPerPage = 5;

const tableBody = document.querySelector("#table tbody");
const searchInput = document.getElementById("search");
const filterSekolah = document.getElementById("filterSekolah");
const pagination = document.getElementById("pagination");
const top3Div = document.getElementById("top3");
const loading = document.getElementById("loading");
const noData = document.getElementById("noData");

// FETCH DATA
fetch("data.json")
  .then(res => res.json())
  .then(json => {
    data = json;
    filteredData = data;

    initFilter();
    updateUI();

    loading.style.display = "none";
  });

// INIT FILTER SEKOLAH
function initFilter() {
  const sekolahSet = [...new Set(data.map(d => d.Sekolah))];

  sekolahSet.forEach(sekolah => {
    const opt = document.createElement("option");
    opt.value = sekolah;
    opt.textContent = sekolah;
    filterSekolah.appendChild(opt);
  });
}

// UPDATE UI
function updateUI() {
  renderTable();
  renderPagination();
  renderTop3();
}

// RENDER TABLE
function renderTable() {
  tableBody.innerHTML = "";

  const start = (currentPage - 1) * rowsPerPage;
  const pageData = filteredData.slice(start, start + rowsPerPage);

  if (pageData.length === 0) {
    noData.classList.remove("hidden");
  } else {
    noData.classList.add("hidden");
  }

  pageData.forEach((item, index) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${start + index + 1}</td>
      <td>${item.Nama}</td>
      <td>${item.Sekolah}</td>
      <td>${item.Nilai}</td>
    `;

    tableBody.appendChild(tr);
  });
}

// PAGINATION
function renderPagination() {
  pagination.innerHTML = "";
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;

    if (i === currentPage) btn.style.fontWeight = "bold";

    btn.addEventListener("click", () => {
      currentPage = i;
      renderTable();
    });

    pagination.appendChild(btn);
  }
}

// SEARCH (DEBOUNCE)
let timeout;
searchInput.addEventListener("input", () => {
  clearTimeout(timeout);
  timeout = setTimeout(applyFilter, 300);
});

// FILTER SEKOLAH
filterSekolah.addEventListener("change", applyFilter);

function applyFilter() {
  const keyword = searchInput.value.toLowerCase();
  const sekolah = filterSekolah.value;

  filteredData = data.filter(d => {
    return (
      d.Nama.toLowerCase().includes(keyword) &&
      (sekolah === "" || d.Sekolah === sekolah)
    );
  });

  currentPage = 1;
  updateUI();
}

// TOP 3
function renderTop3() {
  const top = [...filteredData]
    .sort((a, b) => b.Nilai - a.Nilai)
    .slice(0, 3);

  top3Div.innerHTML = "🏆 Top 3: " +
    top.map(d => `${d.Nama} (${d.Nilai})`).join(", ");
}

// DARK MODE
document.getElementById("toggleDark").addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

// EXPORT CSV (Excel)
document.getElementById("exportExcel").addEventListener("click", () => {
  let csv = "Nama,Sekolah,Nilai\n";

  filteredData.forEach(d => {
    csv += `${d.Nama},${d.Sekolah},${d.Nilai}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "data.csv";
  a.click();
});
