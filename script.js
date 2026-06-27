let data = [];
let filteredData = [];

let currentPage = 1;
const rowsPerPage = 20;

let chart;

// ================= LOAD DATA =================
fetch("data.json")
  .then(res => res.json())
  .then(json => {
    data = json;
    filteredData = data;
    updateUI();
  });

// ================= TABLE =================
function renderTable(data) {
  const start = (currentPage - 1) * rowsPerPage;
  const paginated = data.slice(start, start + rowsPerPage);

  const table = document.getElementById("tableBody");
  table.innerHTML = "";

  paginated.forEach(item => {
    table.innerHTML += `
      <tr>
        <td>${item.Nama}</td>
        <td>${item.Sekolah}</td>
        <td>${item["Kab/Kota"]}</td>
        <td>${item.Provinsi}</td>
      </tr>
    `;
  });

  renderPagination(data.length);
}

// ================= PAGINATION =================
function renderPagination(total) {
  const pageCount = Math.ceil(total / rowsPerPage);
  const container = document.getElementById("pagination");

  container.innerHTML = "";

  for (let i = 1; i <= pageCount; i++) {
    container.innerHTML += `
      <button onclick="goToPage(${i})">${i}</button>
    `;
  }
}

function goToPage(page) {
  currentPage = page;
  renderTable(filteredData);
}

// ================= SEARCH (DEBOUNCE) =================
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

document.getElementById("search").addEventListener("input",
  debounce((e) => {
    const keyword = e.target.value.toLowerCase();

    filteredData = data.filter(item =>
      item.Nama.toLowerCase().includes(keyword) ||
      item.Sekolah.toLowerCase().includes(keyword)
    );

    currentPage = 1;
    updateUI();
  }, 300)
);

// ================= FILTER =================
document.getElementById("filterJenjang").addEventListener("change", (e) => {
  const val = e.target.value;

  filteredData = data.filter(item =>
    val === "" || item.Sekolah.includes(val)
  );

  currentPage = 1;
  updateUI();
});

// ================= CHART =================
function renderChart(data) {
  const count = {};

  data.forEach(item => {
    count[item.Sekolah] = (count[item.Sekolah] || 0) + 1;
  });

  const sorted = Object.entries(count)
    .sort((a,b) => b[1]-a[1])
    .slice(0, 10);

  const labels = sorted.map(x => x[0]);
  const values = sorted.map(x => x[1]);

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById("chartSekolah"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Top Sekolah",
        data: values
      }]
    }
  });
}

// ================= TOP 3 =================
function renderTop3(data) {
  const count = {};

  data.forEach(item => {
    count[item.Sekolah] = (count[item.Sekolah] || 0) + 1;
  });

  const top = Object.entries(count)
    .sort((a,b) => b[1]-a[1])
    .slice(0, 3);

  const medals = ["🥇", "🥈", "🥉"];

  document.getElementById("top3").innerHTML =
    top.map((item, i) =>
      `<div>${medals[i]} ${item[0]} (${item[1]})</div>`
    ).join("");
}

// ================= EXPORT =================
function exportExcel() {
  const ws = XLSX.utils.json_to_sheet(filteredData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "OSN-K");

  XLSX.writeFile(wb, "hasil_osnk.xlsx");
}

// ================= DARK MODE =================
function toggleDark() {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", document.body.classList.contains("dark"));
}

if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark");
}

// ================= UPDATE UI =================
function updateUI() {
  renderTable(filteredData);
  renderChart(filteredData);
  renderTop3(filteredData);
}