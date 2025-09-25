// 화면 상태 관리
let currentScreen = 'main-screen';
let screenHistory = [];

// 예약 관련 전역 변수
let selectedFacility = null;
let selectedFacilityNumber = null;
let selectedTime = null;
let selectedStatusFacility = null;

// ✅ 날짜 자동 초기화 체크
const todayDateStr = new Date().toLocaleDateString('ko-KR');
const lastDate = localStorage.getItem('lastUsedDate');
if (lastDate && lastDate !== todayDateStr) {
  localStorage.removeItem('reservations');
}
localStorage.setItem('lastUsedDate', todayDateStr);

// 🔐 localStorage에서 기존 예약 데이터 불러오기
let reservations = JSON.parse(localStorage.getItem('reservations')) || [];

function saveToLocalStorage() {
  localStorage.setItem('reservations', JSON.stringify(reservations));
  localStorage.setItem('lastUsedDate', todayDateStr);
}

function resetReservations() {
  if (confirm("모든 예약 데이터를 초기화하시겠습니까?")) {
    localStorage.removeItem('reservations');
    reservations = [];
    alert("초기화가 완료되었습니다.");
    location.reload();
  }
}

// 새로운 함수: confirm 없이 바로 초기화 (관리자용)
function resetReservationsDirectly() {
  // 데이터 초기화
  localStorage.removeItem('reservations');
  reservations = [];
  
  alert("✅ 모든 예약이 초기화되었습니다.");
  
  // 현재 화면 즉시 새로고침
  if (currentScreen === 'status-screen') {
    loadReservationStatus();
  } else if (currentScreen === 'all-status-screen') {
    loadAllStatus();
  }
  
  // 추가: 강제로 화면 새로고침을 한번 더 시도
  setTimeout(() => {
    if (currentScreen === 'status-screen') {
      loadReservationStatus();
    } else if (currentScreen === 'all-status-screen') {
      loadAllStatus();
    }
  }, 100);
}

function showScreen(screenId) {
  document.getElementById(currentScreen).classList.remove('active');
  screenHistory.push(currentScreen);
  currentScreen = screenId;
  document.getElementById(screenId).classList.add('active');
  updateBackButton();
  
  if (screenId === "user-info-screen") {
    clearUserInputs();
  } else if (screenId === 'facility-number-screen') { // 새롭게 추가
    initializeFacilityNumberScreen(); // 새롭게 추가
  } else if (screenId === 'datetime-screen') {
    initializeDateTimeScreen();
  } else if (screenId === 'status-screen') {
    // 검색 화면 초기화
    clearSearch();
  } else if (screenId === 'all-status-screen') {
    // 바로 전체 시설 현황 보기
    showAllFacilitiesStatus();
  }
}

function goBack() {
  if (currentScreen === 'all-status-screen') {
    // 시설별 예약 현황 화면에서는 바로 메인으로 돌아가기
    if (screenHistory.length > 0) {
      document.getElementById(currentScreen).classList.remove('active');
      currentScreen = screenHistory.pop();
      document.getElementById(currentScreen).classList.add('active');
      updateBackButton();
    }
    return;
  }
  
  if (screenHistory.length > 0) {
    document.getElementById(currentScreen).classList.remove('active');
    currentScreen = screenHistory.pop();
    document.getElementById(currentScreen).classList.add('active');
    updateBackButton();
  }
}

function updateBackButton() {
  const backBtn = document.querySelector('.back-btn');
  const homeBtn = document.querySelector('.home-btn');
  
  if (currentScreen === 'main-screen') {
    backBtn.style.display = 'none';
    homeBtn.style.display = 'none';
  } else {
    backBtn.style.display = 'flex';
    homeBtn.style.display = 'flex';
  }
}

function selectFacility(element) {
  document.querySelectorAll('.facility-card').forEach(card => card.classList.remove('selected'));
  element.classList.add('selected');
  let name = element.querySelector('.facility-name').textContent.trim();
  // 타임테이블과 동일하게 줄바꿈 포함 이름으로 변환
  const facilityNameMap = {
    '플레이스테이션': '플레이\n스테이션',
    '보드게임': '보드\n게임',
    '댄스연습실': '댄스\n연습실'
  };
  selectedFacility = facilityNameMap[name] || name;
  
  // 모든 시설에서 날짜/시간 선택 화면으로 이동
  showScreen('datetime-screen');
}

