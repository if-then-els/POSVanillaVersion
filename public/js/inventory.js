/**
 * Inventory management functionality for POS System
 */

// Mock product data
let mockProducts = [
  {
    id: 1,
    name: "Product A",
    description: "Description for Product A",
    sku: "SKU001",
    price: 49.99,
    quantity: 25,
    image: "../assets/images/placeholder.png",
  },
  {
    id: 2,
    name: "Product B",
    description: "Description for Product B",
    sku: "SKU002",
    price: 29.99,
    quantity: 42,
    image: "../assets/images/placeholder.png",
  },
  {
    id: 3,
    name: "Product C",
    description: "Description for Product C",
    sku: "SKU003",
    price: 19.99,
    quantity: 8,
    image: "../assets/images/placeholder.png",
  },
  {
    id: 4,
    name: "Product D",
    description: "Description for Product D",
    sku: "SKU004",
    price: 59.99,
    quantity: 15,
    image: "../assets/images/placeholder.png",
  },
  {
    id: 5,
    name: "Product E",
    description: "Description for Product E",
    sku: "SKU005",
    price: 39.99,
    quantity: 5,
    image: "../assets/images/placeholder.png",
  },
];

// Current product being edited
let currentProduct = null;

// Global variable to hold products fetched from backend
let products = [];

// Helper functions for localStorage (you might want to move these to a separate module)
function getLocalStorage(key) {
  try {
    const serializedValue = localStorage.getItem(key);
    if (serializedValue === null) {
      return undefined;
    }
    return JSON.parse(serializedValue);
  } catch (error) {
    console.error("Error getting item from localStorage:", error);
    return undefined;
  }
}

function setLocalStorage(key, value) {
  try {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
  } catch (error) {
    console.error("Error setting item in localStorage:", error);
  }
}

// Helper function to format currency
function formatCurrency(number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(number);
}

// Helper function to show toast messages
function showToast(title, message, type = "success") {
  // Implement your toast notification logic here.
  // This is a placeholder. You'll likely use a library or custom implementation.
  console.log(`Toast: ${type} - ${title}: ${message}`);
  // Example using a simple alert (replace with your actual toast implementation):
  alert(`${title}: ${message}`);
}

// Load products data from backend
async function loadProducts() {
  try {
    const response = await fetch("/getInventory", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    if (data && data.inventory) {
      products = data.inventory;
    } else {
      products = [];
    }
  } catch (error) {
    console.error("Error loading inventory data:", error);
    products = [];
  }

  // Update products count
  const productsCount = document.getElementById("products-count");
  if (productsCount) {
    productsCount.textContent = `${products.length} products in inventory`;
  }

  // Filter products based on search term
  const searchTerm =
    document.getElementById("inventory-search")?.value.toLowerCase() || "";
  const filteredProducts = products.filter(
    (product) =>
      product.productName.toLowerCase().includes(searchTerm) ||
      product.productBatchNumber.toLowerCase().includes(searchTerm)
  );

  // Get low stock products (quantity < 10)
  const lowStockProducts = filteredProducts.filter(
    (product) => product.productQuantity < 10
  );

  // Render all products table
  const productsTable = document.getElementById("products-table");
  if (productsTable) {
    if (filteredProducts.length === 0) {
      productsTable.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-4 text-center text-gray-500">No products found</td>
        </tr>
      `;
    } else {
      productsTable.innerHTML = filteredProducts
        .map(
          (product) => `
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4">
            <img src="../assets/images/placeholder.png" alt="${
              product.productName
            }" class="h-10 w-10 rounded-md object-cover">
          </td>
          <td class="px-6 py-4">${product.productName}</td>
          <td class="px-6 py-4">${product.productBatchNumber}</td>
          <td class="px-6 py-4">${formatCurrency(product.productPrice)}</td>
          <td class="px-6 py-4 ${
            product.productQuantity < 10 ? "text-red-500 font-medium" : ""
          }">${product.productQuantity}</td>
          <td class="px-6 py-4">
            <div class="flex space-x-2">
              <button
                class="edit-product-btn p-1 rounded-md text-gray-500 hover:bg-gray-100"
                data-id="${product._id}"
                title="Edit"
              >
                <i class="fas fa-edit"></i>
              </button>
              <button 
                class="delete-product-btn p-1 rounded-md text-red-500 hover:bg-red-50" 
                data-id="${product._id}"
                title="Delete"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `
        )
        .join("");

      // Add event listeners to edit and delete buttons
      document.querySelectorAll(".edit-product-btn").forEach((button) => {
        button.addEventListener("click", handleEditProduct);
      });

      document.querySelectorAll(".delete-product-btn").forEach((button) => {
        button.addEventListener("click", handleDeleteProduct);
      });
    }
  }

  // Render low stock products table
  const lowStockTable = document.getElementById("low-stock-table");
  if (lowStockTable) {
    if (lowStockProducts.length === 0) {
      lowStockTable.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-4 text-center text-gray-500">No low stock products found</td>
        </tr>
      `;
    } else {
      lowStockTable.innerHTML = lowStockProducts
        .map(
          (product) => `
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4">
            <img src="../assets/images/placeholder.png" alt="${
              product.productName
            }" class="h-10 w-10 rounded-md object-cover">
          </td>
          <td class="px-6 py-4">${product.productName}</td>
          <td class="px-6 py-4">${product.productBatchNumber}</td>
          <td class="px-6 py-4">${formatCurrency(product.productPrice)}</td>
          <td class="px-6 py-4 text-red-500 font-medium">${
            product.productQuantity
          }</td>
          <td class="px-6 py-4">
            <div class="flex space-x-2">
              <button 
                class="edit-product-btn p-1 rounded-md text-gray-500 hover:bg-gray-100" 
                data-id="${product._id}"
                title="Edit"
              >
                <i class="fas fa-edit"></i>
              </button>
              <button 
                class="delete-product-btn p-1 rounded-md text-red-500 hover:bg-red-50" 
                data-id="${product._id}"
                title="Delete"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `
        )
        .join("");

      document.querySelectorAll(".edit-product-btn").forEach((button) => {
        button.addEventListener("click", handleEditProduct);
      });

      document.querySelectorAll(".delete-product-btn").forEach((button) => {
        button.addEventListener("click", handleDeleteProduct);
      });
    }
  }
}

