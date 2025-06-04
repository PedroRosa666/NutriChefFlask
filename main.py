from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__)
app.secret_key = 'senha'  # Substitua por uma chave segura e secreta


# Função para conectar ao banco de dados PostgreSQL
def connect_db():
    return psycopg2.connect(
        host="localhost",
        user="postgres",
        password="pedro027",
        database="NutriChefBD"
    )


# Rota para a página inicial
@app.route('/')
def home():
    if 'username' in session:
        return render_template('home.html')
    return redirect(url_for('login'))


# Rota de login
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
         # Usuário admin fixo
        if username == 'admin' and password == 'admin123':
            session['username'] = 'admin'
            session['user_id'] = 0  # ID fictício para admin
            return redirect(url_for('home'))

        db = connect_db()
        cursor = db.cursor(cursor_factory=RealDictCursor)
        cursor.execute('SELECT * FROM users WHERE username = %s AND password = %s', (username, password))
        user = cursor.fetchone()
        db.close()

        if user:
            session['username'] = username
            session['user_id'] = user['id']
            return redirect(url_for('home'))
        else:
            return 'Usuário ou senha incorretos', 401
    return render_template('login.html')


# Rota de cadastro de novos usuários
@app.route('/cadastro', methods=['GET', 'POST'])
def cadastro():
    if request.method == 'POST':
        name = request.form['name']
        email = request.form['email']
        username = request.form['username']
        password = request.form['password']
        confirm_password = request.form['confirm-password']

        if password != confirm_password:
            return 'As senhas não coincidem', 400

        db = connect_db()
        cursor = db.cursor()
        cursor.execute('SELECT * FROM users WHERE username = %s', (username,))
        existing_user = cursor.fetchone()

        if existing_user:
            db.close()
            return 'Usuário já existe', 400

        cursor.execute(
            'INSERT INTO users (name, email, username, password) VALUES (%s, %s, %s, %s)',
            (name, email, username, password)
        )
        db.commit()
        db.close()

        session['username'] = username
        return redirect(url_for('home'))

    return render_template('cadastro.html')


# Rota para adicionar receitas
@app.route('/add_recipe', methods=['POST'])
def add_recipe():
    if 'username' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401

    recipe_data = request.get_json()
    name = recipe_data['name']
    description = recipe_data['description']
    ingredients = recipe_data['ingredients']
    steps = recipe_data['steps']

    try:
        db = connect_db()
        cursor = db.cursor()
        cursor.execute(
            'INSERT INTO recipes (name, description, ingredients, steps, user_id) VALUES (%s, %s, %s, %s, %s)',
            (name, description, ingredients, steps, session['user_id'])
        )
        db.commit()
        db.close()

        return jsonify({'message': 'Receita adicionada com sucesso!'}), 200
    except Exception as e:
        print(f'Erro ao adicionar a receita: {e}')
        return jsonify({'error': 'Erro ao adicionar a receita'}), 500


# Rota para buscar receitas
@app.route('/get_recipes', methods=['GET'])
def get_recipes():
    if 'username' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401

    try:
        db = connect_db()
        cursor = db.cursor(cursor_factory=RealDictCursor)

        # Busca todas as receitas do banco de dados
        cursor.execute('SELECT * FROM recipes')
        recipes = cursor.fetchall()

        # Adiciona os totais nutricionais calculados para cada receita
        for recipe in recipes:
            ingredients_list = recipe['ingredients'].split('\n')  # Ingredientes formatados como "Nome: Quantidade"
            total_calories, total_proteins, total_carbs = 0, 0, 0

            for ingredient_entry in ingredients_list:
                try:
                    name, quantity = ingredient_entry.split(':')
                    quantity = float(quantity.strip().replace('g', '').strip())

                    # Busca os dados nutricionais do ingrediente
                    cursor.execute('SELECT calorias, proteinas, carboidratos FROM ingredient WHERE nome = %s', (name.strip(),))
                    ingredient_data = cursor.fetchone()

                    if ingredient_data:
                        total_calories += ingredient_data['calorias'] * (quantity / 100)
                        total_proteins += ingredient_data['proteinas'] * (quantity / 100)
                        total_carbs += ingredient_data['carboidratos'] * (quantity / 100)
                except:
                    continue  # Ignorar erros no parsing de ingredientes

            recipe['total_calories'] = round(total_calories, 2)
            recipe['total_proteins'] = round(total_proteins, 2)
            recipe['total_carbs'] = round(total_carbs, 2)

        cursor.close()
        db.close()
        return jsonify(recipes), 200

    except Exception as e:
        print(f'Erro ao obter as receitas: {e}')
        return jsonify({'error': 'Erro ao obter as receitas'}), 500


# Rota para deletar receita
@app.route('/delete_recipe/<int:recipe_id>', methods=['DELETE'])
def delete_recipe(recipe_id):
    if 'username' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401

    try:
        db = connect_db()
        cursor = db.cursor()
        cursor.execute('DELETE FROM recipes WHERE id = %s AND user_id = %s', (recipe_id, session['user_id']))
        db.commit()
        db.close()

        if cursor.rowcount == 0:
            return jsonify({'error': 'Receita não encontrada ou sem permissão para excluir'}), 404

        return jsonify({'message': 'Receita excluída com sucesso!'}), 200
    except Exception as e:
        print(f'Erro ao excluir a receita: {e}')
        return jsonify({'error': 'Erro ao excluir a receita'}), 500


