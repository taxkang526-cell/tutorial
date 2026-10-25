// 한결 세무회계 - 세무 정보 페이지 (연간 달력, 칼럼, 부가세 계산기)

// 연간 세무 달력
function renderCalendar() {
  const today = startOfToday();
  const year = today.getFullYear();
  const thisMonth = today.getMonth() + 1;
  document.getElementById("calendarTitle").textContent = `${year}년 세무 신고 일정`;

  document.getElementById("calendarGrid").innerHTML = Object.keys(TAX_SCHEDULE)
    .map(Number)
    .map((month) => {
      const items = TAX_SCHEDULE[month]
        .map(({ day, label }) => {
          const due = toBusinessDay(year, month, day);
          const past = due < today;
          return `<li class="${past ? "past" : ""}"><span class="cal-date">${due.getMonth() + 1}/${due.getDate()}</span><span>${escapeHTML(label)}</span></li>`;
        })
        .join("");
      const cls = month === thisMonth ? "current" : month < thisMonth ? "past-month" : "";
      return `
      <article class="month-card ${cls} reveal">
        <h3>${month}월${month === thisMonth ? ' <span class="now-badge">이번 달</span>' : ""}</h3>
        <ul>${items}</ul>
      </article>`;
    })
    .join("");
  observeReveal(document.getElementById("calendarGrid"));
}
renderCalendar();

// 세무 칼럼 목록 + 분야 탭
const columnGrid = document.getElementById("columnGrid");
const columnTabs = document.getElementById("columnTabs");
const sortedColumns = [...COLUMNS].sort((a, b) => b.date.localeCompare(a.date));

function renderColumns(cat) {
  const list = cat === "all" ? sortedColumns : sortedColumns.filter((c) => c.cat === cat);
  columnGrid.innerHTML = list
    .map(
      (c) => `
    <button type="button" class="card column-card hoverable" data-id="${c.id}" id="${c.id}">
      <span class="tag">${COLUMN_CATEGORIES[c.cat]}</span>
      <h3>${escapeHTML(c.title)}</h3>
      <p>${escapeHTML(c.summary)}</p>
      <span class="column-date">${c.date.replace(/-/g, ".")}</span>
      <span class="link-arrow">읽어보기</span>
    </button>`
    )
    .join("");
}

function initColumnTabs() {
  const usedCats = [...new Set(COLUMNS.map((c) => c.cat))];
  columnTabs.innerHTML =
    `<button class="tab" role="tab" data-cat="all" aria-selected="true">전체</button>` +
    usedCats.map((cat) => `<button class="tab" role="tab" data-cat="${cat}" aria-selected="false">${COLUMN_CATEGORIES[cat]}</button>`).join("");

  columnTabs.addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (!tab) return;
    columnTabs.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
    renderColumns(tab.dataset.cat);
  });
  renderColumns("all");
}
initColumnTabs();

// 칼럼 상세 (모달)
const dialog = document.getElementById("columnDialog");

function openColumn(id) {
  const col = COLUMNS.find((c) => c.id === id);
  if (!col) return;
  document.getElementById("dialogTag").textContent = COLUMN_CATEGORIES[col.cat];
  document.getElementById("dialogTitle").textContent = col.title;
  document.getElementById("dialogDate").textContent = col.date.replace(/-/g, ".");
  document.getElementById("dialogBody").innerHTML = col.body.map((p) => `<p>${escapeHTML(p)}</p>`).join("");
  document.getElementById("dialogCta").href = `contact.html?type=${col.cat}`;
  dialog.showModal();
  dialog.scrollTop = 0;
  history.replaceState(null, "", `#${id}`);
}
function closeColumn() {
  dialog.close();
}

columnGrid.addEventListener("click", (e) => {
  const card = e.target.closest(".column-card");
  if (card) openColumn(card.dataset.id);
});
document.getElementById("dialogClose").addEventListener("click", closeColumn);
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) closeColumn(); // 바깥 영역 클릭 시 닫기
});
dialog.addEventListener("close", () => {
  if (location.hash.startsWith("#col-")) history.replaceState(null, "", "#columns");
});

// 홈에서 insights.html#col-3 처럼 들어오면 해당 칼럼 열기
if (location.hash.startsWith("#col-")) {
  const id = location.hash.slice(1);
  document.getElementById("columns").scrollIntoView();
  openColumn(id);
}

// 부가세 계산기
const calcInput = document.getElementById("calcInput");
const calcLabel = document.getElementById("calcLabel");
const modeTabs = [...document.querySelectorAll(".calc-mode .tab")];
let calcMode = "supply";

const won = (n) => `${n.toLocaleString("ko-KR")}원`;

function calculate() {
  const amount = Number(calcInput.value.replace(/\D/g, "")) || 0;
  let supply, vat, total;
  if (calcMode === "supply") {
    supply = amount;
    vat = Math.floor(supply * 0.1);
    total = supply + vat;
  } else {
    total = amount;
    supply = Math.ceil(total / 1.1); // 합계 = 공급가액 + 절사된 부가세 가 되도록 올림
    vat = total - supply;
  }
  document.getElementById("resSupply").textContent = won(supply);
  document.getElementById("resVat").textContent = won(vat);
  document.getElementById("resTotal").textContent = won(total);
}

calcInput.addEventListener("input", () => {
  const digits = calcInput.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 13);
  calcInput.value = digits ? Number(digits).toLocaleString("ko-KR") : "";
  calculate();
});

modeTabs.forEach((tab) =>
  tab.addEventListener("click", () => {
    calcMode = tab.dataset.mode;
    modeTabs.forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
    calcLabel.textContent = calcMode === "supply" ? "공급가액" : "합계금액 (부가세 포함)";
    calculate();
    calcInput.focus();
  })
);