// 시설별 번호를 동적으로 생성
function initializeFacilityNumberScreen() {
  const numberGrid = document.querySelector('#facility-number-screen .number-grid');
  numberGrid.innerHTML = ''; // 기존 번호 초기화
  selectedFacilityNumber = ''; // 선택된 번호 초기화

  let numbers = [];
  if (selectedFacility === '닌텐도') {
    numbers = ['1번', '2번', '3번', '4번', '5번', '6번', '7번', '8번', '9번'];
  } else if (selectedFacility === '플레이스테이션' || selectedFacility === '플레이\n스테이션') {
    numbers = ['1번', '2번'];
  } else if (selectedFacility === '노래방') {
    numbers = ['1번', '2번'];
  } else if (selectedFacility === '보드게임' || selectedFacility === '보드\n게임') {
    numbers = ['1번', '2번'];
  }

// Firebase에서 오늘 예약 데이터 가져와서 예약된 번호 확인
  const today = new Date().toISOString().split("T")[0];
  const dbRef = firebase.database().ref("reservations");
  
  dbRef.once("value").then(snapshot => {
    const firebaseReservations = [];
    snapshot.forEach(child => {
      const reservation = child.val();
      if (reservation.date === today && 
          reservation.facility === selectedFacility && 
          reservation.time === selectedTime) {
        firebaseReservations.push(reservation);
      }
    });

    // 예약된 번호 목록
    const reservedNumbers = firebaseReservations.map(r => r.room || r.facilityNumber);
  
  numbers.forEach(num => {
      const numberCard = document.createElement('div');
      numberCard.classList.add('number-card');
      
      // 이미 예약된 번호인지 확인
      const isReserved = reservedNumbers.includes(num);
      if (isReserved) {
        numberCard.classList.add('unavailable');
        // 기존 내용 완전히 제거
        numberCard.textContent = '';
        numberCard.innerHTML = '';
        
        // 직접 스타일 적용
        numberCard.style.background = '#e9ecef';
        numberCard.style.color = '#6c757d';
        numberCard.style.cursor = 'not-allowed';
        numberCard.style.opacity = '0.6';
        numberCard.style.border = '2px solid #dee2e6';
        numberCard.style.position = 'relative';
        
        // 새로운 내용 추가
        if (selectedFacility === '닌텐도' && num === '9번') {
          numberCard.innerHTML = `
            <div>9번</div>
            <div style="font-size:0.9em; color:#ff8c00; margin-top:2px;">배려석</div>
            <div style="color:#6c757d; font-size:0.7em; margin-top:2px; font-weight:normal;">예약불가</div>
          `;
        } else {
          numberCard.innerHTML = `
            <div>${num}</div>
            <div style="color:#6c757d; font-size:0.7em; margin-top:2px; font-weight:normal;">예약불가</div>
          `;
        }
      } else {
        // 예약되지 않은 번호
        if (selectedFacility === '닌텐도' && num === '9번') {
          numberCard.innerHTML = '<div>9번</div><div style="font-size:0.9em; color:#ff8c00; margin-top:2px;">배려석</div>';
        } else {
          numberCard.textContent = num;
        }
        numberCard.setAttribute('onclick', 'selectFacilityNumber(this)');
      }
      
      numberGrid.appendChild(numberCard);
    });
  }).catch(error => {
    console.error('Firebase 데이터 로드 실패:', error);
  });
}

// 전체 시설 현황 보기 함수
function showAllFacilitiesStatus() {
  selectedStatusFacility = ''; // 선택된 시설 초기화
  document.getElementById('status-facility-select-section').classList.remove('active');
  document.getElementById('status-timetable-section').classList.add('active');
  
  // 헤더 업데이트
  document.getElementById('selected-facility-title').textContent = '📊 전체 시설 예약 현황';
  document.getElementById('selected-facility-subtitle').textContent = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
  });
  
  loadAllStatus();
}

// 시설 선택으로 돌아가기 함수
function goBackToFacilitySelect() {
  document.getElementById('status-timetable-section').classList.remove('active');
  document.getElementById('status-facility-select-section').classList.add('active');
  selectedStatusFacility = '';
  
  // 선택된 시설 카드 초기화
  document.querySelectorAll('#status-facility-select-section .facility-card').forEach(card => {
    card.classList.remove('selected');
  });
}

