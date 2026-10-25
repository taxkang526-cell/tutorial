// 한결 세무회계 - 홈 페이지

// 이번 달 세무 일정
function renderSchedule() {
  const list = document.getElementById("schedule");
  const today = startOfToday();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const items = TAX_SCHEDULE[month] || [];

  document.getElementById("scheduleTitle").textContent = `${month}월 세무 일정`;

  if (items.length === 0) {
    list.innerHTML = '<li class="empty">이번 달 주요 신고 일정이 없습니다.</li>';
    return;
  }
  list.innerHTML = items
    .map(({ day, label }) => {
      const due = toBusinessDay(year, month, day);
      const dDay = Math.round((due - today) / 86400000);
      const badge = dDay > 0 ? `D-${dDay}` : dDay === 0 ? "D-Day" : "마감";
      const cls = dDay < 0 ? "done" : dDay <= 7 ? "soon" : "";
      return `<li class="${cls}"><span>${escapeHTML(label)}</span><span class="date">${due.getMonth() + 1}/${due.getDate()} · ${badge}</span></li>`;
    })
    .join("");
}
renderSchedule();

// 숫자 카운트업
function animateCounter(el) {
  const target = Number(el.dataset.target);
  const duration = 1400;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(target * eased).toLocaleString("ko-KR");
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
const counterObserver = new IntersectionObserver(
  (entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        obs.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.5 }
);
document.querySelectorAll(".counter").forEach((el) => counterObserver.observe(el));

// 고객 후기 슬라이더
function initReviewSlider() {
  const track = document.getElementById("reviewTrack");
  const dots = document.getElementById("reviewDots");
  let index = 0;
  let timer;

  track.innerHTML = REVIEWS.map(
    (r, i) => `
    <figure class="slide review" role="group" aria-roledescription="slide" aria-label="${i + 1} / ${REVIEWS.length}">
      <span class="review-stars" aria-hidden="true">★★★★★</span>
      <blockquote>${escapeHTML(r.text)}</blockquote>
      <figcaption><strong>${escapeHTML(r.name)}</strong><span>${escapeHTML(r.biz)}</span></figcaption>
    </figure>`
  ).join("");
  dots.innerHTML = REVIEWS.map((_, i) => `<button aria-label="${i + 1}번째 후기"></button>`).join("");

  function go(i) {
    index = (i + REVIEWS.length) % REVIEWS.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.querySelectorAll("button").forEach((d, di) => d.setAttribute("aria-current", String(di === index)));
  }
  function restart() {
    clearInterval(timer);
    timer = setInterval(() => go(index + 1), 6000);
  }

  document.getElementById("reviewPrev").addEventListener("click", () => { go(index - 1); restart(); });
  document.getElementById("reviewNext").addEventListener("click", () => { go(index + 1); restart(); });
  dots.querySelectorAll("button").forEach((d, i) => d.addEventListener("click", () => { go(i); restart(); }));

  const slider = document.getElementById("reviewSlider");
  slider.addEventListener("mouseenter", () => clearInterval(timer));
  slider.addEventListener("mouseleave", restart);

  // 터치 스와이프
  let startX = null;
  slider.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
  slider.addEventListener("touchend", (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) { go(index + (dx < 0 ? 1 : -1)); restart(); }
    startX = null;
  });

  go(0);
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) restart();
}
initReviewSlider();

// 최신 칼럼 3개
function renderLatestColumns() {
  const wrap = document.getElementById("latestColumns");
  const latest = [...COLUMNS].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  wrap.innerHTML = latest
    .map(
      (c) => `
    <a href="insights.html#${c.id}" class="card column-card reveal">
      <span class="tag">${COLUMN_CATEGORIES[c.cat]}</span>
      <h3>${escapeHTML(c.title)}</h3>
      <p>${escapeHTML(c.summary)}</p>
      <span class="column-date">${c.date.replace(/-/g, ".")}</span>
    </a>`
    )
    .join("");
  observeReveal(wrap);
}
renderLatestColumns();
