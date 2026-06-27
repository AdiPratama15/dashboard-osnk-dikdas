let data = [];
let filteredData = [];

let currentPage = 1;
const rowsPerPage = 20;

let chart;

// ================= FILTER STATE =================
const filters = {
  search: '',
  jenjang: '',
  cabang: '',
  provinsi: ''
};

// ================= LOAD DATA =================
fetch("data.json")
  .then(res => res.json())
  .then(json => {
    // Bersihkan data malformed (baris CSV yang salah parsing)
    const VALID_CABANG = ['IPA', 'IPS', 'Matematika'];
    data = json.filter(item =>
      item.Nama && item.Sekolah &&
      VALID_CABANG.includes(item.Cabang)
    );
    filteredData = data;
    populateProvinsiFilter();
    updateUI();
  });

// ================= POPULATE FILTER PROVINSI =================
function populateProvinsiFilter() {
  const provSelect = document.getElementById("filterProvinsi");
  const provinces = [...new Set(data.map(d => d.Provinsi).filter(Boolean))].sort();
  provinces.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p.replace(/^Prov\.\s*/, '');
    provSelect.appendChild(opt);
  });
}

// ================= SCHOOL KEY & LABEL =================
// Menggunakan NPSN sebagai kunci unik per sekolah per lokasi.
// Ini mencegah sekolah berantai (seperti SD IT ROBBANI cabang beda kota)
// dianggap sebagai satu sekolah.
function getSchoolKey(item) {
  if (item.NPSN && item.NPSN.trim() !== '') {
    return item.NPSN;
  }
  // Fallback: komposit nama + kota + provinsi
  return `${item.Sekolah}||${item['Kab/Kota']}||${item.Provinsi}`;
}

function getSchoolInfo(item) {
  return {
    nama: item.Sekolah,
    kota: item['Kab/Kota'],
    provinsi: item.Provinsi,
    npsn: item.NPSN
  };
}

// ================= APPLY FILTERS (GABUNGAN) =================
// Filter state gabungan — tidak saling override satu sama lain
function applyFilters() {
  filteredData = data.filter(item => {
    const kw = filters.search;
    const matchSearch = !kw ||
      item.Nama.toLowerCase().includes(kw) ||
      item.Sekolah.toLowerCase().includes(kw) ||
      (item['Kab/Kota'] || '').toLowerCase().includes(kw);

    const matchJenjang = !filters.jenjang ||
      item.Sekolah.toUpperCase().includes(filters.jenjang);

    const matchCabang = !filters.cabang || item.Cabang === filters.cabang;

    const matchProvinsi = !filters.provinsi || item.Provinsi === filters.provinsi;

    return matchSearch && matchJenjang && matchCabang && matchProvinsi;
  });

  currentPage = 1;
  updateUI();
}

// ================= EVENT LISTENERS =================
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

document.getElementById("search").addEventListener("input",
  debounce((e) => {
    filters.search = e.target.value.toLowerCase().trim();
    applyFilters();
  }, 300)
);

document.getElementById("filterJenjang").addEventListener("change", (e) => {
  filters.jenjang = e.target.value;
  applyFilters();
});

document.getElementById("filterCabang").addEventListener("change", (e) => {
  filters.cabang = e.target.value;
  applyFilters();
});

document.getElementById("filterProvinsi").addEventListener("change", (e) => {
  filters.provinsi = e.target.value;
  applyFilters();
});

// ================= TABLE =================
function renderTable(dataArr) {
  const start = (currentPage - 1) * rowsPerPage;
  const paginated = dataArr.slice(start, start + rowsPerPage);

  const table = document.getElementById("tableBody");
  table.innerHTML = "";

  paginated.forEach(item => {
    const cabangClass = {
      'IPA': 'cabang-ipa',
      'IPS': 'cabang-ips',
      'Matematika': 'cabang-mat'
    }[item.Cabang] || '';

    table.innerHTML += `
      <tr>
        <td>${item.Nama}</td>
        <td><span class="cabang-badge ${cabangClass}">${item.Cabang || '-'}</span></td>
        <td>${item.Sekolah}</td>
        <td>${item['Kab/Kota']}</td>
        <td>${(item.Provinsi || '').replace(/^Prov\.\s*/, '')}</td>
      </tr>
    `;
  });

  renderPagination(dataArr.length);
}

