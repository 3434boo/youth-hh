/***** 화면 상태 관리 *****/
let currentScreen = 'main-screen';
let screenHistory = [];

/***** 예약 관련 전역 변수 *****/
let selectedFacility = null;
let selectedFacilityNumber = null;
let selectedTime = null;
let selectedStatusFacility = null;

/***** 날짜 자동 초기화 체크 *****/
const todayDateStrLocal = new Date().toLocaleDateString('ko-KR');
const lastDate = localStorage.getItem('lastUsedDate');
if (lastDate && lastDate !== todayDateStrLocal) {
  localStorage.removeItem('reservations');
}
localStorage.setItem('lastUsedDate', todayDateStrLocal);

/***** localStorage에서 기존 예약 데이터 불러오기 (로컬 다운로드용) *****/
let reservations = JSON.parse(localStorage.getItem('reservations')) || [];

function saveToLocalStorage() {
  localStorage.setItem('reservations', JSON.stringify(reservations));
  localStorage.setItem('lastUsedDate', todayDateStrLocal);
}

/***** 날짜 헬퍼(YYYY-MM-DD) — Firebase date 형식 통일 *****/
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

/***** Firebase: 오늘 예약 전체 삭제 (원자적 업데이트) *****/
async function resetFirebaseToday() {
  const dbRef = firebase.database().ref('reservations');
  const today = todayISO();
  const snap = await dbRef.orderByChild('date').equalTo(today).once('value');
  if (!snap.exists()) return 0;

  const updates = {};
  snap.forEach(child => { updates[child.key] = null; }); // set(null) == remove()
  await dbRef.update(updates);
  return Object.keys(updates).length;
}

/***** 초기화 (확인창 포함) — 로컬 + Firebase 동시 초기화 *****/
async function resetReservations() {
  if (!confirm("모든 예약 데이터를 초기화하시겠습니까?")) return;
  try {
    // 로컬 초기화
    localStorage.removeItem('reservations');
    reservations = [];

    // Firebase 오늘 데이터 삭제
    const removed = await resetFirebaseToday();

    // 화면 갱신
    if (currentScreen === 'status-screen') {
      loadReservationStatus();
    } else if (currentScreen === 'all-status-screen') {
      loadAllStatus();
    }
    setTimeout(() => {
      if (currentScreen === 'status-screen') loadReservationStatus();
      else if (currentScreen === 'all-status-screen') loadAllStatus();
    }, 150);

    alert(`✅
