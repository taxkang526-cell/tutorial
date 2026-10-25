// 한결 세무회계 - 자주 묻는 질문 (분야 탭 + 검색)

const faqItems = [...document.querySelectorAll("#faqList .acc-item")];
const faqTabs = [...document.querySelectorAll("#faqTabs .tab")];
const faqSearch = document.getElementById("faqSearch");
const faqCount = document.getElementById("faqCount");
const faqEmpty = document.getElementById("faqEmpty");

let activeCat = "all";

function applyFaqFilter() {
  const keyword = faqSearch.value.trim().toLowerCase();
  let shown = 0;

  faqItems.forEach((item) => {
    const matchCat = activeCat === "all" || item.dataset.cat === activeCat;
    const matchText = !keyword || item.textContent.toLowerCase().includes(keyword);
    const visible = matchCat && matchText;
    item.hidden = !visible;
    if (!visible) {
      const q = item.querySelector(".acc-q");
      if (q.getAttribute("aria-expanded") === "true") setAccordion(q, false);
    }
    if (visible) shown++;
  });

  faqCount.textContent = keyword ? `'${faqSearch.value.trim()}' 검색 결과 ${shown}건` : `질문 ${shown}개`;
  faqEmpty.hidden = shown !== 0;
}

function selectTab(cat) {
  activeCat = faqTabs.some((t) => t.dataset.cat === cat) ? cat : "all";
  faqTabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.cat === activeCat)));
  applyFaqFilter();
}

faqTabs.forEach((tab) => tab.addEventListener("click", () => selectTab(tab.dataset.cat)));
faqSearch.addEventListener("input", applyFaqFilter);

// 업무 분야 페이지에서 faq.html?cat=income 처럼 들어오면 해당 탭 선택
selectTab(new URLSearchParams(location.search).get("cat") || "all");
