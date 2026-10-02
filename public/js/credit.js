document.addEventListener("DOMContentLoaded", () => {

  loadCreditPage();

  const topupForm = document.getElementById("topupForm");

  if (topupForm) {
    topupForm.addEventListener("submit", submitTopup);
  }

  const logoutButton = document.getElementById("logoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", logout);
  }

});


async function loadCreditPage() {

  try {

    const response = await fetch("/api/auth/me");

    const data = await response.json();

    if (!data.success || !data.user) {
      window.location.href = "/";
      return;
    }

    const user = data.user;


    // ถ้าเป็น Admin ให้ไปหน้า Admin
    if (user.role === "admin") {
      window.location.href = "/admin.html";
      return;
    }


    // แสดงชื่อ
    const username = document.getElementById("username");

    if (username) {
      username.textContent = user.username;
    }


    // แสดงเครดิต
    const credit = Number(user.credit || 0);

    const currentCredit =
      document.getElementById("currentCredit");

    const headerCredit =
      document.getElementById("headerCredit");


    if (currentCredit) {
      currentCredit.textContent =
        "฿" + credit.toFixed(2);
    }


    if (headerCredit) {
      headerCredit.textContent =
        credit.toFixed(2);
    }


    // โหลดประวัติเติมเครดิต
    await loadTopupHistory();


  } catch (error) {

    console.error("LOAD CREDIT ERROR:", error);

    window.location.href = "/";

  }

}



async function loadTopupHistory() {

  const history =
    document.getElementById("topupHistory");

  if (!history) return;


  try {

    const response =
      await fetch("/api/topups");

    const data =
      await response.json();


    if (!response.ok || !data.success) {

      history.innerHTML = `
        <div class="empty-history">
          ไม่สามารถโหลดประวัติได้
        </div>
      `;

      return;
    }


    if (!data.topups || data.topups.length === 0) {

      history.innerHTML = `
        <div class="empty-history">
          ยังไม่มีประวัติเติมเครดิต
        </div>
      `;

      return;
    }


    history.innerHTML =
      data.topups.map(item => {

        let statusText = "รอตรวจสอบ";
        let statusClass = "pending";


        if (item.status === "approved") {

          statusText = "อนุมัติแล้ว";
          statusClass = "approved";

        }


        if (item.status === "rejected") {

          statusText = "ไม่อนุมัติ";
          statusClass = "rejected";

        }


        return `
          <div class="topup-item">

            <div class="topup-info">

              <strong>
                ฿${Number(item.amount).toFixed(2)}
              </strong>

              <span>
                ${formatDate(item.created_at)}
              </span>

            </div>


            <div class="topup-right">

              <span class="topup-status ${statusClass}">
                ${statusText}
              </span>

              ${
                item.reference
                  ? `<small>${escapeHtml(item.reference)}</small>`
                  : ""
              }

            </div>

          </div>
        `;

      }).join("");


  } catch (error) {

    console.error(
      "LOAD TOPUP HISTORY ERROR:",
      error
    );

    history.innerHTML = `
      <div class="empty-history">
        เกิดข้อผิดพลาดในการโหลดข้อมูล
      </div>
    `;

  }

}



async function submitTopup(event) {

  event.preventDefault();


  const amountInput =
    document.getElementById("topupAmount");

  const referenceInput =
    document.getElementById("topupReference");

  const button =
    document.getElementById("topupButton");

  const message =
    document.getElementById("topupMessage");


  const amount =
    Number(amountInput.value);

  const reference =
    referenceInput.value.trim();


  // ตรวจจำนวนเงิน
  if (!amount || amount <= 0) {

    showMessage(
      message,
      "กรุณาใส่จำนวนเงินให้ถูกต้อง",
      "error"
    );

    return;
  }


  // จำกัดจำนวนสูงสุด
  if (amount > 100000) {

    showMessage(
      message,
      "จำนวนเงินสูงสุดคือ 100,000 บาท",
      "error"
    );

    return;
  }


  button.disabled = true;

  button.textContent =
    "กำลังส่งคำขอ...";


  try {

    const response =
      await fetch("/api/topups", {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          amount,
          reference
        })

      });


    const data =
      await response.json();


    if (!response.ok || !data.success) {

      showMessage(
        message,
        data.message ||
          "ไม่สามารถส่งคำขอได้",
        "error"
      );

      return;
    }


    // สำเร็จ
    showMessage(
      message,
      "ส่งคำขอเติมเครดิตแล้ว รอ Admin อนุมัติ",
      "success"
    );


    // ล้างช่อง
    amountInput.value = "";
    referenceInput.value = "";


    // โหลดประวัติใหม่
    await loadTopupHistory();


  } catch (error) {

    console.error(
      "TOPUP ERROR:",
      error
    );

    showMessage(
      message,
      "เกิดข้อผิดพลาด กรุณาลองใหม่",
      "error"
    );

  } finally {

    button.disabled = false;

    button.textContent =
      "ส่งคำขอเติมเครดิต";

  }

}



async function logout() {

  try {

    await fetch(
      "/api/auth/logout",
      {
        method: "POST"
      }
    );

  } catch (error) {

    console.error(error);

  }


  window.location.href = "/";

}



function showMessage(
  element,
  text,
  type
) {

  if (!element) return;

  element.textContent = text;

  element.className =
    "form-message " + type;

}



function formatDate(dateString) {

  if (!dateString) {
    return "-";
  }


  const date =
    new Date(dateString);


  if (Number.isNaN(date.getTime())) {
    return dateString;
  }


  return date.toLocaleString(
    "th-TH",
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  );

}



function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}