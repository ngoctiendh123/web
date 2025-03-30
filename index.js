import { db } from "./fire.js"; 
import { collection, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { renderFoodList } from "./render.js";  // Import hàm hiển thị

// ===========================
// 🔄 **Lắng nghe Firebase để cập nhật giao diện**
// ===========================
function listenToFirebase() {
    console.log("👀 Đang lắng nghe Firebase để cập nhật giao diện...");

    onSnapshot(collection(db, "foods"), async (snapshot) => {
        let firebaseData = snapshot.docs.map(doc => ({
            id: parseInt(doc.id, 10),
            ...doc.data()
        }));

        console.log("⚡ Firebase thay đổi! Cập nhật giao diện...", firebaseData);
        renderFoodList(firebaseData); // Gọi hàm hiển thị từ `render.js`
    });
}

// ===========================
// 🔍 **Lấy dữ liệu từ Firebase để hiển thị**
// ===========================
async function fetchFoods() {
    console.log("📡 Đang lấy dữ liệu từ Firebase...");
    
    try {
        const snapshot = await getDocs(collection(db, "foods"));
        let foods = snapshot.docs.map(doc => ({
            id: parseInt(doc.id, 10),
            ...doc.data()
        }));

        console.log("✅ Đã lấy dữ liệu từ Firebase!", foods);
        renderFoodList(foods); // Gọi hàm hiển thị từ `render.js`
    } catch (error) {
        console.error("❌ Lỗi khi lấy dữ liệu từ Firebase:", error);
    }
}

// ===========================
// ✅ Chạy khi trang load
// ===========================
fetchFoods(); 
listenToFirebase(); 