// ================= PAGINATION (SMART) =================
function renderPagination(total) {
  const pageCount = Math.ceil(total / rowsPerPage);
  const container = document.getElementById("pagination");
  container.innerHTML = '';

  const info = document.createElement('span');
  info.id = 'pageInfo';
  info.textContent = `Menampilkan ${Math.min((currentPage-1)*rowsPerPage+1, total)}–${Math.min(currentPage*rowsPerPage, total)} dari ${total.toLocaleString('id-ID')} data`;
  container.appendChild(info);

  if (pageCount <= 1) return;

  // Tentukan halaman yang ditampilkan (cerdas)
  const showPages = new Set();
  showPages.add(1);
  showPages.add(pageCount);
  for (let i = Math.max(1, currentPage - 2); i <= Math.min(pageCount, currentPage + 2); i++) {
    showPages.add(i);
  }
  const sortedPages = [...showPages].sort((a, b) => a - b);

  let prev = 0;
  sortedPages.forEach(i => {
    if (prev && i - prev > 1) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'ellipsis';
      ellipsis.textContent = '…';
      container.appendChild(ellipsis);
    }
    const btn = document.createElement('button');
    btn.textContent = i;
    if (i === currentPage) btn.classList.add('active-page');
    btn.onclick = () => goToPage(i);
    container.appendChild(btn);
    prev = i;
  });
}

function goToPage(page) {
  currentPage = page;
  renderTable(filteredData);
  window.scrollTo({ top: document.getElementById("tableBody").offsetTop - 60, behavior: 'smooth' });
}

// ================= RANK PER SEKOLAH UNIK =================
function buildSchoolRanking(dataArr) {
  const count = {};
  const info = {};

  dataArr.forEach(item => {
    const key = getSchoolKey(item);
    count[key] = (count[key] || 0) + 1;
    if (!info[key]) info[key] = getSchoolInfo(item);
  });

  return Object.entries(count)
    .map(([key, cnt]) => ({ key, count: cnt, ...info[key] }))
    .sort((a, b) => b.count - a.count);
}

// ================= CHART =================
function renderChart(dataArr) {
  const ranking = buildSchoolRanking(dataArr).slice(0, 10);

  // Label singkat untuk sumbu X, tooltip full
  const shortLabels = ranking.map(r => {
    const nama = r.nama.length > 22 ? r.nama.substring(0, 22) + '…' : r.nama;
    const kota = r.kota.replace(/^Kab\.\s*|^Kota\s*/i, '');
    return [nama, kota];
  });

  const fullLabels = ranking.map(r =>
    `${r.nama} — ${r.kota}, ${r.provinsi.replace(/^Prov\.\s*/, '')}`
  );

  const values = ranking.map(r => r.count);

  const isDark = document.body.classList.contains('dark');
  const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const tickColor = isDark ? '#ccc' : '#333';

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById("chartSekolah"), {
    type: "bar",
    data: {
      labels: shortLabels,
      datasets: [{
        label: "Peserta Lolos",
        data: values,
        backgroundColor: "rgba(54, 162, 235, 0.75)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Top 10 Sekolah (per Cabang Kota/NPSN)',
          color: tickColor,
          font: { size: 13 }
        },
        tooltip: {
          callbacks: {
            title: (items) => fullLabels[items[0].dataIndex],
            label: (item) => `${item.raw} peserta lolos`
          }
        },
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, color: tickColor },
          grid: { color: gridColor }
        },
        x: {
          ticks: {
            maxRotation: 40,
            font: { size: 10 },
            color: tickColor
          },
          grid: { display: false }
        }
      }
    }
  });
}

// ================= TOP 3 =================
function renderTop3(dataArr) {
  const ranking = buildSchoolRanking(dataArr).slice(0, 3);
  const medals = ["🥇", "🥈", "🥉"];

  document.getElementById("top3").innerHTML = ranking.length === 0
    ? '<p style="color:#888">Tidak ada data.</p>'
    : ranking.map((r, i) => `
        <div class="top3-item">
          <div class="top3-medal">${medals[i]}</div>
          <div class="top3-body">
            <div class="top3-name">${r.nama}</div>
            <div class="top3-location">📍 ${r.kota}, ${r.provinsi.replace(/^Prov\.\s*/, '')}</div>
            ${r.npsn ? `<div class="top3-npsn">NPSN: ${r.npsn}</div>` : ''}
          </div>
          <div class="top3-count">${r.count}<span class="top3-label">peserta</span></div>
        </div>
      `).join('');
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
  // Re-render chart agar warna grid/teks ikut berubah
  renderChart(filteredData);
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
