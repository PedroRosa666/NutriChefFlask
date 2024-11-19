from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import mysql.connector

app = Flask(__name__)
app.secret_key = 'senha'  # Substitua por uma chave segura e secreta


def connect_db():

    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="pedro027",
        database="nutrichef"
    )


@app.route('/')
def home():
    if 'username' in session:
        return render_template('home.html')
    return redirect(url_for('login'))


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        db = connect_db()
        cursor = db.cursor(dictionary=True)
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

        cursor.execute('INSERT INTO users (name, email, username, password) VALUES (%s, %s, %s, %s)',
                    (name, email, username, password))
        db.commit()
        db.close()

        session['username'] = username
        return redirect(url_for('home'))

    return render_template('cadastro.html')


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

        cursor.execute('INSERT INTO recipes (name, description, ingredients, steps, user_id) VALUES (%s, %s, %s, %s, %s)',
            (name, description, ingredients, steps, session['user_id']))
        db.commit()
        db.close()

        return jsonify({'message': 'Receita adicionada com sucesso!'}), 200
    except Exception as e:
        print(f'Erro ao adicionar a receita: {e}')
        return jsonify({'error': 'Erro ao adicionar a receita'}), 500


@app.route('/get_recipes', methods=['GET'])
def get_recipes():
    if 'username' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401

    try:
        db = connect_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute('SELECT * FROM recipes')
        recipes = cursor.fetchall()
        db.close()
        return jsonify(recipes), 200
    except Exception as e:
        print(f'Erro ao obter as receitas: {e}')
        return jsonify({'error': 'Erro ao obter as receitas'}), 500
    
    
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


@app.route('/editar_receita/<int:recipe_id>', methods=['GET', 'POST'])
def editar_receita(recipe_id):
    if 'username' not in session:
        return redirect(url_for('login'))

    db = connect_db()
    cursor = db.cursor(dictionary=True)

    # Buscando a receita para editar
    cursor.execute('SELECT * FROM recipes WHERE id = %s AND user_id = %s', (recipe_id, session['user_id']))
    recipe = cursor.fetchone()

    if not recipe:
        db.close()
        return 'Receita não encontrada ou você não tem permissão para editá-la.', 404

    if request.method == 'POST':
        # Recebendo os dados do formulário
        name = request.form['name']
        description = request.form['description']
        ingredients = request.form['ingredients']
        steps = request.form['steps']

        # Atualizando os dados da receita no banco
        cursor.execute('UPDATE recipes SET name = %s, description = %s, ingredients = %s, steps = %s WHERE id = %s',
                    (name, description, ingredients, steps, recipe_id))
        db.commit()
        db.close()

        return redirect(url_for('home'))  # Redireciona de volta para a home após editar

    db.close()
    return render_template('editar_receita.html', recipe=recipe, user_id=session['user_id'])

# Rota para buscar ingredientes do banco de dados
@app.route('/buscar_ingredientes', methods=['GET'])
def buscar_ingredientes():
    try:
        db = connect_db()
        cursor = db.cursor()
        cursor.execute("SELECT nome FROM ingredient")  # Certifique-se que a tabela de ingredientes tenha uma coluna 'nome'
        ingredients = [row[0] for row in cursor.fetchall()]
        cursor.close()
        db.close()
        return jsonify(ingredients)
    except Exception as e:
        print(f"Erro ao buscar ingredientes: {e}")
        return jsonify({'error': 'Erro ao buscar dados nutricionais'}), 500


# Colocar nessa região o /get_account_info
@app.route('/get_account_info', methods=['GET'])
def get_account_info():
    if 'username' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401

    try:
        db = connect_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute('SELECT name, email FROM users WHERE id = %s', (session['user_id'],))
        user = cursor.fetchone()
        db.close()

        if not user:
            return jsonify({'error': 'Informações da conta não encontradas'}), 404

        return jsonify(user), 200
    except Exception as e:
        print(f'Erro ao obter as informações da conta: {e}')
        return jsonify({'error': 'Erro ao obter as informações da conta'}), 500
    
    
@app.route('/calcular_nutricional', methods=['POST'])
def calcular_nutricional():
    if 'username' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401

    data = request.get_json()
    ingrediente_nome = data.get('ingrediente')
    quantidade = data.get('quantidade')

    # Verificação de campos obrigatórios
    if not ingrediente_nome or not quantidade:
        return jsonify({'error': 'Ingrediente e quantidade são obrigatórios'}), 400

    try:
        quantidade = float(quantidade)

        # Verificação de quantidade válida
        if quantidade <= 0:
            return jsonify({'error': 'A quantidade deve ser maior que zero'}), 400

        db = connect_db()
        cursor = db.cursor(dictionary=True)

        # Buscar o ingrediente no banco de dados pelo nome
        cursor.execute('SELECT * FROM ingredient WHERE nome = %s', (ingrediente_nome,))
        ingrediente = cursor.fetchone()

        if ingrediente:
            quantidade_base = ingrediente.get('quantidade_base', 100)  # Usando 100g como padrão, se não houver valor
            
            # Verifica se a quantidade base é válida
            if quantidade_base <= 0:
                return jsonify({'error': 'Quantidade base inválida para o ingrediente'}), 500

            fator = quantidade / quantidade_base

            # Certifica que os valores são válidos e numéricos, senão usa 0
            calorias = ingrediente.get('calorias', 0) * fator
            proteinas = ingrediente.get('proteinas', 0) * fator
            carboidratos = ingrediente.get('carboidratos', 0) * fator

            resultado = {
                'calorias': round(calorias, 2),
                'proteinas': round(proteinas, 2),
                'carboidratos': round(carboidratos, 2),
            }
        else:
            resultado = {'error': 'Ingrediente não encontrado'}

        cursor.close()
        db.close()

        return jsonify(resultado)
    except ValueError:
        return jsonify({'error': 'Quantidade inválida'}), 400
    except Exception as e:
        print(f'Erro ao calcular valores nutricionais: {e}')
        return jsonify({'error': 'Erro ao calcular os valores nutricionais'}), 500


@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('login'))


if __name__ == '__main__':
    app.run(debug=True)