// 시설별 예약 현황 화면에서 시설을 선택하는 함수 (기존 함수 수정)
function selectStatusFacility(element) {
  document.querySelectorAll('#status-facility-select-section .facility-card').forEach(card => card.classList.remove('selected'));
  element.classList.add('selected');
  selectedStatusFacility = element.querySelector('.facility-name').textContent;

  // 시설 선택 섹션 숨기고, 타임테이블 섹션 표시
  document.getElementById('status-facility-select-section').classList.remove('active');
  document.getElementById('status-timetable-section').classList.add('active');

  // 헤더 업데이트
  document.getElementById('selected-facility-title').textContent = `📅 ${selectedStatusFacility} 예약 현황`;
  document.getElementById('selected-facility-subtitle').textContent = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
  });

  loadAllStatus(); // 선택된 시설로 예약 현황을 다시 로드
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
  const today = new Date().toISOString().split("T")[0];

  // Firebase에서 오늘 예약 데이터 가져오기
  const dbRef = firebase.database().ref("reservations");
  
  dbRef.once("value").then(snapshot => {
    const firebaseReservations = [];
    snapshot.forEach(child => {
      const reservation = child.val();
      if (reservation.date === today) {
        firebaseReservations.push(reservation);
      }
    });

  timeSlots.forEach(slot => {
      const timeData = slot.getAttribute('data-time');
      slot.classList.remove('unavailable', 'selected');
      
      // 현재 선택된 시설의 모든 방 번호 확인
      let isTimeSlotUnavailable = false;
      
      if (selectedFacility === '댄스\n연습실' || selectedFacility === '강의실') {
        // 번호가 없는 시설: 시설 + 시간만 확인
        const isReserved = firebaseReservations.some(r => 
          r.facility === selectedFacility && 
          r.date === today && 
          r.time === timeData
        );
        if (isReserved) {
          isTimeSlotUnavailable = true;
        }
      } else {
        // 번호가 있는 시설: 모든 방 번호가 예약되었는지 확인
        const facilityNumbers = getFacilityNumbers(selectedFacility);
        const allNumbersReserved = facilityNumbers.every(num => {
          return firebaseReservations.some(r => 
            r.facility === selectedFacility && 
            (r.room === num || r.facilityNumber === num) && 
            r.date === today && 
            r.time === timeData
          );
        });
        
        if (allNumbersReserved) {
          isTimeSlotUnavailable = true;
        }
      }
      
      if (isTimeSlotUnavailable) {
        slot.classList.add('unavailable');
      }
    });
  }).catch(error => {
    console.error('Firebase 데이터 로드 실패:', error);
  });
}

// 시설별 방 번호를 반환하는 헬퍼 함수
function getFacilityNumbers(facility) {
  if (facility === '닌텐도') {
    return ['1번', '2번', '3번', '4번', '5번', '6번', '7번', '8번', '9번'];
  } else if (facility === '플레이\n스테이션') {
    return ['1번', '2번'];
  } else if (facility === '노래방') {
    return ['1번', '2번'];
  } else if (facility === '보드\n게임') {
    return ['1번', '2번'];
  }
  return [];
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

  console.log('예약 정보:', { userName, userBirth, userPhone, selectedFacility, selectedFacilityNumber, selectedTime });

  // 댄스연습실과 강의실은 번호가 없으므로 검증 조건 수정
  const hasRequiredInfo = userName && userBirth && userPhone && selectedFacility && selectedTime;
  const hasFacilityNumber = selectedFacilityNumber || (selectedFacility === '댄스연습실' || selectedFacility === '댄스\n연습실' || selectedFacility === '강의실');
  console.log('검증 결과:', { hasRequiredInfo, hasFacilityNumber });
  
  if (!hasRequiredInfo || !hasFacilityNumber) {
    alert('모든 정보를 입력해주세요.');
    return;
  }

  const today = new Date().toLocaleDateString('ko-KR');
  const reservation = {
    name: userName,
    birth: userBirth,
    phone: userPhone,
    facility: selectedFacility,
    facilityNumber: selectedFacilityNumber,
    date: today,
    time: selectedTime,
    id: Date.now()
  };

  console.log('예약 객체:', reservation);

  reservations.push(reservation);
  
  // existingReservations 사용 제거 - 각 예약이 독립적으로 관리됨
  saveToLocalStorage();
  console.log('success-screen으로 이동 시도');
  updateSuccessScreen(selectedFacility, today, selectedTime);
  showScreen('success-screen');
  console.log('success-screen 이동 완료');
}

function updateSuccessScreen(facility, date, time) {
  console.log('updateSuccessScreen 호출:', { facility, date, time, selectedFacilityNumber });
  
  const successScreen = document.getElementById('success-screen');
  console.log('success-screen 요소:', successScreen);
  
  const infoDiv = successScreen.querySelector('div[style*="background:#f8f9fa"]');
  console.log('infoDiv 요소:', infoDiv);
  
  // 댄스연습실과 강의실은 번호가 없으므로 표시 방식 수정
  const facilityDisplay = selectedFacilityNumber ? `${facility} ${selectedFacilityNumber}` : facility;
  console.log('facilityDisplay:', facilityDisplay);
  
  infoDiv.innerHTML = `
    <p><strong>시설:</strong> ${facilityDisplay}</p>
    <p><strong>날짜:</strong> ${date}</p>
    <p><strong>시간:</strong> ${time}</p>
  `;
  
  console.log('updateSuccessScreen 완료');
}

