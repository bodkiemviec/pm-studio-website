document.getElementById('form-them-mau').addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('btn-submit');
    const statusBox = document.getElementById('form-status');

    const showStatus = (message, type) => {
        statusBox.textContent = message;
        statusBox.className = `form-status is-visible is-${type}`;
    };

    const linkDemo = document.getElementById('link_demo').value.trim();
    const tenMau = document.getElementById('ten_mau').value.trim();
    const moTa = document.getElementById('mo_ta').value.trim();

    if (!tenMau || !moTa || !linkDemo) {
        showStatus('Vui lòng điền đầy đủ các trường bắt buộc (*).', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('ten_mau', tenMau);
    formData.append('mo_ta', moTa);
    formData.append('gia_ban', document.getElementById('gia_ban').value || '0');
    formData.append('link_demo', linkDemo);

    const fileInput = document.getElementById('thumbnail');
    if (fileInput.files.length > 0) {
        formData.append('thumbnail', fileInput.files[0]);
    }

    const token = localStorage.getItem('token');
    if (!token) {
        showStatus('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Đang gửi...';

    try {
        const response = await fetch(`${API_BASE_URL}/api/coder/mau-website`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // Không set Content-Type khi dùng FormData, trình duyệt sẽ tự set kèm boundary
            },
            body: formData
        });

        let data = {};
        try {
            data = await response.json();
        } catch (_) {
            // Phản hồi không phải JSON hợp lệ (VD: lỗi 502/504 từ server)
        }

        if (response.ok && data.success) {
            showStatus('Đã gửi mẫu thành công! Vui lòng chờ Admin duyệt.', 'success');
            setTimeout(() => {
                window.location.href = 'quan-ly-mau.html';
            }, 1200);
        } else if (response.status === 401) {
            showStatus('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
            btn.disabled = false;
            btn.textContent = 'Gửi duyệt mẫu';
        } else {
            showStatus('Lỗi: ' + (data.message || `Máy chủ phản hồi ${response.status}`), 'error');
            btn.disabled = false;
            btn.textContent = 'Gửi duyệt mẫu';
        }
    } catch (error) {
        console.error(error);
        showStatus('Lỗi kết nối máy chủ! Vui lòng kiểm tra mạng và thử lại.', 'error');
        btn.disabled = false;
        btn.textContent = 'Gửi duyệt mẫu';
    }
});
