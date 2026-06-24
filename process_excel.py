import pandas as pd
import json
import sys

def process_excel(file_path):
    print("Cargando el archivo Excel...")
    try:
        df = pd.read_excel(file_path, sheet_name='Detallado', dtype={'Número Documento Cliente': str})
    except Exception as e:
        print(f"Error al leer el archivo Excel: {e}")
        print("Asegúrate de tener instalada la librería openpyxl: pip install pandas openpyxl")
        sys.exit(1)
        
    print("Procesando datos...")
    
    # Asegurarnos de que el DNI es string para evitar problemas de formato
    if 'Número Documento Cliente' not in df.columns:
        print("Error: La columna 'Número Documento Cliente' no existe en el archivo Excel.")
        sys.exit(1)
        
    df['Número Documento Cliente'] = df['Número Documento Cliente'].fillna('').astype(str).str.strip()
    
    # Remover '.0' si pandas lo leyó como float
    df['Número Documento Cliente'] = df['Número Documento Cliente'].apply(lambda x: x.replace('.0', '') if x.endswith('.0') else x)
    
    # Rellenar con 0s a la izquierda para asegurar 8 dígitos si es menor
    df['Número Documento Cliente'] = df['Número Documento Cliente'].apply(lambda x: x.zfill(8) if x and x.lower() != 'nan' else x)
    
    # Agrupar por DNI
    grouped = df.groupby('Número Documento Cliente')
    
    compras_por_cliente = {}
    
    for dni, group in grouped:
        if not dni or dni.lower() == 'nan':
            continue
            
        # Convertir cada fila del grupo a un diccionario
        records = group.to_dict(orient='records')
        
        # Limpiar NaN o NaT
        cleaned_records = []
        for record in records:
            clean_rec = {}
            for k, v in record.items():
                if pd.isna(v):
                    clean_rec[k] = None
                else:
                    if isinstance(v, pd.Timestamp):
                        clean_rec[k] = v.strftime('%Y-%m-%d %H:%M:%S')
                    else:
                        clean_rec[k] = v
            cleaned_records.append(clean_rec)
            
        compras_por_cliente[dni] = cleaned_records
        
    print(f"Se procesaron {len(compras_por_cliente)} clientes únicos.")
    
    with open('compras.json', 'w', encoding='utf-8') as f:
        json.dump(compras_por_cliente, f, ensure_ascii=False, indent=2)
        
    print("Archivo compras.json generado exitosamente.")

if __name__ == "__main__":
    file_name = 'Ventas GRUPO ALDA 2022.xlsx'
    if len(sys.argv) > 1:
        file_name = sys.argv[1]
    process_excel(file_name)