function loadReservationStatus() {
  const reservationList = document.getElementById('reservation-list');
  
  // 강제로 HTML 초기화
  reservationList.innerHTML = '<div style="text-align:center; padding:20px;">로딩 중...</div>';
  
  // Firebase에서 오늘 예약 데이터 가져오기
  const today = new Date().toISOString().split("T")[0];
  const dbRef = firebase.database().ref("reservations");
  
  dbRef.once("value").then(snapshot => {
    const firebaseReservations = [];
    snapshot.forEach(child => {
      const reservation = child.val();
      console.log('개별 현황 Firebase 데이터:', reservation); // 디버깅용
      if (reservation.date === today) {
        firebaseReservations.push(reservation);
      }
    });
    
    console.log('오늘 개별 현황 Firebase 예약:', firebaseReservations); // 디버깅용
    
    if (firebaseReservations.length === 0) {
      reservationList.innerHTML = `<div class="no-reservations">📝 아직 예약된 시설이 없습니다.<br>새로운 예약을 만들어보세요!</div>`;
    } else {
      let html = '';
      firebaseReservations.forEach(r => {
        // Firebase와 로컬스토리지 필드명 모두 확인
        const roomNumber = r.room || r.facilityNumber || '';
        html += `<div class="reservation-item">
          <h3>🏢 ${r.facility} ${roomNumber}</h3>
          <p><strong>👤 예약자:</strong> ${r.name}</p>
          <p><strong>📅 날짜:</strong> ${r.date}</p>
          <p><strong>⏰ 시간:</strong> ${r.time}</p>
          <p><strong>📞 연락처:</strong> ${r.phone}</p>
        </div>`;
      });
      reservationList.innerHTML = html;
    }
  }).catch(error => {
    console.error('Firebase 데이터 로드 실패:', error);
    reservationList.innerHTML = '<div style="text-align:center; padding:20px; color:red;">데이터 로드 실패</div>';
  });
}

function loadAllStatus() {
  const statusGrid = document.querySelector('#status-timetable-section .status-grid');
  statusGrid.innerHTML = '<div style="text-align:center; padding:20px;">로딩 중...</div>';

  // Firebase에서 오늘 예약 데이터 가져오기
  const today = new Date().toISOString().split("T")[0];
  const dbRef = firebase.database().ref("reservations");
  
  dbRef.once("value").then(snapshot => {
    const firebaseReservations = [];
    snapshot.forEach(child => {
      const reservation = child.val();
      console.log('Firebase 예약 데이터:', reservation); // 디버깅용
      if (reservation.date === today) {
        firebaseReservations.push(reservation);
      }
    });

  // 오늘 날짜 가져오기
    const todayFormatted = new Date().toLocaleDateString('ko-KR');
    
    // 시간 슬롯 정의 (09:00~20:00)
    const timeSlots = [
      '09:00~10:00', '10:00~11:00', '11:00~12:00', 
      '13:00~14:00', '14:00~15:00', '15:00~16:00', 
      '16:00~17:00', '17:00~18:00', '18:00~19:00', '19:00~20:00'
    ];

  // 모든 시설 정의
    const allFacilities = [
      { name: '닌텐도', numbers: ['1번', '2번', '3번', '4번', '5번', '6번', '7번', '8번', '9번'] },
      { name: '플레이\n스테이션', numbers: ['1번', '2번'] },
      { name: '노래방', numbers: ['1번', '2번'] },
      { name: '보드\n게임', numbers: ['1번', '2번'] },
      { name: '댄스\n연습실', numbers: [] },
      { name: '강의실', numbers: [] }
    ];

  // 선택된 시설이 있으면 해당 시설만 필터링
    const facilitiesToShow = selectedStatusFacility 
      ? allFacilities.filter(f => f.name === selectedStatusFacility)
      : allFacilities;

  // 타임테이블 생성
    let html = `<div class="status-table-container">`;
    html += `<table class="status-table">`;
    
    // 헤더 생성
    html += `<thead><tr><th>시간</th>`;
    facilitiesToShow.forEach(facility => {
      html += `<th>${facility.name}</th>`;
    });
    html += `</tr></thead>`;
    
    // 본문 생성
    html += `<tbody>`;
    timeSlots.forEach(timeSlot => {
      html += `<tr><td>${timeSlot}</td>`;
      
      facilitiesToShow.forEach(facility => {
        if (facility.numbers.length > 0) {
          // 번호가 있는 시설 (닌텐도, 플레이스테이션, 노래방, 보드게임)
          const reservedNumbers = [];
          facility.numbers.forEach(num => {
            // Firebase와 로컬스토리지 필드명 모두 확인
            const isReserved = firebaseReservations.some(r => 
              r.facility === facility.name && 
              (r.room === num || r.facilityNumber === num) && // 둘 다 확인
              r.date === today && 
              r.time === timeSlot
            );
            if (isReserved) {
              // 번호만 추출 (예: "1번" -> "1")
              const numberOnly = num.replace('번', '');
              reservedNumbers.push(numberOnly);
            }
          });
          
          if (reservedNumbers.length > 0) {
            const numberElements = reservedNumbers.map(num => 
              `<span class="reserved-number">${num}</span>`
            ).join('');
            html += `<td class="reserved">${numberElements}</td>`;
          } else {
            html += `<td></td>`;
          }
        } else {
          // 번호가 없는 시설 (댄스연습실, 강의실)
          const isReserved = firebaseReservations.some(r => 
            r.facility === facility.name && 
            r.date === today && 
            r.time === timeSlot
          );
          
          if (isReserved) {
            html += `<td class="reserved"><span class="reserved-number">예약</span></td>`;
          } else {
            html += `<td></td>`;
          }
        }
      });
      html += `</tr>`;
    });
    html += `</tbody></table></div>`;

    statusGrid.innerHTML = html;
  }).catch(error => {
    console.error('Firebase 데이터 로드 실패:', error);
    statusGrid.innerHTML = '<div style="text-align:center; padding:20px; color:red;">데이터 로드 실패</div>';
  });
}

