const userSelect = document.getElementById("userSelect");
const accountForm = document.getElementById("accountForm");
const accountList = document.getElementById("accountList");

async function fetchUsers() {
  const res = await fetch("/users");
  const users = await res.json();
  userSelect.innerHTML = '<option value="">Select User</option>';
  users.forEach(u => {
    const option = document.createElement("option");
    option.value = u.id;
    option.textContent = `${u.name} (${u.email})`;
    userSelect.appendChild(option);
  });
}

async function fetchAccounts() {
  const res = await fetch("/accounts");
  const accounts = await res.json();
  accountList.innerHTML = "";
  accounts.forEach(acc => {
    const li = document.createElement("li");
    li.textContent = `User ${acc.user_id} - ${acc.name} (${acc.type}, ${acc.currency})`;
    accountList.appendChild(li);
  });
}

accountForm.addEventListener("submit", async e => {
  e.preventDefault();

  const userId = userSelect.value;
  const name = document.getElementById("accountName").value;
  const type = document.getElementById("accountType").value;
  const currency = document.getElementById("currency").value;

  if (!userId) {
    alert("Please select a user");
    return;
  }

  const res = await fetch("/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, name, type, currency }),
  });

  const data = await res.json();

  if (res.ok) {
    accountForm.reset();
    fetchAccounts();
  } else {
    alert(data.error || "Failed to add account");
  }
});

fetchUsers();
fetchAccounts();