# Rota para editar receita
@app.route('/editar_receita/<int:recipe_id>', methods=['GET', 'POST'])
def editar_receita(recipe_id):
    if 'username' not in session:
        return redirect(url_for('login'))

    db = connect_db()
    cursor = db.cursor(cursor_factory=RealDictCursor)

    cursor.execute('SELECT * FROM recipes WHERE id = %s AND user_id = %s', (recipe_id, session['user_id']))
    recipe = cursor.fetchone()

    if not recipe:
        db.close()
        return 'Receita não encontrada ou você não tem permissão para editá-la.', 404

    if request.method == 'POST':
        name = request.form['name']
        description = request.form['description']
        ingredients = request.form['ingredients']
        steps = request.form['steps']

        cursor.execute(
            'UPDATE recipes SET name = %s, description = %s, ingredients = %s, steps = %s WHERE id = %s',
            (name, description, ingredients, steps, recipe_id)
        )
        db.commit()
        db.close()

        return redirect(url_for('home'))

    db.close()
    return render_template('editar_receita.html', recipe=recipe)


# Rota para buscar ingredientes
@app.route('/buscar_ingredientes', methods=['GET'])
def buscar_ingredientes():
    try:
        db = connect_db()
        cursor = db.cursor()
        cursor.execute("SELECT nome FROM ingredient")
        ingredients = [row[0] for row in cursor.fetchall()]
        cursor.close()
        db.close()
        return jsonify(ingredients)
    except Exception as e:
        print(f"Erro ao buscar ingredientes: {e}")
        return jsonify({'error': 'Erro ao buscar dados nutricionais'}), 500
    

@app.route('/get_account_info', methods=['GET'])
def get_account_info():
    if 'username' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401

    try:
        # Conexão com o banco de dados
        db = connect_db()
        cursor = db.cursor(cursor_factory=RealDictCursor)  # RealDictCursor para retornar resultados como dicionários

        # Consulta no banco de dados
        cursor.execute('SELECT name, email FROM users WHERE id = %s', (session.get('user_id'),))
        user = cursor.fetchone()

        # Fechar cursor e conexão
        cursor.close()
        db.close()

        if not user:
            return jsonify({'error': 'Informações da conta não encontradas'}), 404

        # Retorna o resultado como JSON
        return jsonify(user), 200

    except psycopg2.Error as e:
        print(f'Erro no banco de dados: {e}')
        return jsonify({'error': 'Erro ao obter as informações da conta'}), 500

    except Exception as e:
        print(f'Erro inesperado: {e}')
        return jsonify({'error': 'Erro inesperado ao processar a solicitação'}), 500


# Rota para calcular valores nutricionais
@app.route('/calcular_nutricional', methods=['POST'])
def calcular_nutricional():
    if 'username' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401

    try:
        # Extrair dados do JSON enviado pelo frontend
        data = request.get_json()
        print(f"Dados recebidos: {data}")  # Debug
        ingrediente_nome = data.get('ingrediente')
        quantidade = data.get('quantidade')

        # Verificar campos obrigatórios
        if not ingrediente_nome or not quantidade:
            print("Erro: Ingrediente ou quantidade ausentes.")  # Debug
            return jsonify({'error': 'Ingrediente e quantidade são obrigatórios'}), 400

        # Certificar que a quantidade é válida
        try:
            quantidade = float(quantidade)
        except ValueError:
            print("Erro: Quantidade não é um número.")  # Debug
            return jsonify({'error': 'Quantidade inválida. Deve ser um número.'}), 400

        if quantidade <= 0:
            print("Erro: Quantidade deve ser maior que zero.")  # Debug
            return jsonify({'error': 'A quantidade deve ser maior que zero'}), 400

        # Consultar o banco de dados para buscar informações do ingrediente
        db = connect_db()
        cursor = db.cursor(cursor_factory=RealDictCursor)
        cursor.execute('SELECT calorias, proteinas, carboidratos FROM ingredient WHERE nome = %s', (ingrediente_nome,))
        ingrediente = cursor.fetchone()

        if not ingrediente:
            print(f"Erro: Ingrediente '{ingrediente_nome}' não encontrado.")  # Debug
            return jsonify({'error': 'Ingrediente não encontrado no banco de dados'}), 404

        # Calcular os valores ajustados com base na quantidade informada
        quantidade_base = 100  # Base padrão de 100g
        fator = quantidade / quantidade_base
        calorias = ingrediente['calorias'] * fator
        proteinas = ingrediente['proteinas'] * fator
        carboidratos = ingrediente['carboidratos'] * fator

        resultado = {
            'calorias': round(calorias, 2),
            'proteinas': round(proteinas, 2),
            'carboidratos': round(carboidratos, 2),
        }
        print(f"Resultado calculado: {resultado}")  # Debug

        cursor.close()
        db.close()
        return jsonify(resultado), 200

    except Exception as e:
        print(f"Erro inesperado: {e}")  # Debug
        return jsonify({'error': 'Erro interno ao calcular os valores nutricionais'}), 500


# Rota para logout
@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('login'))


if __name__ == '__main__':
    app.run(debug=True)
