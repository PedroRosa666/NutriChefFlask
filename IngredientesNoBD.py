import pandas as pd
import psycopg2


# Conectar ao PostgreSQL
def connect_db():
    return psycopg2.connect(
        host="localhost",
        database="NutriChefDB",
        user="postgres",
        password="pedro027"
    )

    
db = connect_db()
cursor = db.cursor()

# Ler o Excel apenas com as colunas que você quer
df = pd.read_excel('Dados_Nutricionais.xlsx', usecols=["Nome", "Categoria", "Calorias", "Proteinas", "Carboidratos"])

# Substituir valores NaN por valores padrão
df.fillna({'Nome': '', 'Categoria': '', 'Calorias': 0, 'Proteinas': 0, 'Carboidratos': 0}, inplace=True)

# Verificar os nomes das colunas
print(df.columns)  # Verificar se as colunas estão corretas

# Inserir dados no PostgreSQL
for index, row in df.iterrows():
    nome = row.get('Nome')
    categoria = row.get('Categoria')
    calorias = row.get('Calorias')
    proteinas = row.get('Proteinas')
    carboidratos = row.get('Carboidratos')
    
    # Imprimir os valores antes de inserir para depuração
    print(f"Inserindo: Nome={nome}, Categoria={categoria}, Calorias={calorias}, Proteinas={proteinas}, Carboidratos={carboidratos}")
    
    # Verificar se todos os valores estão presentes
    if None not in (nome, categoria, calorias, proteinas, carboidratos):
        cursor.execute(
            """
            INSERT INTO ingredient (nome, categoria, calorias, proteinas, carboidratos, quantidade_base)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (nome, categoria, calorias, proteinas, carboidratos, 100)  # quantidade_base definido como 100
        )

# Confirmar alterações no banco de dados
db.commit()

# Fechar cursor e conexão
cursor.close()
db.close()
