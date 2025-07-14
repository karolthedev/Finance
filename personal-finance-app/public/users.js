const form = document.getElementById("userForm");
const userList = document.getElementById("userList");

async function fetchUsers() {
  try {
    const res = await fetch("/users");
    const users = await res.json();
    userList.innerHTML = "";

    users.forEach(user => {
      const li = document.createElement("li");
      li.textContent = `${user.name} (${user.email})`;
      userList.appendChild(li);
    });
  } catch (err) {
    console.error("Failed to fetch users:", err);
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;

  try {
    const res = await fetch("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email })
    });

    const data = await res.json();

    if (res.ok) {
      form.reset();
      fetchUsers();
    } else {
      alert(data.error || "Failed to add user");
    }
  } catch (err) {
    console.error("Create user failed:", err);
  }
});

fetchUsers();
