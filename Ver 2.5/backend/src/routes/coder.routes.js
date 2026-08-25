const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware, isCoder } = require('../middleware/auth'); 
const upload = require('../middleware/upload'); // Cấu hình multer

// POST: Coder thêm mẫu mới
router.post('/mau-website', authMiddleware, upload.single('thumbnail'), async (req, res) => {
    try {
        const coder_id = req.user.id; // Lấy ID từ token
        const { ten_mau, mo_ta, gia_ban, link_demo } = req.body;
        const thumbnail_url = req.file ? `/uploads/${req.file.filename}` : null;

        const query = `
            INSERT INTO mau_website (coder_id, ten_mau, mo_ta, gia_ban, thumbnail_url, link_demo, trang_thai)
            VALUES (?, ?, ?, ?, ?, ?, 'cho_duyet')
        `;
        
        await pool.query(query, [coder_id, ten_mau, mo_ta, gia_ban || 0, thumbnail_url, link_demo]);

        res.status(201).json({ success: true, message: "Thêm mẫu thành công" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    }
});

module.exports = router;