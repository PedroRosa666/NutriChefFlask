document.getElementById('loginForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const formData = new FormData(event.target);

    fetch('/login', {
        method: 'POST',
        body: formData,
    })
    .then(response => {
        if (response.ok) {
            window.location.href = '/';
        } else {
            response.text().then(text => alert(text));
        }
    })
    .catch(error => {
        console.error('Erro ao fazer login:', error);
    });
});
