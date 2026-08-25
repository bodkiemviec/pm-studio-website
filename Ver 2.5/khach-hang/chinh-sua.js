/* ==========================================================================
   khach-hang/chinh-sua.js
   Xử lý 2 nút "Duyệt bản nháp" và "Yêu cầu chỉnh sửa":
   mở modal xác nhận -> đổi badge trạng thái -> thêm vào lịch sử góp ý -> toast.
   Phụ thuộc: ui.js (PMUI) phải được nạp trước file này.
   ========================================================================== */

(function () {
  const approveBtn = document.getElementById('approve-draft-btn');
  const requestEditBtn = document.getElementById('request-edit-btn');
  const badge = document.getElementById('draft-status-badge');
  const commentList = document.getElementById('comment-list');
  if (!approveBtn || !requestEditBtn || !badge) return;

  approveBtn.addEventListener('click', () => {
    PMUI.openModal({
      title: 'Duyệt bản nháp trang chủ?',
      bodyHTML:
        '<p>Sau khi duyệt, đội thiết kế sẽ tiến hành hoàn thiện và triển khai bản nháp này. ' +
        'Bạn vẫn còn lượt chỉnh sửa nếu cần điều chỉnh thêm sau đó.</p>',
      confirmText: 'Duyệt bản nháp',
      onConfirm: () => approveDraft(),
    });
  });

  requestEditBtn.addEventListener('click', () => {
    PMUI.openModal({
      title: 'Yêu cầu chỉnh sửa',
      bodyHTML:
        '<div class="field">' +
          '<label for="edit-note">Bạn muốn chỉnh sửa gì?</label>' +
          '<textarea id="edit-note" placeholder="VD: Đổi màu nút đặt bàn sang màu cam đậm hơn..."></textarea>' +
        '</div>',
      confirmText: 'Gửi yêu cầu',
      onConfirm: (modalEl) => submitEditRequest(modalEl),
    });
  });

  function approveDraft() {
    // TODO: khi có backend thật, gọi API tại đây trước khi đổi giao diện, vd:
    //   return fetch('/api/drafts/1/approve', { method: 'POST' }).then(...)
    setBadge('badge--done', 'Đã duyệt');
    addComment('Bạn', 'Đã duyệt bản nháp trang chủ.');
    PMUI.toast('Đã duyệt bản nháp trang chủ.', 'success');
  }

  function submitEditRequest(modalEl) {
    const textarea = modalEl.querySelector('#edit-note');
    const note = (textarea.value || '').trim();

    if (!note) {
      PMUI.markFieldError(textarea, 'Vui lòng mô tả nội dung cần chỉnh sửa.');
      PMUI.toast('Vui lòng mô tả nội dung cần chỉnh sửa.', 'error');
      textarea.focus();
      // Trả về Promise reject để modal không đóng, cho phép sửa lại.
      return Promise.reject(new Error('empty-note'));
    }

    // TODO: khi có backend thật, gọi API tại đây, vd:
    //   return fetch('/api/drafts/1/request-edit', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ note }),
    //   }).then(...)
    setBadge('badge--progress', 'Đang chỉnh sửa');
    addComment('Bạn', note);
    PMUI.toast('Đã gửi yêu cầu chỉnh sửa.', 'success');
    return Promise.resolve();
  }

  function setBadge(className, text) {
    badge.className = 'badge ' + className;
    badge.textContent = text;
  }

  function addComment(author, body) {
    if (!commentList) return;
    const el = document.createElement('div');
    el.className = 'comment';
    el.innerHTML =
      '<p class="comment__head"><strong>' + PMUI.escapeHTML(author) + '</strong> · ' + PMUI.formatDateVN() + '</p>' +
      '<p class="comment__body">' + PMUI.escapeHTML(body) + '</p>';
    commentList.prepend(el);
  }
})();
