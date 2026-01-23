/**
 * Inventory management functionality for POS System
 */

// Current product being edited
let currentProduct = null;
// Global variable to hold products fetched from backend
let products = [];

// --- Helper functions for localStorage ---
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

// --- Helper function to format currency ---
function formatCurrency(number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "KES", // Kenya Shillings
  }).format(number);
}

// --- Helper function to show toast messages ---
function showToast(title, message, type = "success") {
  // Implement your toast notification logic here.
  // This is a placeholder. You'll likely use a library or custom implementation.
  console.log(`Toast: ${type} - ${title}: ${message}`);
  // Example using a simple alert (replace with your actual toast implementation):
  alert(`${title}: ${message}`);
}

// --- Load products data from backend and render tables ---
async function loadProducts() {
  try {
    const response = await fetch("/getInventory", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    const data = await response.json();
    if (data && data.products) {
      products = data.products.map((item) => ({
        _id: item._id,
        productName: item.productName || item.name,
        productBatchNumber: item.productBatchNumber || item.sku,
        productPrice: item.productPrice ?? item.price,
        productQuantity: item.productQuantity ?? item.quantity,
        productDescription: item.productDescription || item.description,
        productCategory: item.productCategory || "",
      }));
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
              <input type="checkbox" class="product-checkbox" data-id="${
                product._id
              }" />
            </td>
            <td class="px-6 py-4">${product.productName}</td>
            <td class="px-6 py-4">${product.productBatchNumber}</td>
            <td class="px-6 py-4">${formatCurrency(product.productPrice)}</td>
            <td class="px-6 py-4 ${
              product.productQuantity < 10 ? "text-red-500 font-medium" : ""
            }">${product.productQuantity}</td>
            <td class="px-6 py-4">
              <div class="flex space-x-2">
                <button class="edit-product-btn p-1 rounded-md text-gray-500 hover:bg-gray-100" data-id="${
                  product._id
                }" title="Edit">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="delete-product-btn p-1 rounded-md text-red-500 hover:bg-red-50" data-id="${
                  product._id
                }" title="Delete">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `
        )
        .join("");
    }
  }

  // Render low stock products table
  const lowStockTable = document.getElementById("low-stock-table");
  if (lowStockTable) {
    if (lowStockProducts.length === 0) {
      lowStockTable.innerHTML = `
        <tr>
          <td colspan="5" class="px-6 py-4 text-center text-gray-500">No low stock products found</td>
        </tr>
      `;
    } else {
      lowStockTable.innerHTML = lowStockProducts
        .map(
          (product) => `
          <tr class="hover:bg-gray-50">
            <td class="px-6 py-4">${product.productName}</td>
            <td class="px-6 py-4">${product.productBatchNumber}</td>
            <td class="px-6 py-4">${formatCurrency(product.productPrice)}</td>
            <td class="px-6 py-4 text-red-500 font-medium">${
              product.productQuantity
            }</td>
            <td class="px-6 py-4">
              <div class="flex space-x-2">
                <button class="edit-product-btn p-1 rounded-md text-gray-500 hover:bg-gray-100" data-id="${
                  product._id
                }" title="Edit" >
                  <i class="fas fa-edit"></i>
                </button>
                <button class="delete-product-btn p-1 rounded-md text-red-500 hover:bg-red-50" data-id="${
                  product._id
                }" title="Delete" >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `
        )
        .join("");
    }
  }
}

// --- Event delegation handler for product tables ---
function handleProductTableClick(event) {
  const target = event.target.closest("button"); // Get the closest button ancestor

  if (!target) return; // Not a button click

  if (target.classList.contains("edit-product-btn")) {
    handleEditProduct(target); // Pass the button element itself
  } else if (target.classList.contains("delete-product-btn")) {
    handleDeleteProduct(target); // Pass the button element itself
  }
}

// --- Handle add product button click ---
function handleAddProduct() {
  // Reset form
  document.getElementById("product-form").reset();
  document.getElementById("form-error").classList.add("hidden");
  document.getElementById("form-error").textContent = ""; // Clear previous error messages

  // Set modal title
  document.getElementById("modal-title").textContent = "Add Product";
  // Clear current product
  currentProduct = null;
  // Show modal
  document.getElementById("product-modal").classList.remove("hidden");
}

