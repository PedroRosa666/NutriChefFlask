document.addEventListener('DOMContentLoaded', () => {
    loadRecipes();  // Carregar receitas na inicialização
    showSection('receitas');  // Mostrar a seção de receitas
});

function showSection(sectionId) {
    document.querySelectorAll('section').forEach(section => {
        section.style.display = section.id === sectionId ? 'block' : 'none';
    });
}

function submitRecipe(event) {
    event.preventDefault();

    const name = document.getElementById('recipe-name').value;
    const description = document.getElementById('recipe-description').value;
    const ingredients = document.getElementById('recipe-ingredients').value;
    const steps = document.getElementById('recipe-steps').value;

    const recipeData = {
        name: name,
        description: description,
        ingredients: ingredients,
        steps: steps
    };

    fetch('/add_recipe', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(recipeData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                document.querySelector('.recipe-form').reset();
                loadRecipes();  // Recarrega as receitas para mostrar a nova adição
                showSection('receitas');
            } else {
                alert(data.error || 'Erro ao adicionar a receita.');
            }
        })
        .catch(error => {
            console.error('Erro ao adicionar a receita:', error);
            alert('Erro ao adicionar a receita.');
        });
}

function loadRecipes() {
    fetch('/get_recipes')
        .then(response => response.json())
        .then(recipes => {
            const recipeList = document.getElementById('recipe-list');
            recipeList.innerHTML = '';

            recipes.forEach(recipe => {
                const recipeCard = document.createElement('div');
                recipeCard.className = 'recipe-card';
                recipeCard.innerHTML = `
                    <h3>${recipe.name}</h3>
                    <p>${recipe.description}</p>
                    <button class="remove-button" onclick="deleteRecipe(${recipe.id})">Excluir</button>`;
                recipeCard.onclick = (event) => {
                    if (event.target.tagName !== 'BUTTON') {
                        showRecipeDetails(recipe);
                    }
                };
                recipeList.appendChild(recipeCard);
            });
        })
        .catch(error => console.error('Erro ao carregar receitas:', error));
}

function deleteRecipe(recipeId) {
    fetch(`/delete_recipe/${recipeId}`, {
        method: 'DELETE'
    })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                loadRecipes();  // Atualiza a lista de receitas
            } else {
                alert(data.error || 'Erro ao excluir a receita.');
            }
        })
        .catch(error => {
            console.error('Erro ao excluir a receita:', error);
            alert('Erro ao excluir a receita.');
        });
}

function showRecipeDetails(recipe) {
    const detailDiv = document.getElementById('recipe-detail');
    detailDiv.innerHTML = `
        <h3>${recipe.name}</h3>
        <p><strong>Descrição:</strong> ${recipe.description}</p>
        <p><strong>Ingredientes:</strong><br>${recipe.ingredients.replace(/\n/g, '<br>')}</p>
        <p><strong>Modo de Preparo:</strong><br>${recipe.steps.replace(/\n/g, '<br>')}</p>`;
    showSection('detalhes-receita');
}


function filterRecipes() {
    const searchInput = document.getElementById('search-input').value.toLowerCase();
    const recipes = document.querySelectorAll('.recipe-card');

    recipes.forEach(recipe => {
        const recipeName = recipe.querySelector('h3').textContent.toLowerCase();
        recipe.style.display = recipeName.includes(searchInput) ? 'block' : 'none';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadRecipes();
    showSection('receitas');
    loadAccountInfo();
});


function loadAccountInfo() {
    fetch('/get_account_info')
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao carregar informações da conta');
            }
            return response.json();
        })
        .then(accountInfo => {
            if (accountInfo.error) {
                console.error(accountInfo.error);
                return;
            }
            document.getElementById('account-name').textContent = accountInfo.name;
            document.getElementById('account-email').textContent = accountInfo.email;
        })
        .catch(error => console.error('Erro ao carregar informações da conta:', error));
}

// Chamando a função de carregar informações da conta quando a página é carregada
window.onload = function () {
    loadAccountInfo();
    loadRecipes();  // Certifique-se de que a função loadRecipes também é chamada
};


function logout() {
    // Lógica para deslogar o usuário
    alert('Logout realizado com sucesso!');
    window.location.href = '/login'; // Redireciona para a página de login
}


