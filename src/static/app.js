document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const loginForm = document.getElementById("login-form");
  const messageDiv = document.getElementById("message");
  const authToggle = document.getElementById("auth-toggle");
  const loginModal = document.getElementById("login-modal");
  const closeModalButton = document.getElementById("close-modal");
  const authStatus = document.getElementById("auth-status");

  function isTeacherAuthenticated() {
    return document.cookie.split("; ").some((cookie) => cookie.startsWith("teacher_session="));
  }

  function updateAuthUI() {
    const authenticated = isTeacherAuthenticated();
    authStatus.textContent = authenticated
      ? "Teacher access: logged in"
      : "Teacher access: not logged in";
    authToggle.textContent = authenticated ? "🔓" : "👤";
    authToggle.setAttribute("aria-label", authenticated ? "Teacher logout" : "Teacher login");
  }

  function showMessage(text, type = "success") {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function openLoginModal() {
    loginModal.classList.remove("hidden");
  }

  function closeLoginModal() {
    loginModal.classList.add("hidden");
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const canManage = isTeacherAuthenticated();
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
                <h5>Participants:</h5>
                <ul class="participants-list">
                  ${details.participants
                    .map((email) => {
                      if (!canManage) {
                        return `<li><span class="participant-email">${email}</span></li>`;
                      }
                      return `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`;
                    })
                    .join("")}
                </ul>
              </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!isTeacherAuthenticated()) {
      showMessage("Please log in as a teacher to manage registrations.", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isTeacherAuthenticated()) {
      showMessage("Please log in as a teacher to manage registrations.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "POST" }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();

      if (response.ok) {
        updateAuthUI();
        closeLoginModal();
        loginForm.reset();
        fetchActivities();
        showMessage(result.message, "success");
      } else {
        showMessage(result.detail || "Invalid login", "error");
      }
    } catch (error) {
      showMessage("Unable to log in. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  authToggle.addEventListener("click", async () => {
    if (isTeacherAuthenticated()) {
      try {
        await fetch("/auth/logout", { method: "POST" });
        updateAuthUI();
        fetchActivities();
        showMessage("Logged out", "info");
      } catch (error) {
        console.error("Error logging out:", error);
      }
      return;
    }

    openLoginModal();
  });

  closeModalButton.addEventListener("click", closeLoginModal);
  loginModal.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      closeLoginModal();
    }
  });

  updateAuthUI();
  fetchActivities();
});