function goToMainAndClear() {
  clearUserInputs();
  showScreen("main-screen");
}

function clearUserInputs() {
  document.getElementById("user-name").value = "";
  document.getElementById("user-birth").value = "";
  document.getElementById("user-phone").value = "";
  selectedFacility = "";
  selectedFacilityNumber = "";
  selectedTime = "";

  // 선택된 시설 카드 초기화
  document.querySelectorAll(".facility-card").forEach((card) => {
    card.classList.remove("selected");
  });

  // 선택된 시간 슬롯 초기화
  document.querySelectorAll(".time-slot").forEach((slot) => {
    slot.classList.remove("selected");
  });
}

// 기본 비밀번호: 123456 (localStorage에 저장됨)
const defaultPassword = "123456";
if (!localStorage.getItem("adminPassword")) {
  localStorage.setItem("adminPassword", defaultPassword);
}

function showAdminModal() {
  document.getElementById("admin-modal").style.display = "block";
  document.getElementById("admin-password").value = "";
  document.getElementById("admin-password").focus();
}

function hideAdminModal() {
  document.getElementById("admin-modal").style.display = "none";
  document.getElementById("admin-password").value = "";
}

function verifyAdminPassword() {
  const input = document.getElementById("admin-password").value;
  const saved = localStorage.getItem("adminPassword");

  if (input === saved) {
    hideAdminModal();
    // confirm 없이 바로 초기화 실행
    resetReservationsDirectly();
  } else {
    alert("❌ 비밀번호가 틀렸습니다.");
    document.getElementById("admin-password").value = "";
    document.getElementById("admin-password").focus();
  }
}

function changeAdminPasswordPrompt() {
  const current = prompt("현재 비밀번호를 입력하세요:");
  if (current !== localStorage.getItem("adminPassword")) {
    alert("현재 비밀번호가 일치하지 않습니다.");
    return;
  }
  const newPass = prompt("새 비밀번호(6자리 숫자):");
  if (/^\d{6}$/.test(newPass)) {
    localStorage.setItem("adminPassword", newPass);
    alert("비밀번호가 변경되었습니다.");
    hideAdminModal();
  } else {
    alert("비밀번호는 숫자 6자리여야 합니다.");
  }
}

document.addEventListener('DOMContentLoaded', function () {
  // 예약 화면의 전화번호 입력 필드
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

  // 검색 화면의 전화번호 입력 필드
  const searchPhoneInput = document.getElementById('search-phone');
  if (searchPhoneInput) {
    searchPhoneInput.addEventListener('input', function (e) {
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

  // 관리자 비밀번호 입력에서 엔터키 처리
  const adminPasswordInput = document.getElementById('admin-password');
  if (adminPasswordInput) {
    adminPasswordInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        verifyAdminPassword();
      }
    });
  }
  
  // 모달 외부 클릭시 닫기
  document.addEventListener('click', function(e) {
    const modal = document.getElementById('admin-modal');
    const resetBtn = document.querySelector('.btn-reset');
    
    if (modal && modal.style.display === 'block' && 
        !modal.contains(e.target) && 
        e.target !== resetBtn) {
      hideAdminModal();
    }
  });
});

function downloadAsCSV() {
  if (reservations.length === 0) {
    alert("다운로드할 예약 데이터가 없습니다.");
    return;
  }
  
  const headers = ['이름', '생년월일', '전화번호', '시설', '시설 번호', '날짜', '시간', '예약ID'];
  
   const csvData = reservations.map(r => [
    r.name,
    r.birth,
    r.phone,
    r.facility,
    r.facilityNumber, 
    r.date,
    r.time,
    r.id
  ]);
  
  const csvContent = [headers, ...csvData]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
  
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
   const today = new Date().toLocaleDateString('ko-KR').replace(/\./g, '').replace(/\s/g, '');
  downloadFile(blob, `예약현황_${today}.csv`);
}

