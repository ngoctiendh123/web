// ✅ Kết nối Firebase
import { db } from "./fire.js"; 
import { setDoc, doc } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { saveRevenueToIndexedDB } from "./fire.js";

document.addEventListener("DOMContentLoaded", function () {
    // Lấy tham số từ URL
    const params = new URLSearchParams(window.location.search);
    const tableId = params.get('tableId');
    const totalAmount = params.get('totalAmount');

    // Hiển thị thông tin bàn và tổng tiền
    document.getElementById("table-info").innerHTML = `🔖 Bàn số: ${tableId}`;
    document.getElementById("total-amount").innerHTML = `💰 Tổng tiền: ${totalAmount} VND`;

    // Tạo mã QR thanh toán
    document.getElementById("qr-code").src = `https://img.vietqr.io/image/MbBank-0945768636-compact.jpg/?data=ThanhToanBàn${tableId}&size=150x150`;

    // Gán sự kiện cho nút thanh toán tiền mặt
    document.querySelector(".cash-payment button").addEventListener("click", function () {
        confirmCashPayment(tableId, totalAmount);
    });
});

// ===============================
// 💰 **Xác nhận thanh toán tiền mặt & lưu vào Firebase**
// ===============================
async function confirmCashPayment(tableId, totalAmount) {
    try {
        const timestamp = new Date().toISOString();
        const orderId = Date.now().toString(); // Dùng timestamp làm ID đơn hàng

        const orderData = {
            id: orderId,
            tableId: tableId,
            totalAmount: parseFloat(totalAmount),
            timestamp: timestamp
        };

        // ✅ Lưu lên Firebase
        await setDoc(doc(db, "revenue", orderId), orderData);
        console.log(`✅ Đơn hàng ${orderId} đã lưu vào Firebase!`);

        // ✅ Lưu vào IndexedDB để xem offline
        await saveRevenueToIndexedDB(orderData);

        // ✅ Xóa giỏ hàng sau khi thanh toán
        localStorage.removeItem(`cart_ban${tableId}`);
        
        alert(`✅ Thanh toán tiền mặt cho Bàn số ${tableId} đã thành công!`);

        // Chuyển về trang chủ
        window.location.href = "quanlibanan.html";
    } catch (error) {
        console.error("❌ Lỗi khi thanh toán:", error);
        alert("❌ Không thể lưu thanh toán, vui lòng thử lại!");
    }
}
