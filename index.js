import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { 
    getFirestore, collection, getDocs, setDoc, doc, onSnapshot, deleteDoc 
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

// Cấu hình Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCg1SRJ...",
    authDomain: "quanlinhahang.firebaseapp.com",
    projectId: "quanlinhahang",
    storageBucket: "quanlinhahang.appspot.com",
    messagingSenderId: "334232846720",
    appId: "1:334232846720:web:122dc4ff290d563b078165",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
window.firebaseDB = db;

// Lấy ID món ăn tiếp theo
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

// Thêm món ăn mới vào Firebase và IndexedDB
async function addFood(name, price) {
    try {
        if (!name || !price) throw new Error("⚠️ Vui lòng nhập đầy đủ thông tin món ăn!");
        const newId = await getNextFoodId();
        await setDoc(doc(db, "foods", newId), { 
            name: name.trim(),
            price: parseFloat(price)
        });
        console.log(`✅ Đã thêm: ${name} - ${price} VND`);
        displayFoods();  // Hiển thị lại danh sách món ăn
    } catch (error) {
        console.error("❌ Lỗi khi thêm món ăn:", error);
    }
}

// Sửa món ăn trong Firebase và IndexedDB
async function updateFood(foodId, newName, newPrice) {
    try {
        if (!foodId || !newName || !newPrice) throw new Error("⚠️ Vui lòng nhập đầy đủ thông tin!");

        const foodRef = doc(db, "foods", foodId);
        await setDoc(foodRef, {
            name: newName.trim(),
            price: parseFloat(newPrice)
        }, { merge: true });

        console.log(`✅ Đã cập nhật món ăn với ID ${foodId} trong Firebase`);

        // Cập nhật IndexedDB
        const db = await openIndexedDB();
        const transaction = db.transaction(["foods"], "readwrite");
        const store = transaction.objectStore("foods");
        store.put({ id: parseInt(foodId, 10), name: newName.trim(), price: parseFloat(newPrice) });

        console.log(`✅ Đã cập nhật món ăn với ID ${foodId} trong IndexedDB!`);
        displayFoods();  // Hiển thị lại danh sách
    } catch (error) {
        console.error("❌ Lỗi khi sửa món ăn:", error);
    }
}


// Xóa món ăn khỏi Firebase và IndexedDB
async function deleteFood(foodId) {
    try {
        if (!foodId) throw new Error("⚠️ Vui lòng cung cấp ID món ăn để xóa!");

        // Xóa món ăn khỏi Firebase
        await deleteDoc(doc(db, "foods", foodId));
        console.log(`✅ Đã xóa món ăn ID ${foodId} khỏi Firebase!`);

        // Xóa món ăn khỏi IndexedDB
        const db = await openIndexedDB();
        const transaction = db.transaction(["foods"], "readwrite");
        const store = transaction.objectStore("foods");
        store.delete(parseInt(foodId, 10));

        console.log(`✅ Đã xóa món ăn ID ${foodId} khỏi IndexedDB!`);
    } catch (error) {
        console.error("❌ Lỗi khi xóa món ăn:", error);
    }
}

// Hiển thị danh sách món ăn
async function displayFoods() {
    try {
        console.log("🔄 Đang lấy dữ liệu từ IndexedDB...");
        let foodsData = await getFoodsFromIndexedDB(); // Lấy dữ liệu từ IndexedDB
        console.log("📥 Dữ liệu từ IndexedDB:", foodsData);

        if (foodsData.length === 0) {
            console.log("❌ Không có dữ liệu trong IndexedDB!");
        } else {
            console.log("📊 Dữ liệu hiển thị:", foodsData);
            // Hiển thị dữ liệu (làm theo nhu cầu của bạn)
            const foodsList = document.getElementById("foodsList");
            foodsList.innerHTML = foodsData.map(food => 
                `<li>${food.name} - ${food.price} VND
                    <button onclick="editFood(${food.id})">Sửa</button>
                    <button onclick="confirmDeleteFood(${food.id})">Xóa</button>
                </li>`
            ).join('');
            
        }
    } catch (error) {
        console.error("❌ Lỗi khi hiển thị dữ liệu:", error);
    }
}

// Các hàm thêm, sửa và xóa món ăn từ giao diện người dùng
document.getElementById("addFoodBtn").addEventListener("click", () => {
    const name = document.getElementById("foodName").value;
    const price = document.getElementById("foodPrice").value;
    addFood(name, price);  // Gọi hàm thêm món ăn
});

async function editFood(foodId) {
    const name = prompt("Nhập tên món ăn mới:");
    const price = prompt("Nhập giá món ăn mới:");
    await updateFood(foodId, name, price);  // Gọi hàm sửa món ăn
}

async function confirmDeleteFood(foodId) {
    const confirmation = confirm("Bạn có chắc muốn xóa món ăn này?");
    if (confirmation) {
        await deleteFood(foodId);  // Gọi đúng hàm xóa
    }
}


// Mở và đồng bộ IndexedDB
let indexedDBInstance = null;

function openIndexedDB() {
    return new Promise((resolve, reject) => {
        if (indexedDBInstance) return resolve(indexedDBInstance);
        let request = indexedDB.open("FoodDB", 2);

        request.onupgradeneeded = function (event) {
            let db = event.target.result;
            if (!db.objectStoreNames.contains("foods")) {
                db.createObjectStore("foods", { keyPath: "id" });
                console.log("✅ Object store 'foods' đã được tạo!");
            }
        };

        request.onsuccess = async function (event) {
            indexedDBInstance = event.target.result;
            console.log("✅ IndexedDB đã mở thành công!");
            resolve(indexedDBInstance);
            await syncFirebaseToIndexedDB();
        };

        request.onerror = () => reject("❌ Lỗi mở IndexedDB!");
    });
}

async function updateIndexedDB(firebaseData) {
    const db = await openIndexedDB();
    let transaction = db.transaction(["foods"], "readwrite");
    let store = transaction.objectStore("foods");
    await Promise.all(firebaseData.map(food => store.put(food)));
    console.log("✅ IndexedDB đã cập nhật xong!");
}

function syncFirebaseToIndexedDB() {
    const foodsCollection = collection(db, "foods");
    onSnapshot(foodsCollection, async (snapshot) => {
        try {
            let firebaseData = snapshot.docs.map(doc => ({ id: parseInt(doc.id, 10), ...doc.data() }));
            console.log("📥 Firebase cập nhật:", firebaseData);
            await updateIndexedDB(firebaseData);
        } catch (error) {
            console.error("❌ Lỗi đồng bộ Firebase → IndexedDB:", error);
        }
    });
}

openIndexedDB();