// Função para buscar os ingredientes enquanto o usuário digita
async function fetchIngredientSuggestions() {
    try {
        // Faz uma solicitação HTTP assíncrona para obter a lista de ingredientes do servidor
        const response = await fetch('/buscar_ingredientes');

        if (!response.ok) {
            // Se a solicitação falhar, lança uma exceção
            throw new Error('Erro ao buscar ingredientes');
        }

        // Se a solicitação for bem-sucedida, parseia o JSON retornado pelo servidor
        const ingredients = await response.json();

        // Continua com o restante do código...

        const ingredientInput = document.getElementById('ingredient');
        const suggestionBox = document.getElementById('suggestions');

        ingredientInput.addEventListener('input', function () {
            const inputValue = this.value.toLowerCase();
            const suggestions = ingredients.filter(ingredient =>
                ingredient.toLowerCase().includes(inputValue)
            );

            suggestionBox.innerHTML = ''; // Limpar a lista de sugestões

            if (inputValue !== '' && suggestions.length > 0) {
                suggestions.forEach(suggestion => {
                    const suggestionElement = document.createElement('div');
                    suggestionElement.textContent = suggestion;
                    suggestionElement.style.cursor = 'pointer'; // Estilo de cursor
                    suggestionElement.addEventListener('click', function () {
                        ingredientInput.value = suggestion; // Preencher o input com a sugestão
                        suggestionBox.innerHTML = ''; // Limpar a lista de sugestões
                    });
                    suggestionBox.appendChild(suggestionElement);
                });
            }
        });
    } catch (error) {
        console.error(error.message);  // Mostrar o erro no console
        alert('Erro ao buscar dados nutricionais. Por favor, tente novamente mais tarde.');
    }
}

// Chamar a função ao carregar a página
fetchIngredientSuggestions();


async function calculateNutrition(event) {
    event.preventDefault();

    const ingredient = document.getElementById('ingredient').value;
    const quantity = document.getElementById('quantity').value;

    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '<p>Calculando...</p>';

    try {
        // Enviar o ingrediente e a quantidade para o backend para calcular
        const nutritionData = await fetchNutritionData(ingredient, quantity);
        displayNutritionResults(nutritionData);
    } catch (error) {
        resultDiv.innerHTML = `<p>Erro ao calcular: ${error.message}</p>`;
    }
}

async function fetchNutritionData(ingredient, quantity) {
    const response = await fetch('/calcular_nutricional', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ingrediente: ingredient, quantidade: quantity })
    });

    if (!response.ok) {
        throw new Error('Erro ao buscar dados nutricionais');
    }

    return await response.json();
}

function displayNutritionResults(data) {
    const resultDiv = document.getElementById('result');
    if (data.error) {
        resultDiv.innerHTML = `<p>${data.error}</p>`;
    } else {
        resultDiv.innerHTML = `
            <p><strong>Calorias:</strong> ${data.calorias.toFixed(2)} kcal</p>
            <p><strong>Proteínas:</strong> ${data.proteinas.toFixed(2)} g</p>
            <p><strong>Carboidratos:</strong> ${data.carboidratos.toFixed(2)} g</p>
        `;
    }
}


// função para colocar a imagem na tela após a seleção
document.getElementById('image-upload').addEventListener('change', function (event) {
    const file = event.target.files[0]; // Pega o primeiro arquivo selecionado
    if (file) {
        const reader = new FileReader(); // Cria um novo FileReader
        reader.onload = function (e) {
            const imgElement = document.getElementById('recipe-image-preview');
            imgElement.src = e.target.result; // Define a fonte da imagem como o resultado do FileReader
            imgElement.style.display = 'block'; // Mostra a imagem

            // Mostra o botão de excluir imagem
            const removeButton = document.getElementById('remove-image');
            removeButton.style.display = 'block';
        }
        reader.readAsDataURL(file); // Lê o arquivo como URL de dados
    }
});

// Adiciona evento de clique para o botão de excluir imagem
document.getElementById('remove-image').addEventListener('click', function () {
    const imgElement = document.getElementById('recipe-image-preview');
    imgElement.src = ''; // Limpa a fonte da imagem
    imgElement.style.display = 'none'; // Esconde a imagem

    // Esconde o botão de excluir imagem
    this.style.display = 'none';

    // Limpa o campo de upload
    document.getElementById('image-upload').value = '';
});