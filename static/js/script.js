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
    const imageUrl = document.getElementById('recipe-image-url').value; // Novo campo

    const recipeData = {
        name: name,
        description: description,
        ingredients: ingredients,
        steps: steps,
        image: imageUrl // Inclui a URL da imagem
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
            loadRecipes();
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
                    ${recipe.image ? `<img src="${recipe.image}" alt="Imagem da Receita" class="recipe-card-img" style="width:100%;max-height:180px;object-fit:cover;border-radius:8px 8px 0 0;">` : ''}
                    <h3>${recipe.name}</h3>     
                    <p>${recipe.description.replace(/\n/g, '<br>')}</p>
                    <button class="edit-button" onclick="editRecipe(${recipe.id})">Editar</button>
                    <button class="remove-button" onclick="deleteRecipe(${recipe.id})">Excluir</button>
                `;
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


function editRecipe(recipeId) {
    window.location.href = `/editar_receita/${recipeId}`; // Redireciona para a página de edição
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
        <p><strong>Descrição:</strong>${recipe.description.replace(/\n/g, '<br>')}</p>
        <p><strong>Ingredientes:</strong><br>${recipe.ingredients.replace(/\n/g, '<br>')}</p>
        <p><strong>Modo de Preparo:</strong><br>${recipe.steps.replace(/\n/g, '<br>')}</p>
        <h4>Informações Nutricionais Totais:</h4>
        <p><strong>Calorias:</strong> ${recipe.total_calories} kcal</p>
        <p><strong>Proteínas:</strong> ${recipe.total_proteins} g</p>
        <p><strong>Carboidratos:</strong> ${recipe.total_carbs} g</p>
    `;
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
                throw new Error(`Erro ao carregar informações da conta: ${response.statusText}`);
            }
            return response.json();
        })
        .then(accountInfo => {
            console.log('Dados recebidos:', accountInfo);
            if (accountInfo.error) {
                console.error(accountInfo.error);
                return;
            }
            document.getElementById('account-name').textContent = accountInfo.name || 'Nome não encontrado';
            document.getElementById('account-email').textContent = accountInfo.email || 'Email não encontrado';
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

    const ingredient = document.getElementById('ingredient').value.trim();
    const quantity = parseFloat(document.getElementById('quantity').value);

    if (!ingredient || isNaN(quantity) || quantity <= 0) {
        alert('Por favor, insira um ingrediente válido e uma quantidade maior que zero.');
        return;
    }

    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '<p>Calculando...</p>';

    try {
        const nutritionData = await fetchNutritionDataWithQuantity(ingredient, quantity); // Usando quantidade real
        if (nutritionData) {
            displayNutritionResults(nutritionData);
        }
    } catch (error) {
        resultDiv.innerHTML = `<p>Erro ao calcular: ${error.message}</p>`;
    }
}


async function fetchNutritionDataWithQuantity(ingredient, quantity) {
    const response = await fetch('/calcular_nutricional', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ingrediente: ingredient, quantidade: quantity }) // Envia a quantidade real
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


document.getElementById('recipe-image-url').addEventListener('input', function () {
    const url = this.value;
    const img = document.getElementById('recipe-image-preview');
    const removeBtn = document.getElementById('remove-image');
    if (url) {
        img.src = url;
        img.style.display = 'block';
        removeBtn.style.display = 'block';
    } else {
        img.src = '';
        img.style.display = 'none';
        removeBtn.style.display = 'none';
    }
});

document.getElementById('remove-image').addEventListener('click', function () {
    document.getElementById('recipe-image-url').value = '';
    document.getElementById('recipe-image-preview').src = '';
    document.getElementById('recipe-image-preview').style.display = 'none';
    this.style.display = 'none';
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



// Lista para armazenar os ingredientes adicionados e suas informações nutricionais
let addedIngredients = [];
let totalCalories = 0;
let totalProteins = 0;
let totalCarbs = 0;

// Função para adicionar um ingrediente ao calculation-card
async function addIngredient() {
    const ingredient = document.getElementById('ingredient').value.trim();
    const quantity = parseFloat(document.getElementById('quantity').value);

    if (!ingredient || isNaN(quantity) || quantity <= 0) {
        alert('Por favor, insira um ingrediente válido e uma quantidade maior que zero.');
        return;
    }

    const nutritionData = await fetchNutritionDataBase(ingredient); // Usando 100g como base
    if (!nutritionData) {
        alert('Erro ao buscar dados nutricionais.');
        return;
    }

    // Cálculos ajustados com a quantidade inserida
    const quantityFactor = quantity / 100;

    addedIngredients.push({
        ingredient,
        quantity,
        calories: nutritionData.calorias * quantityFactor,
        proteins: nutritionData.proteinas * quantityFactor,
        carbs: nutritionData.carboidratos * quantityFactor
    });

    updateCalculationCards();
    updateTotalNutrition();

    // Limpa os campos do formulário
    document.getElementById('ingredient').value = '';
    document.getElementById('quantity').value = '';
}


// Função para atualizar o container dos calculation-cards
function updateCalculationCards() {
    const cardsContainer = document.getElementById('calculation-cards');
    cardsContainer.innerHTML = ''; // Limpa o container

    addedIngredients.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'calculation-card';
        card.innerHTML = `
            <p><strong>Ingrediente:</strong> ${item.ingredient}</p>
            <p><strong>Quantidade:</strong> ${item.quantity} g</p>
            <p><strong>Calorias:</strong> ${item.calories.toFixed(2)} kcal</p>
            <p><strong>Proteínas:</strong> ${item.proteins.toFixed(2)} g</p>
            <p><strong>Carboidratos:</strong> ${item.carbs.toFixed(2)} g</p>
            <button onclick="removeIngredient(${index})">Remover</button>
        `;
        cardsContainer.appendChild(card);
    });
}

// Função para calcular os totais de calorias, proteínas e carboidratos
function updateTotalNutrition() {
    totalCalories = addedIngredients.reduce((total, item) => total + item.calories, 0);
    totalProteins = addedIngredients.reduce((total, item) => total + item.proteins, 0);
    totalCarbs = addedIngredients.reduce((total, item) => total + item.carbs, 0);

    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
        <h3>Totais Nutricionais:</h3>
        <p><strong>Calorias:</strong> ${totalCalories.toFixed(2)} kcal</p>
        <p><strong>Proteínas:</strong> ${totalProteins.toFixed(2)} g</p>
        <p><strong>Carboidratos:</strong> ${totalCarbs.toFixed(2)} g</p>
    `;
}

// Função para remover um ingrediente do card
function removeIngredient(index) {
    addedIngredients.splice(index, 1); // Remove o item da lista
    updateCalculationCards(); // Atualiza os cards
    updateTotalNutrition(); // Atualiza os totais
}

// Função para buscar dados nutricionais de um ingrediente
// Para cálculos fixos com base em 100g
async function fetchNutritionDataBase(ingredient) {
    try {
        const response = await fetch('/calcular_nutricional', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ingrediente: ingredient, quantidade: 100 }) // Envia a quantidade base de 100g
        });

        if (!response.ok) {
            throw new Error('Erro ao buscar dados nutricionais');
        }

        return await response.json();
    } catch (error) {
        console.error(error.message);
        return null;
    }
}


// Função para criar a receita a partir dos ingredientes adicionados
function createRecipeFromIngredients() {
    if (addedIngredients.length === 0) {
        alert('Você precisa adicionar pelo menos um ingrediente antes de criar a receita!');
        return;
    }

    // Redireciona para a aba de adicionar receita
    showSection('compartilhar-receitas');

    // Preenche a lista de ingredientes no formulário de adicionar receita
    const ingredientsList = document.getElementById('recipe-ingredients');
    ingredientsList.value = ''; // Limpa o campo antes de adicionar os ingredientes

    addedIngredients.forEach(item => {
        ingredientsList.value += `${item.quantity}g ${item.ingredient}\n`;
    });
}

