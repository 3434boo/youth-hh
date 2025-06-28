let currentScreen = 'main-screen';
let screenHistory = [];
let selectedFacility = '';
let selectedTime = '';

// ✅ 날짜 자동 초기화 체크
const todayDateStr = new Date().toLocaleDateString('ko-KR');
const lastDate = localStorage.getItem('lastUsedDate');
if (lastDate && lastDate !== todayDateStr) {
  localStorage.removeItem('reservations');
  localStorage.removeItem('existingReservations');
}
localStorage.setItem('lastUsedDate', todayDateStr);

// 🔐 localStorage에서 기존 예약 데이터 불러오기
let reservations = JSON.parse(localStorage.getItem('reservations')) || [];
let existingReservations = JSON.parse(localStorage.getItem('existingReservations')) || {};

function saveToLocalStorage() {
  localStorage.setItem('reservations', JSON.stringify(reservations));
  localStorage.setItem('existingReservations', JSON.stringify(existingReservations));
  localStorage.setItem('lastUsedDate', todayDateStr);
}

function resetReservations() {
  if (confirm("모든 예약 데이터를 초기화하시겠습니까?")) {
    localStorage.removeItem('reservations');
    localStorage.removeItem('existingReservations');
    reservations = [];
    existingReservations = {};
    alert("초기화가 완료되었습니다.");
    location.reload();
  }
}

function showScreen(screenId) {
  document.getElementById(currentScreen).classList.remove('active');
  screenHistory.push(currentScreen);
  currentScreen = screenId;
  document.getElementById(screenId).classList.add('active');
  updateBackButton();

  if (screenId === 'datetime-screen') initializeDateTimeScreen();
  else if (screenId === 'status-screen') loadReservationStatus();
  else if (screenId === 'all-status-screen') loadAllStatus();
}

function goBack() {
  if (screenHistory.length > 0) {
    const previousScreen = screenHistory.pop();
    document.getElementById(currentScreen).classList.remove('active');
    currentScreen = previousScreen;
    document.getElementById(currentScreen).classList.add('active');
    updateBackButton();
  }
}

function updateBackButton() {
  const backBtn = document.querySelector('.back-btn');
  backBtn.style.display = (currentScreen === 'main-screen') ? 'none' : 'flex';
}

function selectFacility(element) {
  document.querySelectorAll('.facility-card').forEach(card => card.classList.remove('selected'));
  element.classList.add('selected');
  selectedFacility = element.querySelector('.facility-name').textContent;
}

function initializeDateTimeScreen() {
  const today = new Date();
  const todayStr = today.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
  });
  document.getElementById('today-date').textContent = todayStr;
  updateTimeSlotAvailability();
}

function updateTimeSlotAvailability() {
  const timeSlots = document.querySelectorAll('.time-slot');
  const facilityReservations = existingReservations[selectedFacility] || [];

  timeSlots.forEach(slot => {
    const timeData = slot.getAttribute('data-time');
    slot.classList.remove('unavailable', 'selected');
    if (facilityReservations.includes(timeData)) {
      slot.classList.add('unavailable');
    }
  });
}

function selectTimeSlot(element) {
  if (element.classList.contains('unavailable')) return;
  document.querySelectorAll('.time-slot').forEach(slot => slot.classList.remove('selected'));
  element.classList.add('selected');
  selectedTime = element.getAttribute('data-time');
}

function completeReservation() {
  const userName = document.getElementById('user-name').value;
  const userBirth = document.getElementById('user-birth').value;
  const userPhone = document.getElementById('user-phone').value;

  if (!userName || !userBirth || !userPhone || !selectedFacility || !selectedTime) {
    alert('모든 정보를 입력해주세요.');
    return;
  }

  const today = new Date().toLocaleDateString('ko-KR');
  const reservation = {
    name: userName,
    birth: userBirth,
    phone: userPhone,
    facility: selectedFacility,
    date: today,
    time: selectedTime,
    id: Date.now()
  };

  reservations.push(reservation);
  if (!existingReservations[selectedFacility]) {
    existingReservations[selectedFacility] = [];
  }
  existingReservations[selectedFacility].push(selectedTime);

  saveToLocalStorage();
  updateSuccessScreen(selectedFacility, today, selectedTime);
  showScreen('success-screen');
}

function updateSuccessScreen(facility, date, time) {
  const successScreen = document.getElementById('success-screen');
  const infoDiv = successScreen.querySelector('div[style*="background:#f8f9fa"]');
  infoDiv.innerHTML = `
    <p><strong>시설:</strong> ${facility}</p>
    <p><strong>날짜:</strong> ${date}</p>
    <p><strong>시간:</strong> ${time}</p>
  `;
}

function loadReservationStatus() {
  const reservationList = document.getElementById('reservation-list');
  if (reservations.length === 0) {
    reservationList.innerHTML = `<div class="no-reservations">📝 아직 예약된 시설이 없습니다.<br>새로운 예약을 만들어보세요!</div>`;
  } else {
    let html = '';
    reservations.forEach(r => {
      html += `<div class="reservation-item">
        <h3>🏢 ${r.facility}</h3>
        <p><strong>👤 예약자:</strong> ${r.name}</p>
        <p><strong>📅 날짜:</strong> ${r.date}</p>
        <p><strong>⏰ 시간:</strong> ${r.time}</p>
        <p><strong>📞 연락처:</strong> ${r.phone}</p>
      </div>`;
    });
    reservationList.innerHTML = html;
  }
}

function loadAllStatus() {
  const today = new Date();
  const todayStr = today.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
  });
  document.getElementById('all-status-date').textContent = todayStr;

  const timetableBody = document.getElementById('timetable-body');
  const timeSlots = ['09:00-10:00','10:00-11:00','11:00-12:00','13:00-14:00','14:00-15:00','15:00-16:00','16:00-17:00','17:00-18:00'];
  const facilities = ['닌텐도실','플레이스테이션','노래방','게임존','댄스연습실','강의실'];
  let html = '';

  timeSlots.forEach(time => {
    html += `<tr><td class="time-cell">${time}</td>`;
    facilities.forEach(fac => {
      const isReserved = existingReservations[fac]?.includes(time);
      const r = reservations.find(r => r.facility === fac && r.time === time);
      html += `<td class="${isReserved ? 'reserved' : 'available'}">${r?.name || (isReserved ? '예약됨' : '-')}</td>`;
    });
    html += `</tr>`;
  });

  timetableBody.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', function () {
  const phoneInput = document.getElementById('user-phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', function (e) {
      let value = e.target.value.replace(/[^0-9]/g, '');
      if (value.length >= 3) {
        if (value.length <= 7) {
          value = value.replace(/(\d{3})(\d{1,4})/, '$1-$2');
        } else {
          value = value.replace(/(\d{3})(\d{4})(\d{1,4})/, '$1-$2-$3');
        }
      }
      e.target.value = value;
    });
  }
});

