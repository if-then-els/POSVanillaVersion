// notificationWidget.js

// Self-executing anonymous function to encapsulate the code
// This prevents variables from polluting the global scope.
(function () {
  // Global counter for notification IDs (for demonstration purposes)
  let notificationIdCounter = 0;

  /**
   * Creates and appends the notification icon and details panel to the document body.
   * It also injects the necessary CSS and sets up event listeners.
   */
  function createNotificationWidget() {
    // --- Create Notification Icon Element ---
    // This div will serve as the clickable/hoverable icon.
    const notificationIcon = document.createElement("div");
    notificationIcon.id = "notification-icon";
    // Using an SVG for a bell/notification icon.
    notificationIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" d="M5.25 9a6.75 6.75 0 0 1 13.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 0 1-.029 1.053A8.518 8.518 0 0 1 12 20.25a8.518 8.518 0 0 1-9.339-4.947.75.75 0 0 1-.03-1.053A6.75 6.75 0 0 1 5.25 9V9Z" clip-rule="evenodd" />
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v.5a.75.75 0 0 0 1.5 0v-.5Zm3.5 0a.75.75 0 0 0-1.5 0v.5a.75.75 0 0 0 1.5 0v-.5Zm-4.5 9.5a.75.75 0 0 0-.75.75v.5a.75.75 0 0 0 .75.75h.5a.75.75 0 0 0 .75-.75v-.5a.75.75 0 0 0-.75-.75h-.5Zm3.5 0a.75.75 0 0 0-.75.75v.5a.75.75 0 0 0 .75.75h.5a.75.75 0 0 0 .75-.75v-.5a.75.75 0 0 0-.75-.75h-.5Z" />
            </svg>
            <span id="notification-badge" class="badge"></span>
        `;

    // --- Create Details Panel Element ---
    // This div will contain the list of notifications.
    const notificationPanel = document.createElement("div");
    notificationPanel.id = "notification-panel";
    notificationPanel.innerHTML = `
            <div class="panel-header">Notifications</div>
            <div class="panel-content">
                <ul id="notification-list">
                    <!-- Notifications will be dynamically inserted here -->
                </ul>
                <p id="no-notifications-message" style="text-align: center; color: #666; padding: 10px; display: none;">No new notifications.</p>
                <div id="loading-indicator" style="text-align: center; padding: 10px; display: none;">
                    <div class="spinner"></div>
                    <p>Generating summary...</p>
                </div>
            </div>
            <div class="panel-footer">
                <button id="generate-update-button" class="gemini-button">Generate App Update Summary ✨</button>
                <button id="mark-all-read-button">Mark All as Read</button>
            </div>
        `;

    // --- Append Elements to Body ---
    // Add the icon and panel to the end of the document body.
    document.body.appendChild(notificationIcon);
    document.body.appendChild(notificationPanel);

    // --- Inject CSS Styles ---
    // Create a <style> element and append it to the document head.
    // This ensures all necessary styles are applied when the script runs.
    const style = document.createElement("style");
    style.innerHTML = `
            /* General styling for 'Inter' font, assuming it's available or loaded elsewhere */
            body {
                font-family: 'Inter', sans-serif;
            }

            /* Notification Icon Styling */
            #notification-icon {
                position: fixed; /* Fixed position relative to the viewport */
                top: 20px;       /* 20px from the top */
                right: 20px;     /* 20px from the right */
                width: 36px;     /* Smaller fixed width for the circular icon */
                height: 36px;    /* Smaller fixed height for the circular icon */
                background-color: #4F46E5; /* Indigo 600 */
                color: white;    /* White icon color */
                border-radius: 50%; /* Makes it perfectly circular */
                display: flex;   /* Use flexbox for centering the SVG icon */
                align-items: center; /* Center vertically */
                justify-content: center; /* Center horizontally */
                cursor: pointer; /* Indicate it's clickable */
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); /* Subtle shadow */
                transition: transform 0.2s ease-in-out, background-color 0.2s ease-in-out; /* Smooth transitions */
                z-index: 1000; /* Ensure it's on top of other content */
                position: relative; /* Needed for badge positioning */
            }

            #notification-icon:hover {
                background-color: #4338CA; /* Darker Indigo 700 on hover */
                transform: scale(1.05); /* Slightly enlarge on hover */
            }

            #notification-icon svg {
                width: 20px;  /* Smaller size of the SVG icon inside the circle */
                height: 20px;
            }

            /* Notification Badge Styling */
            #notification-badge {
                position: absolute;
                top: -5px;      /* Position above the icon */
                right: -5px;    /* Position to the right of the icon */
                background-color: #EF4444; /* Red for new notifications */
                color: white;
                border-radius: 50%;
                width: 18px;    /* Size of the badge */
                height: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.7em; /* Smaller font for count */
                font-weight: bold;
                border: 2px solid white; /* White border to stand out */
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                display: none; /* Hidden by default, shown when count > 0 */
            }

            /* Notification Panel Styling */
            #notification-panel {
                position: fixed; /* Fixed position relative to the viewport */
                top: 60px;       /* Position below the icon (36px icon + 4px spacing + 20px top offset of icon) */
                right: 20px;     /* Align with the right edge of the icon */
                width: 320px;    /* Fixed width for the panel */
                max-height: 400px; /* Max height to allow scrolling for many notifications */
                background-color: #ffffff; /* White background */
                border-radius: 8px; /* Rounded corners for the panel */
                box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05); /* Prominent shadow */
                display: none;   /* Hidden by default, will be changed to 'flex' by JS */
                flex-direction: column; /* Stack content vertically */
                overflow: hidden; /* Ensures rounded corners apply to content */
                z-index: 999;    /* Below the icon but above most other content */
                transform: translateY(-10px); /* Initial slight upward offset for slide-down animation */
                opacity: 0;      /* Initial opacity for fade-in animation */
                transition: transform 0.3s ease-out, opacity 0.3s ease-out; /* Smooth animation */
            }

            #notification-panel.show {
                display: flex; /* When 'show' class is added, display as flex */
                transform: translateY(0); /* Slide down to original position */
                opacity: 1; /* Fade in */
            }

            .panel-header {
                background-color: #6366F1; /* Indigo 500 - header background */
                color: white;    /* White text for header */
                padding: 15px 20px; /* Padding inside header */
                font-size: 1.1em; /* Larger font size for header */
                font-weight: bold; /* Bold text for header */
                border-top-left-radius: 8px; /* Match panel's top-left corner */
                border-top-right-radius: 8px; /* Match panel's top-right corner */
            }

            .panel-content {
                padding: 10px 20px; /* Padding for the main content area */
                color: #333; /* Dark grey text color */
                overflow-y: auto; /* Enable scrolling if content overflows */
                flex-grow: 1; /* Allows content to take available space */
            }

            #notification-list {
                list-style: none; /* Remove default list bullets */
                padding: 0;
                margin: 0;
            }

            #notification-list li {
                padding: 10px 0;
                border-bottom: 1px solid #eee; /* Separator between notifications */
                font-size: 0.95em;
                line-height: 1.4;
                color: #444;
            }

            #notification-list li:last-child {
                border-bottom: none; /* No border for the last item */
            }

            #notification-list li.unread {
                font-weight: bold;
                background-color: #f9f9ff; /* Light blue background for unread */
                border-radius: 4px;
                padding-left: 10px;
                margin-left: -10px; /* Adjust padding for visual alignment */
            }

            #notification-list li.unread::before {
                content: '•'; /* Dot indicator for unread */
                color: #EF4444; /* Red dot */
                font-size: 1.5em;
                line-height: 1;
                margin-right: 8px;
                vertical-align: middle;
            }


            .panel-footer {
                padding: 10px 20px; /* Padding for the footer area */
                border-top: 1px solid #eee; /* Light border above the footer */
                text-align: right; /* Align button to the right */
                background-color: #f9f9f9; /* Light background for footer */
                border-bottom-left-radius: 8px; /* Match panel's bottom-left corner */
                border-bottom-right-radius: 8px; /* Match panel's bottom-right corner */
                display: flex; /* Use flexbox for buttons */
                justify-content: space-between; /* Space out buttons */
                gap: 10px; /* Gap between buttons */
                flex-wrap: wrap; /* Allow buttons to wrap on smaller screens */
            }

            #mark-all-read-button, .gemini-button {
                background-color: #6B7280; /* Gray 500 - for button */
                color: white;    /* White text for button */
                padding: 8px 15px; /* Padding inside button */
                border: none;    /* No border */
                border-radius: 5px; /* Slightly rounded corners for button */
                cursor: pointer; /* Indicate clickable */
                font-size: 0.9em; /* Slightly smaller font for button */
                transition: background-color 0.2s ease-in-out; /* Smooth transition */
                flex-grow: 1; /* Allow buttons to grow and fill space */
                min-width: 120px; /* Minimum width for buttons */
            }

            #mark-all-read-button:hover {
                background-color: #4B5563; /* Darker Gray 600 on hover */
            }

            .gemini-button {
                background-color: #10B981; /* Green 500 for Gemini feature */
            }

            .gemini-button:hover {
                background-color: #059669; /* Darker Green 600 on hover */
            }

            /* Loading Spinner */
            .spinner {
                border: 4px solid rgba(0, 0, 0, 0.1);
                border-left-color: #6366F1;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                animation: spin 1s linear infinite;
                margin: 0 auto 10px auto; /* Center spinner and add margin below */
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            /* Responsive adjustments for smaller screens (e.g., mobile) */
            @media (max-width: 768px) {
                #notification-icon {
                    top: 15px; /* Slightly less top padding */
                    right: 15px; /* Slightly less right padding */
                    width: 32px; /* Even smaller icon size */
                    height: 32px;
                }
                #notification-icon svg {
                    width: 18px; /* Even smaller SVG icon */
                    height: 18px;
                }
                #notification-badge {
                    width: 16px;
                    height: 16px;
                    font-size: 0.65em;
                }
                #notification-panel {
                    top: 55px; /* Adjust top position based on smaller icon */
                    right: 15px; /* Align with new icon right position */
                    width: calc(100% - 30px); /* Full width minus 15px padding on each side */
                    max-width: 300px; /* Max width to prevent it from being too wide on tablets */
                }
                .panel-footer {
                    flex-direction: column; /* Stack buttons vertically on small screens */
                }
            }
        `;
    document.head.appendChild(style); // Append the style element to the <head>

    // --- Event Listeners ---
    let panelTimeout; // This variable will hold the timeout ID for hiding the panel
    const notificationList = document.getElementById("notification-list");
    const noNotificationsMessage = document.getElementById(
      "no-notifications-message"
    );
    const notificationBadge = document.getElementById("notification-badge");
    const loadingIndicator = document.getElementById("loading-indicator");
    const generateUpdateButton = document.getElementById(
      "generate-update-button"
    );

    let currentNotifications = []; // Array to hold notification data

    /**
     * Shows the notification panel. Clears any pending hide timeouts.
     */
    const showPanel = () => {
      clearTimeout(panelTimeout); // Stop any pending hide operations
      notificationPanel.classList.add("show"); // Add 'show' class to make it visible and animate
    };

    /**
     * Hides the notification panel after a short delay.
     * This delay allows the user to move the mouse from the icon to the panel without it disappearing immediately.
     */
    const hidePanel = () => {
      panelTimeout = setTimeout(() => {
        notificationPanel.classList.remove("show"); // Remove 'show' class to hide and animate
      }, 300); // 300ms delay
    };

    // Toggle panel visibility on icon click
    notificationIcon.addEventListener("click", (event) => {
      event.stopPropagation(); // Prevent the click from bubbling up to the document and immediately closing the panel
      if (notificationPanel.classList.contains("show")) {
        notificationPanel.classList.remove("show"); // If visible, hide it
      } else {
        showPanel(); // If hidden, show it
      }
    });

    // Show panel when mouse enters the icon area
    notificationIcon.addEventListener("mouseenter", showPanel);
    // Hide panel when mouse leaves the icon area (with a delay)
    notificationIcon.addEventListener("mouseleave", hidePanel);

    // Keep panel open when mouse enters the panel itself
    notificationPanel.addEventListener("mouseenter", showPanel);
    // Hide panel when mouse leaves the panel area (with a delay)
    notificationPanel.addEventListener("mouseleave", hidePanel);

    // Hide panel when clicking anywhere else on the document
    document.addEventListener("click", (event) => {
      // Check if the click target is neither the icon nor inside the panel
      if (
        !notificationIcon.contains(event.target) &&
        !notificationPanel.contains(event.target)
      ) {
        notificationPanel.classList.remove("show"); // Hide the panel
      }
    });

    /**
     * Renders the notifications in the panel.
     */
    function renderNotifications() {
      notificationList.innerHTML = ""; // Clear existing notifications
      const unreadCount = currentNotifications.filter((n) => !n.read).length;

      if (currentNotifications.length === 0) {
        noNotificationsMessage.style.display = "block";
        notificationBadge.style.display = "none";
      } else {
        noNotificationsMessage.style.display = "none";
        currentNotifications.forEach((notification) => {
          const listItem = document.createElement("li");
          listItem.textContent = notification.message;
          if (!notification.read) {
            listItem.classList.add("unread");
          }
          notificationList.appendChild(listItem);
        });

        if (unreadCount > 0) {
          notificationBadge.textContent = unreadCount;
          notificationBadge.style.display = "flex"; // Show the badge
        } else {
          notificationBadge.style.display = "none"; // Hide the badge
        }
      }
    }

    // --- Handle Mark All as Read Button Click ---
    document
      .getElementById("mark-all-read-button")
      .addEventListener("click", () => {
        currentNotifications.forEach((n) => (n.read = true)); // Mark all as read
        renderNotifications(); // Re-render to update UI
        console.log("All notifications marked as read!");
        // In a real app, you might send this update to a server.
      });

    // --- Handle Generate App Update Summary Button Click (Gemini API Integration) ---
    generateUpdateButton.addEventListener("click", async () => {
      loadingIndicator.style.display = "block"; // Show loading spinner
      generateUpdateButton.disabled = true; // Disable button during generation
      generateUpdateButton.textContent = "Generating..."; // Change button text

      try {
        const prompt =
          "Generate a concise, engaging, and positive summary for a new app update. Focus on 2-3 new features or improvements. Keep it under 100 words.";
        let chatHistory = [];
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });

        const payload = { contents: chatHistory };
        const apiKey = ""; // Canvas will provide this at runtime if empty
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (
          result.candidates &&
          result.candidates.length > 0 &&
          result.candidates[0].content &&
          result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0
        ) {
          const generatedText = result.candidates[0].content.parts[0].text;

          // Add the generated text as a new notification
          const newNotification = {
            id: ++notificationIdCounter,
            message: `✨ App Update: ${generatedText}`,
            read: false,
          };
          currentNotifications.unshift(newNotification); // Add to the beginning
          renderNotifications(); // Update the UI
          showPanel(); // Ensure panel is visible to show new notification
        } else {
          console.error("Gemini API response structure unexpected:", result);
          // Add a fallback notification if generation fails
          const errorNotification = {
            id: ++notificationIdCounter,
            message: "Failed to generate update summary. Please try again.",
            read: false,
          };
          currentNotifications.unshift(errorNotification);
          renderNotifications();
        }
      } catch (error) {
        console.error("Error calling Gemini API:", error);
        // Add an error notification
        const errorNotification = {
          id: ++notificationIdCounter,
          message: `Error generating update: ${
            error.message || "Network error"
          }`,
          read: false,
        };
        currentNotifications.unshift(errorNotification);
        renderNotifications();
      } finally {
        loadingIndicator.style.display = "none"; // Hide loading spinner
        generateUpdateButton.disabled = false; // Re-enable button
        generateUpdateButton.textContent = "Generate App Update Summary ✨"; // Reset button text
      }
    });

    // --- Public Function to Update Notifications ---
    // This function can be called from your HTML or other scripts to update the displayed notifications.
    // Example: window.updateNotifications([{ message: 'New app update available!', read: false }]);
    window.updateNotifications = function (notificationsArray) {
      currentNotifications = notificationsArray;
      renderNotifications();
    };

    // Expose currentNotifications for external manipulation (for the HTML example)
    window.currentNotifications = currentNotifications;

    // --- Initialize the Widget When DOM is Ready ---
    // This ensures the script runs only after the HTML elements are available.
    if (document.readyState === "loading") {
      // If the DOM is not yet loaded, wait for the 'DOMContentLoaded' event.
      document.addEventListener("DOMContentLoaded", createNotificationWidget);
    } else {
      // If the DOM is already loaded (e.g., script placed at the end of <body>), run immediately.
      createNotificationWidget();
    }

    // Initial render with any pre-existing notifications (if any are set before DOMContentLoaded)
    renderNotifications();
  }
})();
