import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { 
    getFirestore, collection, getDocs, setDoc, doc, onSnapshot, query, where, deleteDoc 
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { getDoc } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";


// ✅ Cấu hình Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCg1SRJw2BRm5501jNXBwaMFlF_NFXgqo",
    authDomain: "quanlinhahang-e9a38.firebaseapp.com",
    projectId: "quanlinhahang-e9a38",
    storageBucket: "quanlinhahang-e9a38.appspot.com",
    messagingSenderId: "334232846720",
    appId: "1:334232846720:web:122dc4ff290d563b078165",
    measurementId: "G-FC4GH2YVBM"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
window.firebaseDB = db;

// ===============================
// 🔍 **Kiểm tra món ăn đã tồn tại**
// ===============================
async function foodExists(name) {
    const foodsCollection = collection(db, "foods");
    const q = query(foodsCollection, where("name", "==", name.trim()));
    const snapshot = await getDocs(q);
    return !snapshot.empty; // Trả về `true` nếu món ăn đã tồn tại
}

// ===============================
// 🆔 **Lấy ID tiếp theo dạng số**
// ===============================
async function getNextFoodId() {
    const foodsCollection = collection(db, "foods");
    const snapshot = await getDocs(foodsCollection);
    
    let ids = snapshot.docs.map(doc => parseInt(doc.id, 10)).filter(id => !isNaN(id));
    ids.sort((a, b) => a - b);

    let nextId = 1;
    for (let id of ids) {
        if (id !== nextId) break;
        nextId++;
    }

    return nextId.toString();
}

// ===============================
// 🍽️ **Thêm món ăn vào Firebase**
// ===============================
async function addFood(name, price) {
    try {
        if (!name || !price) throw new Error("⚠️ Vui lòng nhập đầy đủ thông tin món ăn!");

        // ✅ Kiểm tra món ăn đã tồn tại hay chưa
        if (await foodExists(name)) {
            alert(`⚠️ Món "${name}" đã tồn tại trong danh sách!`);
            return;
        }

        const newId = await getNextFoodId();
        await setDoc(doc(db, "foods", newId), { 
            name: name.trim(),
            price: parseFloat(price)
        });

        alert(`✅ Món \"${name}\" đã thêm thành công!`);
    } catch (error) {
        console.error("❌ Lỗi khi thêm món ăn:", error);
        alert("❌ Không thể thêm món ăn, vui lòng thử lại!");
    }
}
async function fetchFoods() {
    const foodsCollection = collection(db, "foods");
    const snapshot = await getDocs(foodsCollection);
    
    let foods = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    renderFoodList(foods);
}

// ===============================
// 🗑️ **Xóa món ăn khỏi Firebase và IndexedDB**
// ===============================
async function deleteFood(foodId) {
    try {
        if (!foodId) throw new Error("⚠️ Vui lòng cung cấp ID món ăn để xóa!");

        console.log("🔄 Bắt đầu xóa món ăn với ID:", foodId);

        // ✅ Xóa món ăn khỏi Firebase
        await deleteDoc(doc(db, "foods", foodId));
        console.log(`✅ Đã xóa món ăn ID ${foodId} khỏi Firebase!`);

        // ✅ Xóa món ăn khỏi IndexedDB
        const db = await openIndexedDB();
        if (!db.objectStoreNames.contains("foods")) {
            throw new Error("❌ Không tìm thấy bảng 'foods' trong IndexedDB");
        }

        console.log("✅ Đang xóa món ăn trong IndexedDB...");
        const transaction = db.transaction(["foods"], "readwrite");
        const store = transaction.objectStore("foods");
        store.delete(parseInt(foodId, 10));

        console.log(`✅ Đã xóa món ăn ID ${foodId} khỏi IndexedDB!`);

        alert(`✅ Món ăn ID ${foodId} đã được xóa thành công!`);
    } catch (error) {
        console.error("❌ Lỗi khi xóa món ăn:", error);
        alert(`❌ Lỗi khi xóa món ăn: ${error.message}`);
    }
}

// ===============================
// 🔄 **Quản lý IndexedDB**
// ===============================
let indexedDBInstance = null;




async function updateIndexedDB(firebaseData) {
    const db = await openIndexedDB();
    if (!db.objectStoreNames.contains("foods")) return;
    let transaction = db.transaction(["foods"], "readwrite");
    let store = transaction.objectStore("foods");

    // ✅ Xóa dữ liệu cũ trước khi thêm mới để tránh trùng lặp
    store.clear().onsuccess = async () => {
        await Promise.all(firebaseData.map(food => store.put(food)));
        console.log("✅ IndexedDB đã cập nhật xong!");
    };
}
async function syncFirebaseToIndexedDB() {
    const db = await openIndexedDB();

    console.log("🔄 Đang đồng bộ dữ liệu từ Firebase xuống IndexedDB...");

    // 🔍 Lấy dữ liệu từ Firebase
    const snapshot = await getDocs(collection(firebaseDB, "foods"));
    let firebaseData = snapshot.docs.map(doc => ({
        id: parseInt(doc.id, 10),
        ...doc.data()
    }));

    // ✅ Cập nhật IndexedDB
    await updateIndexedDB(firebaseData);
    console.log("✅ Đã đồng bộ Firebase → IndexedDB!");

    // 🔄 Lắng nghe Firebase để cập nhật tự động
    onSnapshot(collection(firebaseDB, "foods"), async (snapshot) => {
        let firebaseData = snapshot.docs.map(doc => ({
            id: parseInt(doc.id, 10),
            ...doc.data()
        }));
        await updateIndexedDB(firebaseData);
        console.log("✅ Firebase thay đổi → IndexedDB cập nhật!");
    });
}


// ✅ Kích hoạt đồng bộ khi mở trang
syncFirebaseToIndexedDB();




// ===============================
// ✏️ **Sửa món ăn trong Firebase và IndexedDB**
// ===============================
async function updateFood(foodId, newName, newPrice) {
    try {
        if (!foodId || !newName || !newPrice) throw new Error("⚠️ Vui lòng cung cấp đầy đủ thông tin!");

        console.log("🔄 Bắt đầu cập nhật món ăn với ID:", foodId);
        console.log("📌 Dữ liệu mới:", { name: newName, price: newPrice });

        // ✅ Kiểm tra Firebase có món ăn này không
        const foodRef = doc(db, "foods", foodId);
        const docSnap = await getDoc(foodRef);

        if (!docSnap.exists()) {
            throw new Error(`❌ Không tìm thấy món ăn với ID: ${foodId} trong Firebase`);
        }

        // ✅ Cập nhật Firebase
        console.log("✅ Đang cập nhật Firebase...");
        await setDoc(foodRef, {
            name: newName.trim(),
            price: parseFloat(newPrice)
        }, { merge: true });
        console.log(`✅ Firebase đã cập nhật món ăn: ${foodId}`);

        // ✅ Cập nhật IndexedDB
        console.log("✅ Đang mở IndexedDB...");
        const db = await openIndexedDB();
        
        if (!db.objectStoreNames.contains("foods")) {
            throw new Error("❌ Không tìm thấy bảng 'foods' trong IndexedDB");
        }

        console.log("✅ Đang cập nhật IndexedDB...");
        const transaction = db.transaction(["foods"], "readwrite");
        const store = transaction.objectStore("foods");
        store.put({ id: parseInt(foodId, 10), name: newName.trim(), price: parseFloat(newPrice) });

        console.log(`✅ IndexedDB đã cập nhật món ăn: ${foodId}`);

        alert(`✅ Món ăn với ID ${foodId} đã được sửa thành công!`);
    } catch (error) {
        console.error("❌ Lỗi khi sửa món ăn:", error);
        alert(`❌ Lỗi khi sửa món ăn: ${error.message}`);
    }
}



// ✅ Kích hoạt đồng bộ Firebase → IndexedDB


export { db, addFood, deleteFood, updateFood,fetchFoods };
// ===============================
// 💰 **Lưu doanh thu khi thanh toán**
// ===============================
async function saveRevenue(amount) {
    try {
        if (!amount || isNaN(amount) || amount <= 0) {
            throw new Error("⚠️ Số tiền không hợp lệ!");
        }

        // 📅 Lấy ngày hiện tại (YYYY-MM-DD)
        const today = new Date().toISOString().split("T")[0];
        const revenueRef = doc(db, "revenue", today);
        
        // 🔍 Lấy dữ liệu của ngày đó từ Firebase
        const revenueSnapshot = await getDoc(revenueRef);
        let existingRevenue = revenueSnapshot.exists() ? revenueSnapshot.data().total : 0;

        let newRevenue = existingRevenue + amount;

        // ✅ Cập nhật doanh thu lên Firebase
        await setDoc(revenueRef, { total: newRevenue }, { merge: true });

        console.log(`✅ Doanh thu ngày ${today} đã cập nhật: ${newRevenue} VND`);

        // ✅ Đồng bộ IndexedDB
        await syncRevenueToIndexedDB();
        
        alert(`✅ Đã lưu doanh thu: ${amount} VND vào ngày ${today}`);
    } catch (error) {
        console.error("❌ Lỗi khi lưu doanh thu:", error);
        alert("❌ Không thể lưu doanh thu, vui lòng thử lại!");
    }
}


// ===============================
// 🔄 **Đồng bộ doanh thu từ Firebase xuống IndexedDB**
// ===============================
async function syncRevenueToIndexedDB() {
    const db = await openIndexedDB();

    console.log("🔄 Đang đồng bộ doanh thu từ Firebase xuống IndexedDB...");

    // 🔍 Lấy dữ liệu từ Firebase
    const snapshot = await getDocs(collection(firebaseDB, "revenue"));
    let firebaseData = snapshot.docs.map(doc => ({
        id: doc.id, // YYYY-MM-DD
        total: doc.data().total
    }));

    // ✅ Cập nhật IndexedDB
    await updateRevenueIndexedDB(firebaseData);
    console.log("✅ Đã đồng bộ Firebase → IndexedDB (doanh thu)!");

    // 🔄 Lắng nghe Firebase để cập nhật tự động
    onSnapshot(collection(firebaseDB, "revenue"), async (snapshot) => {
        let firebaseData = snapshot.docs.map(doc => ({
            id: doc.id,
            total: doc.data().total
        }));
        await updateRevenueIndexedDB(firebaseData);
        console.log("✅ Firebase (doanh thu) thay đổi → IndexedDB cập nhật!");
    });
}


syncRevenueToIndexedDB();

// ===============================
// 📦 **Mở IndexedDB và đảm bảo có bảng revenue**
// ===============================
if (!window.indexedDBInstance) {
    window.indexedDBInstance = null;
}

async function openIndexedDB() {
    return new Promise((resolve, reject) => {
       
        
        let request = indexedDB.open("FoodDB", 3);

        request.onupgradeneeded = function (event) {
            let db = event.target.result;
        
            if (!db.objectStoreNames.contains("foods")) {
                db.createObjectStore("foods", { keyPath: "id" });
                console.log("✅ Đã tạo bảng 'foods' trong IndexedDB!");
            }
        
            if (!db.objectStoreNames.contains("revenue")) {
                db.createObjectStore("revenue", { keyPath: "id" });
                console.log("✅ Đã tạo bảng 'revenue' trong IndexedDB!");
            }
        };

        request.onsuccess = function (event) {
            indexedDBInstance = event.target.result;
            resolve(indexedDBInstance);
        };

        request.onerror = function () {
            console.error("❌ Lỗi mở IndexedDB!");
            reject("❌ Không thể mở IndexedDB!");
        };
    });
}

async function updateRevenueIndexedDB(firebaseData) {
    const db = await openIndexedDB();
    if (!db.objectStoreNames.contains("revenue")) return;
    let transaction = db.transaction(["revenue"], "readwrite");
    let store = transaction.objectStore("revenue");

    store.clear().onsuccess = async () => {
        await Promise.all(firebaseData.map(revenue => store.put(revenue)));
        console.log("✅ IndexedDB đã cập nhật doanh thu!");
    };
}




// ✅ Xuất các hàm để sử dụng
export { saveRevenue, syncRevenueToIndexedDB };