// Handle add product button click
function handleAddProduct() {
  // Reset form
  document.getElementById("product-form").reset();
  document.getElementById("form-error").classList.add("hidden");

  // Set modal title
  document.getElementById("modal-title").textContent = "Add Product";

  // Clear current product
  currentProduct = null;

  // Show modal
  document.getElementById("product-modal").classList.remove("hidden");
}

// Handle edit product button click
function handleEditProduct(event) {
  const productId = Number.parseInt(event.currentTarget.dataset.id);
  currentProduct = mockProducts.find((product) => product.id === productId);

  if (currentProduct) {
    // Set form values
    document.getElementById("product-name").value = currentProduct.name;
    document.getElementById("product-description").value =
      currentProduct.description;
    document.getElementById("product-sku").value = currentProduct.sku;
    document.getElementById("product-price").value = currentProduct.price;
    document.getElementById("product-quantity").value = currentProduct.quantity;

    // Set modal title
    document.getElementById("modal-title").textContent = "Edit Product";

    // Hide error message
    document.getElementById("form-error").classList.add("hidden");

    // Show modal
    document.getElementById("product-modal").classList.remove("hidden");
  }
}

// Handle delete product button click
function handleDeleteProduct(event) {
  const productId = event.currentTarget.dataset.id;
  currentProduct = products.find((product) => product._id === productId);

  if (currentProduct) {
    document.getElementById(
      "delete-confirmation-text"
    ).textContent = `Are you sure you want to delete "${currentProduct.productName}"? This action cannot be undone.`;
    document.getElementById("delete-modal").classList.remove("hidden");
  }
}

