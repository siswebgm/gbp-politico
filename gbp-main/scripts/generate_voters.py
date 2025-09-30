import csv
import random
from datetime import datetime, timedelta
from faker import Faker
import pandas as pd
import os

# Configurar o Faker para pt_BR
fake = Faker('pt_BR')

# Configurações
NUM_RECORDS = 20000
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(PROJECT_DIR, 'data')
os.makedirs(DATA_DIR, exist_ok=True)
OUTPUT_FILE = os.path.join(DATA_DIR, 'voters_simulation.csv')

# Listas de valores possíveis
GENEROS = ['M', 'F']
INDICADOS = [10, 12, 9]
CATEGORIAS = [12, 13, 14, 15]
UFS = ['PE']  # Pode expandir com outros estados se necessário
RESPONSAVEL = 'Josuel'
EMPRESA_ID = 1

# Função para gerar CPF válido
def generate_cpf():
    cpf = [random.randint(0, 9) for _ in range(9)]
    
    for _ in range(2):
        val = sum([(len(cpf) + 1 - i) * v for i, v in enumerate(cpf)]) % 11
        cpf.append(11 - val if val > 1 else 0)
    
    return ''.join(map(str, cpf))

# Função para gerar título de eleitor
def generate_titulo():
    return ''.join([str(random.randint(0, 9)) for _ in range(12)])

# Função para gerar dados de um eleitor
def generate_voter():
    # Gerar data de nascimento (entre 18 e 80 anos atrás)
    birth_date = fake.date_between(start_date='-80y', end_date='-18y')
    
    # Gerar coordenadas para Recife/PE
    lat = random.uniform(-8.05, -8.15)  # Latitude aproximada de Recife
    lon = random.uniform(-34.85, -34.95)  # Longitude aproximada de Recife

    return {
        'nome': fake.name(),
        'cpf': generate_cpf(),
        'nascimento': birth_date.strftime('%Y-%m-%d'),
        'whatsapp': f'819{random.randint(10000000, 99999999)}',
        'telefone': f'819{random.randint(10000000, 99999999)}',
        'genero': random.choice(GENEROS),
        'titulo': generate_titulo(),
        'zona': str(random.randint(1, 150)),
        'secao': str(random.randint(1, 500)),
        'cep': f'5{random.randint(0000000, 9999999):07d}',
        'logradouro': fake.street_name(),
        'cidade': 'Recife',
        'bairro': fake.neighborhood(),
        'numero': str(random.randint(1, 9999)),
        'complemento': random.choice(['', 'Apto 101', 'Casa A', 'Bloco B']),
        'empresa_id': EMPRESA_ID,
        'indicado': random.choice(INDICADOS),
        'uf': 'PE',
        'categoria': random.choice(CATEGORIAS),
        'responsavel': RESPONSAVEL,
        'latitude': f'{lat:.6f}',
        'longitude': f'{lon:.6f}'
    }

# Gerar dados
print("Gerando dados...")
voters = [generate_voter() for _ in range(NUM_RECORDS)]

# Criar DataFrame e salvar CSV
df = pd.DataFrame(voters)
df.to_csv(OUTPUT_FILE, index=False, encoding='utf-8')

print(f"Arquivo gerado com sucesso: {OUTPUT_FILE}")
print(f"Total de registros: {len(df)}")
