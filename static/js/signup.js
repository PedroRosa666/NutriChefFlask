document.getElementById('signupForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const confirmFeedback = document.getElementById('confirm-feedback');

    if (password !== confirmPassword) {
        confirmFeedback.textContent = 'As senhas não coincidem.';
    } else {
        confirmFeedback.textContent = '';

        const formData = new FormData(event.target);

        fetch('/cadastro', {
            method: 'POST',
            body: formData,
        })
        .then(response => {
            if (response.ok) {
                alert('Cadastro realizado com sucesso!');
                window.location.href = '/login';
            } else {
                response.text().then(text => alert(text));
            }
        })
        .catch(error => {
            console.error('Erro ao realizar cadastro:', error);
        });
    }
});

// Validação de força da senha
document.getElementById('password').addEventListener('input', function() {
    const password = document.getElementById('password').value;
    const strengthBar = document.getElementById('password-strength');

    if (password.length > 0) {
        if (password.length < 6) {
            strengthBar.className = 'password-strength weak';
        } else if (password.length < 10) {
            strengthBar.className = 'password-strength medium';
        } else {
            strengthBar.className = 'password-strength strong';
        }
    } else {
        strengthBar.className = 'password-strength';
    }
});


document.getElementById('signupForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Impede o envio padrão do formulário
    // Você pode colocar a lógica de validação aqui, se necessário
    
    // Redireciona para a página de login
    window.location.href = "/login";
});