// Handle delete confirmation
async function handleDeleteConfirmation() {
  if (currentProduct) {
    try {
      const response = await fetch(`/deleteInventory/${currentProduct._id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (response.ok) {
        showToast(
          "Product Deleted",
          `${currentProduct.productName} has been removed from inventory`,
          "success"
        );
        document.getElementById("delete-modal").classList.add("hidden");
        loadProducts();
      } else {
        showToast("Error", data.message || "Failed to delete product", "error");
      }
    } catch (error) {
      showToast("Error", "Failed to delete product", "error");
    }
  }
}

// Handle product form submission
function handleProductFormSubmit(event) {
  event.preventDefault();

  // Get form values
  const name = document.getElementById("product-name").value.trim();
  const description = document
    .getElementById("product-description")
    .value.trim();
  const sku = document.getElementById("product-sku").value.trim();
  const price = Number.parseFloat(
    document.getElementById("product-price").value
  );
  const quantity = Number.parseInt(
    document.getElementById("product-quantity").value
  );

  // Validate form
  if (!name || !sku || isNaN(price) || isNaN(quantity)) {
    document.getElementById("error-message").textContent =
      "Please fill in all required fields";
    document.getElementById("form-error").classList.remove("hidden");
    return;
  }

  if (price < 0) {
    document.getElementById("error-message").textContent =
      "Price cannot be negative";
    document.getElementById("form-error").classList.remove("hidden");
    return;
  }

  if (quantity < 0) {
    document.getElementById("error-message").textContent =
      "Quantity cannot be negative";
    document.getElementById("form-error").classList.remove("hidden");
    return;
  }

  // Check if SKU already exists (for new products)
  if (!currentProduct && mockProducts.some((product) => product.sku === sku)) {
    document.getElementById("error-message").textContent = "SKU already exists";
    document.getElementById("form-error").classList.remove("hidden");
    return;
  }

  // Check if SKU already exists (for edited products)
  if (
    currentProduct &&
    mockProducts.some(
      (product) => product.sku === sku && product.id !== currentProduct.id
    )
  ) {
    document.getElementById("error-message").textContent = "SKU already exists";
    document.getElementById("form-error").classList.remove("hidden");
    return;
  }

  if (currentProduct) {
    // Update existing product
    const updatedProduct = {
      ...currentProduct,
      name,
      description,
      sku,
      price,
      quantity,
    };

    // Update products array
    mockProducts = mockProducts.map((product) =>
      product.id === currentProduct.id ? updatedProduct : product
    );

    // Show success message
    showToast("Product Updated", `${name} has been updated`, "success");
  } else {
    // Create new product
    const newProduct = {
      id:
        mockProducts.length > 0
          ? Math.max(...mockProducts.map((p) => p.id)) + 1
          : 1,
      name,
      description,
      sku,
      price,
      quantity,
      image: "../assets/images/placeholder.png",
    };

    // Add to products array
    mockProducts.push(newProduct);

    // Show success message
    showToast(
      "Product Added",
      `${name} has been added to inventory`,
      "success"
    );
  }

  // Save to localStorage
  setLocalStorage("products", mockProducts);

  // Hide modal
  document.getElementById("product-modal").classList.add("hidden");

  // Reload products
  loadProducts();
}

// Mock functions for checkAuth and debounce
function checkAuth() {
  // Replace with your actual authentication logic
  return true; // Assume user is always authenticated for this example
}

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// Initialize inventory page when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Check if user is authenticated
  if (!checkAuth()) return;

  // Load products
  loadProducts();

  // Add event listener to search input
  const searchInput = document.getElementById("inventory-search");
  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce(() => {
        loadProducts();
      }, 300)
    );
  }

  // Add event listener to add product button
  const addProductBtn = document.getElementById("add-product-btn");
  if (addProductBtn) {
    addProductBtn.addEventListener("click", handleAddProduct);
  }

  // Add event listener to product form
  const productForm = document.getElementById("product-form");
  if (productForm) {
    productForm.addEventListener("submit", handleProductFormSubmit);
  }

  // Add event listener to modal cancel button
  const modalCancelBtn = document.getElementById("modal-cancel");
  if (modalCancelBtn) {
    modalCancelBtn.addEventListener("click", () => {
      document.getElementById("product-modal").classList.add("hidden");
    });
  }

  // Add event listener to modal backdrop
  const modalBackdrop = document.getElementById("modal-backdrop");
  if (modalBackdrop) {
    modalBackdrop.addEventListener("click", () => {
      document.getElementById("product-modal").classList.add("hidden");
    });
  }

  // Add event listener to delete cancel button
  const deleteCancelBtn = document.getElementById("delete-cancel");
  if (deleteCancelBtn) {
    deleteCancelBtn.addEventListener("click", () => {
      document.getElementById("delete-modal").classList.add("hidden");
    });
  }

  // Add event listener to delete confirm button
  const deleteConfirmBtn = document.getElementById("delete-confirm");
  if (deleteConfirmBtn) {
    deleteConfirmBtn.addEventListener("click", handleDeleteConfirmation);
  }

  // Add event listener to delete modal backdrop
  const deleteModalBackdrop = document.getElementById("delete-modal-backdrop");
  if (deleteModalBackdrop) {
    deleteModalBackdrop.addEventListener("click", () => {
      document.getElementById("delete-modal").classList.add("hidden");
    });
  }

  // Handle tab switching
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Remove active class from all buttons
      tabButtons.forEach((btn) => {
        btn.classList.remove("active", "border-primary", "text-primary");
        btn.classList.add("text-gray-500");
      });

      // Add active class to clicked button
      button.classList.add("active", "border-primary", "text-primary");
      button.classList.remove("text-gray-500");

      // Hide all tab contents
      tabContents.forEach((content) => {
        content.classList.add("hidden");
      });

      // Show the selected tab content
      const contentId = button.id.replace("tab-", "") + "-content";
      document.getElementById(contentId).classList.remove("hidden");
    });
  });
});
