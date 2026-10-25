// 한결 세무회계 - 공통 레이아웃 (헤더, 하단 상담 띠, 푸터, 모바일 고정 버튼)
// 메뉴나 연락처를 바꿀 때는 이 파일만 수정하면 모든 페이지에 반영됩니다.

const SITE = {
  name: "한결 세무회계",
  ceo: "김한결",
  bizNo: "000-00-00000",
  phone: "02-1234-5678",
  email: "info@hangyeol-tax.kr",
  kakao: "https://pf.kakao.com/", // 실제 카카오톡 채널 주소로 교체
  address: "서울특별시 강남구 테헤란로 123, 7층",
  hours: "평일 09:00 – 18:00 (점심 12:00 – 13:00)",
};

const NAV_ITEMS = [
  { page: "about", href: "about.html", label: "사무실 소개" },
  { page: "services", href: "services.html", label: "업무 분야" },
  { page: "insights", href: "insights.html", label: "세무 정보" },
  { page: "faq", href: "faq.html", label: "자주 묻는 질문" },
];

const currentPage = document.body.dataset.page;

function headerHTML() {
  const links = NAV_ITEMS.map(
    (item) =>
      `<a href="${item.href}"${item.page === currentPage ? ' class="active" aria-current="page"' : ""}>${item.label}</a>`
  ).join("");
  const ctaActive = currentPage === "contact" ? ' aria-current="page"' : "";

  return `
  <header class="header" id="header">
    <div class="container header-inner">
      <a href="index.html" class="logo">
        <span class="logo-mark">한</span>
        <span class="logo-text">${SITE.name}</span>
      </a>
      <nav class="nav" id="nav" aria-label="주요 메뉴">
        ${links}
        <a href="contact.html" class="nav-cta"${ctaActive}>상담 신청</a>
      </nav>
      <button class="menu-toggle" id="menuToggle" aria-label="메뉴 열기" aria-expanded="false" aria-controls="nav">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>`;
}

function ctaBandHTML() {
  return `
  <section class="cta-band">
    <div class="container cta-band-inner">
      <div>
        <h2>세금 고민, 혼자 하지 마세요</h2>
        <p>첫 상담 30분은 무료입니다. 상황만 알려주시면 담당 세무사가 직접 연락드립니다.</p>
      </div>
      <div class="cta-band-buttons">
        <a href="tel:${SITE.phone}" class="btn btn-ghost">📞 ${SITE.phone}</a>
        <a href="contact.html" class="btn btn-primary">상담 신청하기</a>
      </div>
    </div>
  </section>`;
}

function footerHTML() {
  const sitemap = [{ href: "index.html", label: "홈" }, ...NAV_ITEMS, { href: "contact.html", label: "상담 신청" }]
    .map((item) => `<li><a href="${item.href}">${item.label}</a></li>`)
    .join("");

  return `
  <footer class="footer">
    <div class="container footer-grid">
      <div class="footer-brand">
        <a href="index.html" class="logo">
          <span class="logo-mark">한</span>
          <span class="logo-text">${SITE.name}</span>
        </a>
        <p>개인·법인 세무 기장, 신고 대행, 절세 컨설팅.<br />한결같은 마음으로 고객의 곁을 지킵니다.</p>
      </div>
      <div>
        <h3>바로가기</h3>
        <ul class="footer-links">${sitemap}</ul>
      </div>
      <div>
        <h3>연락처</h3>
        <ul class="footer-info">
          <li>전화 <a href="tel:${SITE.phone}">${SITE.phone}</a></li>
          <li>이메일 <a href="mailto:${SITE.email}">${SITE.email}</a></li>
          <li>${SITE.address}</li>
        </ul>
      </div>
      <div>
        <h3>운영시간</h3>
        <ul class="footer-info">
          <li>평일 09:00 – 18:00</li>
          <li>점심 12:00 – 13:00</li>
          <li>토·일·공휴일 휴무</li>
        </ul>
      </div>
    </div>
    <div class="container footer-bottom">
      <p>대표 ${SITE.ceo} · 사업자등록번호 ${SITE.bizNo}</p>
      <p><a href="contact.html#privacy">개인정보처리방침</a> · © ${new Date().getFullYear()} ${SITE.name}. All rights reserved.</p>
    </div>
  </footer>`;
}

function quickBarHTML() {
  return `
  <div class="quick-bar" aria-label="빠른 연락">
    <a href="tel:${SITE.phone}"><span>📞</span>전화</a>
    <a href="${SITE.kakao}" target="_blank" rel="noopener"><span>💬</span>카카오톡</a>
    <a href="contact.html" class="primary"><span>✍️</span>상담 신청</a>
  </div>
  <a href="#top" class="to-top" id="toTop" aria-label="맨 위로">↑</a>`;
}

function mount(id, html) {
  const slot = document.getElementById(id);
  if (!slot) return;
  const tpl = document.createElement("template");
  tpl.innerHTML = html.trim();
  slot.replaceWith(tpl.content);
}

mount("site-header", headerHTML());
mount("site-footer", (currentPage === "contact" ? "" : ctaBandHTML()) + footerHTML() + quickBarHTML());
