const users = {
    "superadmin": { password: "admin123", redirect: "index.html", type: "ALL" },
    "manager_kzo": { password: "kzo123", redirect: "clinic-admin.html", type: "DERMA_LASER" },
    "doctor_pedia": { password: "pedia123", redirect: "clinic-pediatrics.html", type: "PEDIATRICS" },
    "doctor_internal": { password: "internal123", redirect: "clinic-internal.html", type: "INTERNAL" },
    "doctor_dental": { password: "dental123", redirect: "clinic-dental.html", type: "DENTAL" },
    "doctor_lab": { password: "lab123", redirect: "clinic-lab.html", type: "LAB" }
};

function fillDemo(user, pass) {
    const usernameField = document.getElementById('usernameInput');
    const passwordField = document.getElementById('passwordInput');
    if (usernameField && passwordField) {
        usernameField.value = user;
        passwordField.value = pass;
    }
}

function handleLogin(event) {
    event.preventDefault();
    const user = document.getElementById('usernameInput').value.trim();
    const pass = document.getElementById('passwordInput').value;
    const account = users[user];

    if (account && account.password === pass) {
        localStorage.setItem('clinicType', JSON.stringify(account.type));
        window.location.href = account.redirect;
    } else {
        alert("⚠️ عذراً، اسم المستخدم أو كلمة المرور غير صحيحة!");
    }
}