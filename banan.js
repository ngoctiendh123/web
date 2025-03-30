document.addEventListener("DOMContentLoaded", async function () {
    await openIndexedDB();
    loadFoodFromIndexedDB();

    const tableId = getTableIdFromUrl();
    renderCart(tableId);
});

// ✅ Lấy tableId từ URL
function getTableIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("tableId") || "1";
}

// ✅ Mở IndexedDB một lần duy nhất
let dbInstance = null;
async function openIndexedDB() {
    if (dbInstance) return dbInstance;
    return new Promise((resolve, reject) => {
        let request = indexedDB.open("FoodDB", 2);
        request.onupgradeneeded = function (event) {
            let db = event.target.result;
            if (!db.objectStoreNames.contains("foods")) {
                db.createObjectStore("foods", { keyPath: "id", autoIncrement: true });
            }
        };
        request.onsuccess = function (event) {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };
        request.onerror = () => reject("❌ Lỗi mở IndexedDB!");
    });
}

// ✅ Load món ăn từ IndexedDB
async function loadFoodFromIndexedDB() {
    const db = await openIndexedDB();
    let transaction = db.transaction(["foods"], "readonly");
    let store = transaction.objectStore("foods");
    let request = store.getAll();
    request.onsuccess = function () {
        renderFoodList(request.result);
        attachEventListeners();
    };
}

// ✅ Hiển thị danh sách món ăn
function renderFoodList(foods) {
    let foodList = document.getElementById("food-list");
    if (!foodList) return;
    foodList.innerHTML = "<h3>📖 Danh sách món ăn</h3>";

    foods.forEach(food => {
        let div = document.createElement("div");
        div.classList.add("food-item");
        div.innerHTML = `
            <span>${food.name} - ${food.price} VND</span>
            <button class="edit-food" data-id="${food.id}">✏ Sửa</button>
            <button class="delete-food" data-id="${food.id}">🗑 Xóa</button>
            <button class="add-to-cart" data-id="${food.id}" data-name="${food.name}" data-price="${food.price}">🛒</button>
        `;
        foodList.appendChild(div);
    });
}

// ✅ Thêm món ăn vào giỏ hàng
function addToCart(tableId, id, name, price) {
    if (!id || !name || !price) {
        alert("❌ Lỗi: Món ăn không hợp lệ!");
        return;
    }

    let cart = JSON.parse(localStorage.getItem(`cart_ban${tableId}`)) || [];
    let existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, price: parseInt(price), quantity: 1 });
    }

    localStorage.setItem(`cart_ban${tableId}`, JSON.stringify(cart));
    renderCart(tableId);
}
async function editFood(foodId) {
    let newName = prompt("Nhập tên mới:");
    let newPrice = prompt("Nhập giá mới:");
    
    if (!newName || !newPrice) {
        alert("❌ Không được để trống!");
        return;
    }

    try {
        await firebase.database().ref(`foods/${foodId}`).update({
            name: newName,
            price: parseInt(newPrice)
        });

        alert("✅ Cập nhật thành công!");
        loadFoodFromIndexedDB(); // Cập nhật danh sách món ăn
    } catch (error) {
        alert("❌ Lỗi khi cập nhật món ăn!");
    }
}
async function deleteFood(foodId) {
    let confirmDelete = confirm("Bạn có chắc muốn xóa món ăn này?");
    if (!confirmDelete) return;

    try {
        await firebase.database().ref(`foods/${foodId}`).remove();
        alert("✅ Xóa thành công!");
        loadFoodFromIndexedDB(); // Cập nhật danh sách món ăn
    } catch (error) {
        alert("❌ Lỗi khi xóa món ăn!");
    }
}

// ✅ Cập nhật số lượng món ăn
function updateQuantity(tableId, id, change) {
    let cart = JSON.parse(localStorage.getItem(`cart_ban${tableId}`)) || [];
    let item = cart.find(item => item.id === id);

    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            cart = cart.filter(item => item.id !== id);
        }
    }
    
    localStorage.setItem(`cart_ban${tableId}`, JSON.stringify(cart));
    renderCart(tableId);
}

