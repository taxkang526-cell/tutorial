// 한결 세무회계 - 모든 페이지 공통 동작

const header = document.getElementById("header");
const nav = document.getElementById("nav");
const menuToggle = document.getElementById("menuToggle");
const toTop = document.getElementById("toTop");

// 스크롤 시 헤더 배경, 맨 위로 버튼
function onScroll() {
  const y = window.scrollY;
  header.classList.toggle("scrolled", y > 40);
  toTop.classList.toggle("show", y > 600);
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

toTop.addEventListener("click", (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// 모바일 메뉴
function setMenu(open) {
  nav.classList.toggle("open", open);
  header.classList.toggle("open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
}
menuToggle.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMenu(false);
});

// 스크롤 등장 애니메이션
const revealObserver = new IntersectionObserver(
  (entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        obs.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);
function observeReveal(root = document) {
  root.querySelectorAll(".reveal:not(.visible)").forEach((el) => revealObserver.observe(el));
}
observeReveal();

// 아코디언 (자주 묻는 질문, 개인정보 안내 등) - 같은 .acc-list 안에서는 하나만 열림
function setAccordion(btn, open) {
  const answer = btn.nextElementSibling;
  btn.setAttribute("aria-expanded", String(open));
  answer.style.maxHeight = open ? answer.scrollHeight + "px" : null;
}
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".acc-q");
  if (!btn) return;
  const isOpen = btn.getAttribute("aria-expanded") === "true";
  const list = btn.closest(".acc-list");
  if (list) list.querySelectorAll('.acc-q[aria-expanded="true"]').forEach((other) => setAccordion(other, false));
  setAccordion(btn, !isOpen);
});

// 페이지 내 서브 메뉴 - 현재 보고 있는 섹션 강조
const subnav = document.querySelector(".subnav");
if (subnav) {
  const subList = subnav.querySelector("ul");
  const subLinks = [...subnav.querySelectorAll('a[href^="#"]')];
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        subLinks.forEach((link) => {
          const active = link.getAttribute("href") === `#${entry.target.id}`;
          link.classList.toggle("active", active);
          // 모바일에서 가로로 넘치는 메뉴는 현재 항목이 보이도록 가로 스크롤만 이동
          if (active) subList.scrollTo({ left: link.offsetLeft - subList.offsetLeft - (subList.clientWidth - link.offsetWidth) / 2, behavior: "smooth" });
        });
      });
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );
  subLinks.forEach((link) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (target) spy.observe(target);
  });
}

// 신고 기한이 주말이면 다음 월요일로 (공휴일은 반영하지 않음)
function toBusinessDay(year, month, day) {
  const date = new Date(year, month - 1, day);
  const dow = date.getDay();
  if (dow === 6) date.setDate(date.getDate() + 2);
  if (dow === 0) date.setDate(date.getDate() + 1);
  return date;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
