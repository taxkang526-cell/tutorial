// 한결 세무회계 - 상담 신청 페이지

const form = document.getElementById("contactForm");
const nameInput = document.getElementById("name");
const phoneInput = document.getElementById("phone");
const emailInput = document.getElementById("email");
const typeSelect = document.getElementById("type");
const messageInput = document.getElementById("message");
const formMsg = document.getElementById("formMsg");

// 현재 상담 가능 여부 (평일 09–18시, 점심 12–13시 제외 / 공휴일은 반영하지 않음)
function renderOfficeStatus() {
  const el = document.getElementById("officeStatus");
  const now = new Date();
  const dow = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const weekday = dow >= 1 && dow <= 5;

  let state = "closed";
  let text = "지금은 영업시간이 아닙니다 · 온라인 신청은 24시간 가능합니다";
  if (weekday && minutes >= 540 && minutes < 1080) {
    if (minutes >= 720 && minutes < 780) {
      state = "break";
      text = "점심시간입니다 · 13:00부터 상담이 재개됩니다";
    } else {
      state = "open";
      text = "지금 전화 상담 가능합니다";
    }
  }
  el.className = `status ${state}`;
  el.innerHTML = `<span class="status-dot"></span>${text}`;

  // 운영시간 표에서 오늘 해당 줄 강조
  document.querySelectorAll("#hoursTable tr[data-days]").forEach((tr) => {
    tr.classList.toggle("today", tr.dataset.days.split(",").includes(String(dow)));
  });
}
renderOfficeStatus();
setInterval(renderOfficeStatus, 60000);

// 상담 분야별 준비물
function renderPrepList() {
  const items = PREP_LIST[typeSelect.value] || PREP_LIST.etc;
  document.getElementById("prepType").textContent = typeSelect.options[typeSelect.selectedIndex].text;
  document.getElementById("prepList").innerHTML = items.map((item) => `<li>${escapeHTML(item)}</li>`).join("");
}
typeSelect.addEventListener("change", renderPrepList);

// 업무 분야 페이지에서 contact.html?type=income 처럼 들어오면 해당 분야 선택
const presetType = new URLSearchParams(location.search).get("type");
if (presetType && PREP_LIST[presetType]) typeSelect.value = presetType;
renderPrepList();

// 연락처 자동 하이픈
phoneInput.addEventListener("input", () => {
  const digits = phoneInput.value.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) phoneInput.value = digits;
  else if (digits.length < 8) phoneInput.value = `${digits.slice(0, 3)}-${digits.slice(3)}`;
  else phoneInput.value = `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(-4)}`;
});

// 글자 수
const charCount = document.getElementById("charCount");
messageInput.addEventListener("input", () => {
  charCount.textContent = `${messageInput.value.length} / ${messageInput.maxLength}`;
});

// 폼 제출
const PHONE_RE = /^01\d-\d{3,4}-\d{4}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const email = emailInput.value.trim();
  const agree = document.getElementById("agree").checked;

  nameInput.classList.toggle("invalid", !name);
  phoneInput.classList.toggle("invalid", !PHONE_RE.test(phone));
  emailInput.classList.toggle("invalid", email !== "" && !EMAIL_RE.test(email));

  let error = "";
  if (!name) error = "이름을 입력해 주세요.";
  else if (!PHONE_RE.test(phone)) error = "올바른 휴대폰 번호를 입력해 주세요.";
  else if (email && !EMAIL_RE.test(email)) error = "이메일 형식을 확인해 주세요.";
  else if (!agree) error = "개인정보 수집 및 이용에 동의해 주세요.";

  if (error) {
    formMsg.textContent = error;
    formMsg.className = "form-msg error";
    form.querySelector(".invalid")?.focus();
    return;
  }

  // 실제 운영 시 이 부분에서 서버(또는 Formspree·EmailJS 같은 전송 서비스)로 데이터를 보내면 됩니다.
  // 현재는 화면에 접수 메시지만 표시하며, 입력 내용은 어디에도 전송되지 않습니다.
  formMsg.textContent = `${name}님, 상담 신청이 접수되었습니다. 영업일 기준 1일 이내에 연락드리겠습니다.`;
  formMsg.className = "form-msg success";
  form.reset();
  charCount.textContent = `0 / ${messageInput.maxLength}`;
  renderPrepList();
});