// --- Handle edit product button click ---
function handleEditProduct(buttonElement) {
  const productId = buttonElement.dataset.id;
  currentProduct = products.find((product) => product._id === productId);

  if (currentProduct) {
    document.getElementById("product-name").value = currentProduct.productName;
    document.getElementById("product-description").value =
      currentProduct.productDescription;
    document.getElementById("product-sku").value =
      currentProduct.productBatchNumber;
    document.getElementById("product-price").value =
      currentProduct.productPrice;
    document.getElementById("product-quantity").value =
      currentProduct.productQuantity;
    document.getElementById("product-category").value =
      currentProduct.productCategory || "";

    document.getElementById("modal-title").textContent = "Edit Product";
    document.getElementById("form-error").classList.add("hidden");
    document.getElementById("form-error").textContent = ""; // Clear previous error messages

    document.getElementById("product-modal").classList.remove("hidden");
  }
}

// --- Handle delete product button click ---
function handleDeleteProduct(buttonElement) {
  const productId = buttonElement.dataset.id;
  currentProduct = products.find((product) => product._id === productId);

  if (currentProduct) {
    document.getElementById(
      "delete-confirmation-text"
    ).textContent = `Are you sure you want to delete "${currentProduct.productName}"? This action cannot be undone.`;
    document.getElementById("delete-modal").classList.remove("hidden");
  }
}

// --- Handle delete confirmation ---
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
        loadProducts(); // Reload products after deletion
      } else {
        showToast("Error", data.message || "Failed to delete product", "error");
      }
    } catch (error) {
      showToast(
        "Error",
        "Failed to delete product due to a network error.",
        "error"
      );
      console.error("Delete product error:", error);
    }
  }
}