// ✅ Xóa món ăn khỏi giỏ hàng
function removeFromCart(tableId, id) {
    let cart = JSON.parse(localStorage.getItem(`cart_ban${tableId}`)) || [];
    cart = cart.filter(item => item.id !== id);

    localStorage.setItem(`cart_ban${tableId}`, JSON.stringify(cart));
    renderCart(tableId);
}

// ✅ Hiển thị giỏ hàng bên phải màn hình
function renderCart(tableId) {
    let cartItemsContainer = document.getElementById("cart-items");
    let cart = JSON.parse(localStorage.getItem(`cart_ban${tableId}`)) || [];
    if (!cartItemsContainer) return;

    cartItemsContainer.innerHTML = "";

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = "<p>🛒 Giỏ hàng trống!</p>";
        return;
    }

    cart.forEach(item => {
        let itemDiv = document.createElement("div");
        itemDiv.classList.add("cart-item");
        itemDiv.innerHTML = `
            <span>${item.name} - ${item.price} VND (x${item.quantity})</span>
            <button class="decrease-qty" data-id="${item.id}">➖</button>
            <button class="increase-qty" data-id="${item.id}">➕</button>
            <button class="remove-item" data-id="${item.id}">❌</button>
        `;
        cartItemsContainer.appendChild(itemDiv);
    });

    document.querySelectorAll(".increase-qty").forEach(button => {
        button.addEventListener("click", function () {
            updateQuantity(tableId, this.getAttribute("data-id"), 1);
        });
    });

    document.querySelectorAll(".decrease-qty").forEach(button => {
        button.addEventListener("click", function () {
            updateQuantity(tableId, this.getAttribute("data-id"), -1);
        });
    });

    document.querySelectorAll(".remove-item").forEach(button => {
        button.addEventListener("click", function () {
            removeFromCart(tableId, this.getAttribute("data-id"));
        });
    });
}

// ✅ Xử lý thanh toán
function handleCheckout(tableId) {
    let cart = JSON.parse(localStorage.getItem(`cart_ban${tableId}`)) || [];

    if (cart.length === 0) {
        alert("❌ Giỏ hàng trống!");
        return;
    }

    // ✅ Tính tổng tiền
    let totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    // ✅ Hiển thị xác nhận với danh sách món ăn
    let orderDetails = cart.map(item => `${item.name} (x${item.quantity}) - ${item.price * item.quantity} VND`).join("\n");
    let confirmation = confirm(`✅ Xác nhận thanh toán?\n${orderDetails}\n\n💰 Tổng tiền: ${totalAmount} VND`);

    if (!confirmation) {
        alert("❌ Thanh toán bị hủy.");
        return;
    }

    // ✅ Chuyển danh sách món ăn thành chuỗi JSON để truyền qua URL
    let orderData = encodeURIComponent(JSON.stringify(cart));

    // ✅ Chuyển hướng đến trang thanhtoan.html, truyền tableId, tổng tiền & danh sách món ăn
    window.location.href = `thanhtoan.html?tableId=${tableId}&totalAmount=${totalAmount}&orderDetails=${orderData}`;
}


// ✅ Gán sự kiện
function attachEventListeners() {
    document.querySelectorAll(".add-to-cart").forEach(button => {
        button.addEventListener("click", function () {
            addToCart(getTableIdFromUrl(), this.getAttribute("data-id"), this.getAttribute("data-name"), this.getAttribute("data-price"));
        });
    });
    document.querySelectorAll(".edit-food").forEach(button => {
        button.addEventListener("click", function () {
            editFood(this.getAttribute("data-id"));
        });
    });
    
    document.querySelectorAll(".delete-food").forEach(button => {
        button.addEventListener("click", function () {
            deleteFood(this.getAttribute("data-id"));
        });
    });
    
    function goToCheckout(tableId) {
        window.location.href = `thanhtoan.html?tableId=${tableId}`;
    }
    
    // ✅ Gán sự kiện cho nút "Thanh toán"
    document.getElementById("checkout-btn")?.addEventListener("click", function () {
        handleCheckout(getTableIdFromUrl());
    });
    
}

function goBack() {
    window.history.back();
}