function downloadAsExcel() {
  if (reservations.length === 0) {
    alert("다운로드할 예약 데이터가 없습니다.");
    return;
  }
  
    let htmlTable = `
    <table border="1">
      <thead>
        <tr>
          <th>이름</th>
          <th>생년월일</th>
          <th>전화번호</th>
          <th>시설</th>
          <th>시설 번호</th>
          <th>날짜</th>
          <th>시간</th>
          <th>예약ID</th>
        </tr>
      </thead>
      <tbody>
  `;
  
    reservations.forEach(r => {
    htmlTable += `
      <tr>
        <td>${r.name}</td>
        <td>${r.birth}</td>
        <td>${r.phone}</td>
        <td>${r.facility}</td>
        <td>${r.facilityNumber}</td>
        <td>${r.date}</td>
        <td>${r.time}</td>
        <td>${r.id}</td>
      </tr>
    `;
  });

  htmlTable += `
      </tbody>
    </table>
  `;
  
    const blob = new Blob([htmlTable], { 
    type: 'application/vnd.ms-excel;charset=utf-8;' 
  });
  
  const today = new Date().toLocaleDateString('ko-KR').replace(/\./g, '').replace(/\s/g, '');
  downloadFile(blob, `예약현황_${today}.xls`);
}

function downloadAsText() {
  if (reservations.length === 0) {
    alert("다운로드할 예약 데이터가 없습니다.");
    return;
  }

  const today = new Date().toLocaleDateString('ko-KR');
  let textContent = `=== 흥덕청소년문화의집 예약 현황 ===\n`;
  textContent += `다운로드 일시: ${today}\n`;
  textContent += `총 예약 수: ${reservations.length}건\n\n`;

  reservations.forEach((r, index) => {
    textContent += `[${index + 1}] 예약 정보\n`;
    textContent += `  - 이름: ${r.name}\n`;
    textContent += `  - 생년월일: ${r.birth}\n`;
    textContent += `  - 전화번호: ${r.phone}\n`;
    textContent += `  - 시설: ${r.facility}\n`;
    textContent += `  - 날짜: ${r.date}\n`;
    textContent += `  - 시간: ${r.time}\n`;
    textContent += `  - 예약ID: ${r.id}\n\n`;
  });

  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
  const todayStr = new Date().toLocaleDateString('ko-KR').replace(/\./g, '').replace(/\s/g, '');
  downloadFile(blob, `예약현황_${todayStr}.txt`);
}

function downloadAsJSON() {
  if (reservations.length === 0) {
    alert("다운로드할 예약 데이터가 없습니다.");
    return;
  }

  const exportData = {
    exportDate: new Date().toISOString(),
    totalReservations: reservations.length,
    reservations: reservations
  };

  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  
  const today = new Date().toLocaleDateString('ko-KR').replace(/\./g, '').replace(/\s/g, '');
  downloadFile(blob, `예약데이터_${today}.json`);
}

function downloadTableAsImage() {
    downloadAllStatusAsHTML();
}

