/* ==========================================================================
   khach-hang/thanh-toan.js
   Nạp lịch sử thanh toán thật của dự án từ API, dựng bảng + card tổng
   quan động (thay cho dữ liệu mẫu hard-code trước đây).

   Nút "Thanh toán ngay": mở modal xác nhận (số tiền + phương thức) -> mô
   phỏng xử lý -> cập nhật giao diện -> toast. Chưa nối cổng thanh toán
   thật (VNPay/Momo) — xem TODO trong processPayment(). Việc admin xác
   nhận đã nhận tiền dùng PMAPI.quanTri.xacNhanThanhToan() ở phía quản trị.
   Phụ thuộc: api.js (PMAPI), ui.js (PMUI), auth-guard.js phải được nạp trước.
   ========================================================================== */

(function () {
  let duAnHienTaiId = null;

  document.addEventListener('pm:auth-ready', (event) => {
    const user = event.detail.user;
    const sidebarName = document.getElementById('sidebar-customer-name');
    if (sidebarName) sidebarName.textContent = user.ten_doanh_nghiep || user.ho_ten;

    taiDuAnVaThanhToan();
  });

  function taiDuAnVaThanhToan() {
    PMAPI.khachHang.layDuAn()
      .then((data) => {
        const duAn = data.du_an || [];
        const duAnChinh = duAn.find((p) => p.trang_thai === 'dang_thuc_hien') || duAn[0];

        if (!duAnChinh) {
          setText('payment-subtitle', 'Bạn chưa có dự án nào.');
          renderPaymentHistory([]);
          return;
        }

        duAnHienTaiId = duAnChinh.id;
        setText('payment-subtitle', duAnChinh.ten_du_an);
        return PMAPI.khachHang.layThanhToan(duAnChinh.id).then((paymentData) => {
          const cacDot = (paymentData.thanh_toan || []).slice().sort((a, b) => a.dot_so - b.dot_so);
          renderSummary(cacDot);
          renderPaymentHistory(cacDot);
        });
      })
      .catch((err) => {
        PMUI.toast(err.message, 'error');
      });
  }

  function renderSummary(cacDot) {
    const tongTien = cacDot.reduce((sum, d) => sum + Number(d.so_tien), 0);
    const daThanhToan = cacDot.filter((d) => d.trang_thai === 'da_thanh_toan');
    const conLai = cacDot.filter((d) => d.trang_thai !== 'da_thanh_toan');
    const tongDaThanhToan = daThanhToan.reduce((sum, d) => sum + Number(d.so_tien), 0);
    const tongConLai = tongTien - tongDaThanhToan;

    setText('paid-amount', formatTien(tongDaThanhToan));
    setText('paid-note', daThanhToan.length + '/' + cacDot.length + ' đợt đã thanh toán');
    setText('remaining-amount', formatTien(tongConLai));

    const pendingPanel = document.getElementById('pending-payment-panel');
    const dotChoThanhToan = conLai[0];

    if (dotChoThanhToan) {
      setText('remaining-note', 'Đợt ' + dotChoThanhToan.dot_so + ' chưa thanh toán');
      setText('pending-payment-title', 'Đợt ' + dotChoThanhToan.dot_so + ' — Còn ' + formatTien(dotChoThanhToan.so_tien));
      if (pendingPanel) pendingPanel.style.display = '';

      const payBtn = document.getElementById('pay-now-btn');
      if (payBtn) {
        payBtn.dataset.paymentId = dotChoThanhToan.id;
        payBtn.dataset.amountLabel = formatTien(dotChoThanhToan.so_tien);
        payBtn.dataset.dotSo = dotChoThanhToan.dot_so;
        payBtn.onclick = () => openPaymentModal(payBtn);
      }
    } else {
      setText('remaining-note', 'Không còn khoản nào');
      if (pendingPanel) pendingPanel.style.display = 'none';
    }
  }

  function renderPaymentHistory(cacDot) {
    const tbody = document.getElementById('payment-history-tbody');
    if (!tbody) return;

    if (cacDot.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="color:var(--text-soft);">Chưa có khoản thanh toán nào.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    cacDot.forEach((dot) => {
      const daThanhToan = dot.trang_thai === 'da_thanh_toan';
      const tr = document.createElement('tr');
      if (!daThanhToan) tr.id = 'installment-row-' + dot.id;

      tr.innerHTML =
        '<td>Đợt ' + dot.dot_so + ' / ' + cacDot.length + '</td>' +
        '<td>' + formatTien(dot.so_tien) + '</td>' +
        '<td>' + (dot.ngay_thanh_toan ? PMUI.formatDateVN(new Date(dot.ngay_thanh_toan)) : '—') + '</td>' +
        '<td><span class="badge ' + (daThanhToan ? 'badge--paid' : 'badge--overdue') + '" id="installment-badge-' + dot.id + '">' +
          (daThanhToan ? 'Đã thanh toán' : 'Chưa thanh toán') + '</span></td>' +
        '<td class="data-table__actions">' +
          (daThanhToan
            ? '<a href="#" class="link-action">Xem hóa đơn</a>'
            : '<a href="#" class="link-action installment-pay-link" data-payment-id="' + dot.id + '" data-amount-label="' + formatTien(dot.so_tien) + '" data-dot-so="' + dot.dot_so + '">Thanh toán</a>') +
        '</td>';
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.installment-pay-link').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        openPaymentModal(link);
      });
    });
  }

  function openPaymentModal(trigger) {
    const amountLabel = trigger.dataset.amountLabel;
    const dotSo = trigger.dataset.dotSo;
    const paymentId = trigger.dataset.paymentId;

    PMUI.openModal({
      title: 'Xác nhận thanh toán',
      bodyHTML:
        '<p style="margin-bottom:1rem;">Bạn sắp thanh toán <strong>' + PMUI.escapeHTML(amountLabel) + '</strong> cho đợt ' + PMUI.escapeHTML(dotSo) + ' của dự án.</p>' +
        '<div class="field">' +
          '<label for="payment-method">Phương thức thanh toán</label>' +
          '<select id="payment-method">' +
            '<option value="bank">Chuyển khoản ngân hàng</option>' +
            '<option value="momo">Ví MoMo</option>' +
            '<option value="vnpay">VNPay</option>' +
          '</select>' +
        '</div>' +
        '<p style="color:var(--muted); font-size:.8rem; margin-top:.9rem;">' +
          'Cổng thanh toán VNPay/MoMo đang được tích hợp. Đây là bước xác nhận mô phỏng để demo luồng thanh toán.' +
        '</p>',
      confirmText: 'Xác nhận thanh toán',
      onConfirm: (modalEl) => {
        const method = modalEl.querySelector('#payment-method').value;
        return processPayment(method)
          .then(() => {
            markInstallmentAsPaid(paymentId);
            PMUI.toast('Thanh toán đợt ' + dotSo + ' thành công!', 'success');
          })
          .catch(() => {
            PMUI.toast('Thanh toán thất bại, vui lòng thử lại.', 'error');
            throw new Error('payment-failed');
          });
      },
    });
  }

  /**
   * Giả lập xử lý thanh toán.
   * TODO: khi nối cổng thanh toán thật, thay hàm này bằng việc gọi API tạo
   * giao dịch VNPay/MoMo rồi redirect người dùng sang trang thanh toán của
   * cổng đó, ví dụ:
   *
   *   function processPayment(method) {
   *     return fetch('/api/payments/create', {
   *       method: 'POST',
   *       headers: { 'Content-Type': 'application/json' },
   *       body: JSON.stringify({ method, installment: 2 }),
   *     })
   *       .then((res) => res.json())
   *       .then((data) => { window.location.href = data.paymentUrl; });
   *   }
   *
   * Việc admin xác nhận đã thực nhận tiền (sau khi cổng báo thành công,
   * hoặc chuyển khoản thủ công) đã có sẵn ở PMAPI.quanTri.xacNhanThanhToan().
   */
  function processPayment() {
    return new Promise((resolve) => setTimeout(resolve, 1200));
  }

  function markInstallmentAsPaid(paymentId) {
    // Cập nhật lại toàn bộ giao diện từ dữ liệu thật, tránh lệch trạng thái
    // giữa các thẻ tổng quan và bảng lịch sử sau khi thanh toán mô phỏng.
    if (duAnHienTaiId) {
      PMAPI.khachHang.layThanhToan(duAnHienTaiId)
        .then((paymentData) => {
          const cacDot = (paymentData.thanh_toan || []).slice().sort((a, b) => a.dot_so - b.dot_so);
          renderSummary(cacDot);
          renderPaymentHistory(cacDot);
        })
        .catch(() => {
          // Nếu không tải lại được, vẫn giữ trạng thái hiện tại trên giao diện.
        });
    }
  }

  function formatTien(soTien) {
    return Number(soTien).toLocaleString('vi-VN') + 'đ';
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
})();