// --- Handle product form submission ---
async function handleProductFormSubmit(event) {
  event.preventDefault();

  // Get form values
  const productData = {
    productName: document.getElementById("product-name").value.trim(),
    productDescription: document
      .getElementById("product-description")
      .value.trim(),
    productBatchNumber: document.getElementById("product-sku").value.trim(),
    productPrice: Number.parseFloat(
      document.getElementById("product-price").value
    ),
    productQuantity: Number.parseInt(
      document.getElementById("product-quantity").value
    ),
    productCategory: document.getElementById("product-category").value.trim(),
  };

  // Client-side Validation
  const formError = document.getElementById("form-error");
  formError.classList.add("hidden"); // Hide previous errors
  formError.textContent = "";

  if (!productData.productName) {
    formError.textContent = "Product Name is required.";
    formError.classList.remove("hidden");
    showToast("Validation Error", "Product Name is required.", "error");
    return;
  }
  if (!productData.productBatchNumber) {
    formError.textContent = "Product Batch Number (SKU) is required.";
    formError.classList.remove("hidden");
    showToast(
      "Validation Error",
      "Product Batch Number (SKU) is required.",
      "error"
    );
    return;
  }
  if (isNaN(productData.productPrice) || productData.productPrice <= 0) {
    formError.textContent = "Price must be a positive number.";
    formError.classList.remove("hidden");
    showToast("Validation Error", "Price must be a positive number.", "error");
    return;
  }
  if (isNaN(productData.productQuantity) || productData.productQuantity < 0) {
    formError.textContent = "Quantity must be a non-negative integer.";
    formError.classList.remove("hidden");
    showToast(
      "Validation Error",
      "Quantity must be a non-negative integer.",
      "error"
    );
    return;
  }

  try {
    let response, data;
    if (currentProduct && currentProduct._id) {
      // Edit
      response = await fetch(`/updateInventory/${currentProduct._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });
      data = await response.json();

      if (response.ok) {
        showToast(
          "Product Updated",
          `${productData.productName} has been updated`,
          "success"
        );
      } else {
        showToast("Error", data.message || "Failed to update product", "error");
        return; // Stop if update fails
      }
    } else {
      // Add product

      response = await fetch("/addInventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });
      data = await response.json();

      if (response.ok) {
        showToast(
          "Product Added",
          `${productData.productName} has been added to inventory`,
          "success"
        );
      } else {
        showToast("Error", data.message || "Failed to add product", "error");
        return; // Stop if add fails
      }
    }

    document.getElementById("product-modal").classList.add("hidden");
    loadProducts(); // Reload products after successful add/edit
  } catch (error) {
    showToast(
      "Error",
      "An unexpected error occurred during product saving.",
      "error"
    );
    console.error("Product form submission error:", error);
  }
}

//authenticate Token
async function checkAuth() {
  try {
    const response = await fetch("/verifyAuth", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },

      credentials: "include",
    });

    if (response.ok) {
      console.log("User is authenticated.");
      return true;
    } else {
      const errorData = await response.json();
      console.warn(
        "Authentication failed:",
        errorData.message || response.statusText
      );

      window.location.href = "/login.html";
      return false;
    }
  } catch (error) {
    console.error("Error during authentication check:", error);
    showToast(
      "Authentication Error",
      "Could not verify login status. Please try again.",
      "error"
    );

    window.location.href = "/login.html";
    return false;
  }
}

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// --- Initialize inventory page when DOM is loaded ---
document.addEventListener("DOMContentLoaded", () => {
  // Check if user is authenticated
  if (!checkAuth()) {
    // Optionally display a message or redirect if not authenticated
    showToast(
      "Authentication Required",
      "Please log in to view inventory.",
      "info"
    );
    return;
  }

  // Load products initially
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

  // Add event listener to product table for event delegation
  const productsTableBody = document.getElementById("products-table");
  if (productsTableBody) {
    productsTableBody.addEventListener("click", handleProductTableClick);
  }
  const lowStockTableBody = document.getElementById("low-stock-table");
  if (lowStockTableBody) {
    lowStockTableBody.addEventListener("click", handleProductTableClick);
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

  // --- Handle tab switching ---
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

  // --- Bulk delete functionality ---
  document.getElementById("bulk-delete-btn")?.addEventListener("click", () => {
    const selectedIds = Array.from(
      document.querySelectorAll(".product-checkbox:checked")
    ).map((cb) => cb.dataset.id);

    if (selectedIds.length === 0) {
      return showToast(
        "No products selected",
        "Please select products to delete.",
        "info"
      );
    }

    if (
      !confirm(
        "Are you sure you want to delete the selected products? This action cannot be undone."
      )
    ) {
      return;
    }

    fetch("/bulkDelete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ids: selectedIds,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          showToast(
            "Products Deleted",
            "Selected products have been removed from inventory.",
            "success"
          );
          loadProducts(); // Reload products after bulk deletion
        } else {
          showToast(
            "Error",
            data.message || "Failed to delete products.",
            "error"
          );
        }
      })
      .catch((error) => {
        showToast(
          "Error",
          "Failed to delete products due to a network error.",
          "error"
        );
        console.error("Bulk delete error:", error);
      });
  });

  document
    .getElementById("select-all-checkbox")
    ?.addEventListener("change", function () {
      const checked = this.checked;
      document.querySelectorAll(".product-checkbox").forEach((cb) => {
        cb.checked = checked;
      });
    });

  // --- Upload CSV ---
  document.getElementById("upload-csv-btn")?.addEventListener("click", () => {
    const fileInput = document.getElementById("inventory-file-input");
    fileInput.accept = ".csv";
    fileInput.onchange = async function () {
      if (fileInput.files.length > 0) {
        await uploadInventoryFile(fileInput.files[0], "csv");
        fileInput.value = ""; // Clear the file input
      }
    };
    fileInput.click();
  });

  // --- Upload Excel ---
  document.getElementById("upload-excel-btn")?.addEventListener("click", () => {
    const fileInput = document.getElementById("inventory-file-input");
    fileInput.accept = ".xlsx";
    fileInput.onchange = async function () {
      if (fileInput.files.length > 0) {
        await uploadInventoryFile(fileInput.files[0], "excel");
        fileInput.value = ""; // Clear the file input
      }
    };
    fileInput.click();
  });
});

// --- Helper function to upload inventory file ---
async function uploadInventoryFile(file, type) {
  const formData = new FormData();
  if (type === "csv") {
    formData.append("file", file);
  } else if (type === "excel") {
    formData.append("productFile", file);
  } else {
    showToast("Error", "Unsupported file type selected.", "error");
    return;
  }

  try {
    const url = type === "csv" ? "/uploadStockByCsv" : "/uploadStockByExcel";
    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (response.ok) {
      showToast(
        "Success",
        data.message || "Inventory uploaded successfully!",
        "success"
      );
      loadProducts(); // Reload products after upload
    } else {
      showToast(
        "Error",
        data.message || "Failed to upload inventory.",
        "error"
      );
    }
  } catch (error) {
    showToast(
      "Error",
      "Failed to upload inventory due to a network error.",
      "error"
    );
    console.error("Upload inventory file error:", error);
  }
}

// --- Function to export inventory ---
function exportInventory(type) {
  let url = "";
  if (type === "csv") url = "/export/csv";
  else if (type === "excel") url = "/export/excel";
  else if (type === "pdf") url = "/downloadInventory";
  else {
    showToast("Error", "Unsupported export type.", "error");
    return;
  }
  window.open(url, "_blank");
}