function downloadAllStatusAsHTML() {
  const today = new Date();
  const todayStr = today.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
  });

  const timeSlots = ['09:00-10:00','10:00-11:00','11:00-12:00','13:00-14:00','14:00-15:00','15:00-16:00','16:00-17:00','17:00-18:00','18:00-19:00','19:00-20:00'];
  const facilities = ['닌텐도','플레이스테이션','노래방','보드게임','댄스연습실','강의실'];

  let htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>예약 현황 - ${todayStr}</title>
    <style>
        body { font-family: 'Apple SD Gothic Neo', sans-serif; margin: 20px; }
        h1 { text-align: center; color: #333; }
        .date { text-align: center; margin-bottom: 20px; font-size: 1.2em; color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: center; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .reserved { background-color: #ffebee; color: #c62828; font-weight: bold; }
        .available { background-color: #f8f9fa; color: #999; }
        .time-cell { background-color: #e3f2fd; font-weight: bold; }
    </style>
</head>
<body>
    <h1>🏠 흥덕청소년문화의집 예약 현황</h1>
    <div class="date">${todayStr}</div>
    <table>
        <thead>
            <tr>
                <th>시간</th>
                <th>닌텐도</th>
                <th>플레이스테이션</th>
                <th>노래방</th>
                <th>보드게임</th>
                <th>댄스연습실</th>
                <th>강의실</th>
            </tr>
        </thead>
        <tbody>
  `;

  timeSlots.forEach(time => {
    htmlContent += `<tr><td class="time-cell">${time}</td>`;
    facilities.forEach(fac => {
      const isReserved = reservations.some(r => r.facility === fac && r.time === time);
      const r = reservations.find(r => r.facility === fac && r.time === time);
      const cellClass = isReserved ? 'reserved' : 'available';
      const cellContent = r?.name || (isReserved ? '예약됨' : '-');
      htmlContent += `<td class="${cellClass}">${cellContent}</td>`;
    });
    htmlContent += `</tr>`;
  });

  htmlContent += `
        </tbody>
    </table>
    <div style="margin-top: 30px; text-align: center; color: #666; font-size: 0.9em;">
        다운로드 일시: ${new Date().toLocaleString('ko-KR')}
    </div>
</body>
</html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const todayFileName = today.toLocaleDateString('ko-KR').replace(/\./g, '').replace(/\s/g, '');
  downloadFile(blob, `전체예약현황_${todayFileName}.html`);
}

function downloadFile(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

function showDownloadModal() {
  if (reservations.length === 0) {
    alert("다운로드할 예약 데이터가 없습니다.");
    return;
  }
  document.getElementById('download-modal').style.display = 'block';
}

function hideDownloadModal() {
  document.getElementById('download-modal').style.display = 'none';
}

function setupDownloadModalEvents() {
  document.addEventListener('click', function(e) {
    const modal = document.getElementById('download-modal');
    const downloadBtn = document.querySelector('.btn-download');
    
    if (modal && modal.style.display === 'block' && 
        !modal.contains(e.target) && 
        e.target !== downloadBtn) {
      hideDownloadModal();
    }
  });
}

function selectFacilityNumber(element) {
  // 예약된 번호는 선택할 수 없음
  if (element.classList.contains('unavailable')) {
    return;
  }
  
  document.querySelectorAll('.number-card').forEach(card => card.classList.remove('selected'));
  element.classList.add('selected');
  selectedFacilityNumber = element.textContent;
}

// 예약 검색 함수
function searchReservations() {
  const searchName = document.getElementById('search-name').value.trim();
  const searchBirth = document.getElementById('search-birth').value;
  const searchPhone = document.getElementById('search-phone').value.trim();
  
  // 최소한 하나의 검색 조건이 필요
  if (!searchName && !searchBirth && !searchPhone) {
    alert('검색할 정보를 하나 이상 입력해주세요.');
    return;
  }
  
  // 검색 조건에 맞는 예약 필터링
  const filteredReservations = reservations.filter(r => {
    const nameMatch = !searchName || r.name.toLowerCase().includes(searchName.toLowerCase());
    const birthMatch = !searchBirth || r.birth === searchBirth;
    const phoneMatch = !searchPhone || r.phone.includes(searchPhone);
    
    return nameMatch && birthMatch && phoneMatch;
  });
  
  // 검색 결과 표시
  displaySearchResults(filteredReservations);
}

// 검색 결과 표시 함수
function displaySearchResults(results) {
  const searchResults = document.getElementById('search-results');
  const reservationList = document.getElementById('reservation-list');
  
  if (results.length === 0) {
    reservationList.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666;">
        <div style="font-size: 3em; margin-bottom: 20px;">🔍</div>
        <h3>검색 결과가 없습니다</h3>
        <p>입력하신 정보와 일치하는 예약을 찾을 수 없습니다.</p>
        <p>검색 조건을 다시 확인해주세요.</p>
      </div>
    `;
  } else {
    let html = `<div style="margin-bottom: 20px; text-align: center; color: #333;">
      <strong>총 ${results.length}개의 예약을 찾았습니다.</strong>
    </div>`;
    
    results.forEach(r => {
      const facilityDisplay = r.facilityNumber ? `${r.facility} ${r.facilityNumber}` : r.facility;
      html += `<div class="reservation-item" style="background: white; padding: 20px; border-radius: 15px; margin-bottom: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h3 style="color: #ff8c00; margin-bottom: 15px;">🏢 ${facilityDisplay}</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
          <div><strong>👤 예약자:</strong> ${r.name}</div>
          <div><strong>📅 날짜:</strong> ${r.date}</div>
          <div><strong>⏰ 시간:</strong> ${r.time}</div>
          <div><strong>📞 연락처:</strong> ${r.phone}</div>
        </div>
        <div style="text-align: right;">
          <button class="btn btn-secondary" onclick="deleteReservation(${r.id})" style="padding: 5px 10px; font-size: 0.8em;">🗑️ 삭제</button>
        </div>
      </div>`;
    });
    
    reservationList.innerHTML = html;
  }
  
  searchResults.style.display = 'block';
}

// 검색 초기화 함수
function clearSearch() {
  document.getElementById('search-name').value = '';
  document.getElementById('search-birth').value = '';
  document.getElementById('search-phone').value = '';
  document.getElementById('search-results').style.display = 'none';
}

// 예약 삭제 함수
function deleteReservation(reservationId) {
  if (confirm('이 예약을 삭제하시겠습니까?')) {
    const index = reservations.findIndex(r => r.id === reservationId);
    if (index !== -1) {
      reservations.splice(index, 1);
      saveToLocalStorage();
      
      // 현재 검색 결과 다시 표시
      searchReservations();
      
      alert('예약이 삭제되었습니다.');
    }
  }
}

// 사용자 정보 검증 함수
function validateUserInfo() {
  const userName = document.getElementById('user-name').value.trim();
  const userBirth = document.getElementById('user-birth').value;
  const userPhone = document.getElementById('user-phone').value.trim();
  
  // 각 필드별 검증
  if (!userName) {
    alert('이름을 입력해주세요.');
    document.getElementById('user-name').focus();
    return;
  }
  
  if (!userBirth) {
    alert('생년월일을 선택해주세요.');
    document.getElementById('user-birth').focus();
    return;
  }
  
  if (!userPhone) {
    alert('전화번호를 입력해주세요.');
    document.getElementById('user-phone').focus();
    return;
  }
  
  // 전화번호 형식 검증 (숫자 9~11자리)
  const phoneDigits = userPhone.replace(/[^0-9]/g, "");
if (phoneDigits.length < 9 || phoneDigits.length > 11) {
  alert('전화번호는 9~11자리 숫자여야 합니다. (집전화 or 휴대전화 등)');
  document.getElementById('user-phone').focus();
  return;
}
  
  // 모든 검증을 통과하면 다음 화면으로 이동
  showUserInfoConfirmScreen();
}

function showUserInfoConfirmScreen() {
  // 입력값 가져오기
  const userName = document.getElementById('user-name').value.trim();
  const userBirth = document.getElementById('user-birth').value;
  const userPhone = document.getElementById('user-phone').value.trim();

  // 정보 표시
  document.getElementById('confirm-info-box').innerHTML = `
    <p><strong>이름:</strong> ${userName}</p>
    <p><strong>생년월일:</strong> ${userBirth}</p>
    <p><strong>전화번호:</strong> ${userPhone}</p>
  `;
  showScreen('user-info-confirm-screen');
}

function goToFacilityScreen() {
  showScreen('facility-screen');
}

function goBackToUserInfo() {
  showScreen('user-info-screen');
}

// === Firebase 연동 예약 함수 (app.js에서 통합) ===
function completeReservationFirebase() {
  const name = document.getElementById("user-name").value;
  const birth = document.getElementById("user-birth").value;
  const phone = document.getElementById("user-phone").value;
  const facility = selectedFacility;
  const room = selectedFacilityNumber; // script.js에서는 selectedFacilityNumber 사용
  const time = selectedTime;
  const today = new Date().toISOString().split("T")[0];

  const newReservation = {
    name,
    birth,
    phone,
    facility,
    room,
    time,
    date: today
  };

  const dbRef = firebase.database().ref("reservations");
  const newKey = dbRef.push().key;

  dbRef.child(newKey).set(newReservation).then(() => {
    showScreen('success-screen'); // 예약 완료 화면으로 이동
  });
}

// === Firebase 연동 예약 검색 함수 (app.js에서 통합) ===
function searchReservationsFirebase() {
  const searchName = document.getElementById("search-name").value;
  const searchBirth = document.getElementById("search-birth").value;
  const searchPhone = document.getElementById("search-phone").value;

  const dbRef = firebase.database().ref("reservations");
  dbRef.once("value").then(snapshot => {
    const results = [];
    snapshot.forEach(child => {
      const r = child.val();
      if (r.name === searchName && r.birth === searchBirth && r.phone === searchPhone) {
        results.push(r);
      }
    });

    const resultContainer = document.getElementById("reservation-list");
    resultContainer.innerHTML = results.length === 0
      ? '<div class="no-reservations">예약 내역이 없습니다.</div>'
      : results.map(r =>
          `<div class="reservation-item">
             <strong>${r.date}</strong><br>
             ${r.facility} ${r.room || ''}<br>
             ${r.time}
           </div>`).join('');
    document.getElementById("search-results").style.display = "block";
  });
}

function proceedAfterDateTime() {
  // 시간이 선택되었는지 확인
  if (!selectedTime) {
    alert('시간을 선택해주세요.');
    return;
  }
  
  // 댄스연습실과 강의실은 번호가 없으므로 바로 예약 완료
  if (selectedFacility === '댄스\n연습실' || selectedFacility === '강의실') {
    selectedFacilityNumber = ''; // 번호 없음
    completeReservationFirebase();
  } else {
    // 번호가 있는 시설은 번호 선택 화면으로 이동
    showScreen('facility-number-screen');
  }
}

function proceedAfterFacilityNumber() {
  // 번호가 선택되었는지 확인
  if (!selectedFacilityNumber) {
    alert('이용 공간을 선택해주세요.');
    return;
  }
  
  // 예약 완료
  completeReservationFirebase();
}

