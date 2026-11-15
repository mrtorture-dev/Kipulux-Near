import pandas as pd
import openpyxl
import json
import random
import os

random.seed(2026)

NOMBRES = [
    "CARLOS EDUARDO", "MARIA ALEJANDRA", "DIEGO ALONSO", "VALERIA SOFIA",
    "SEBASTIAN IGNACIO", "LUCIA FERNANDA", "GABRIEL ENRIQUE", "ANDREA CAMILA",
    "RODRIGO ANDRES", "CLAUDIA VALENTINA", "MIGUEL ANGEL", "FIORELLA ISABEL",
    "ALONSO SEBASTIAN", "DANIELA PAOLA", "BRUNO NICOLAS", "CAROLINA BEATRIZ",
    "MATEO ALESSANDRO", "ALESSIA MILAGROS", "LEONARDO GABRIEL", "XIMENA ROSARIO"
]

APELLIDOS = [
    "MENDOZA CASTRO", "RAMIREZ CHAVEZ", "VELASQUEZ TORRES", "QUISPE MAMANI",
    "DELGADO RIVERA", "PAREDES MORALES", "HERRERA SILVA", "ALVAREZ VILCHEZ",
    "RODRIGUEZ PAZ", "CAMPOS VALENCIA", "SALAZAR GUZMAN", "NAVARRO ORTIZ",
    "CORDOVA BENITEZ", "GUTIERREZ BLANCO", "VARGAS LUNA", "CASTILLO MEJIA"
]

DIRECCIONES = [
    "Av. Los Conquistadores 450, Dpto 502",
    "Calle Las Begonias 320",
    "Av. Angamos Oeste 1240",
    "Calle Dos de Mayo 880",
    "Av. Primavera 650, Int. 301",
    "Jirón Huancavelica 210",
    "Av. El Sol 430",
    "Calle San Agustín 180"
]

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
EXCEL_PATH = os.path.join(BASE_DIR, 'Ventas GRUPO ALDA 2022.xlsx')
COMPRAS_JSON_PATH = os.path.join(BASE_DIR, 'compras.json')

OBSERVACIONES_SINTETICAS = [
    "Entregar en recepción",
    "Llamar al llegar",
    "Empaque de regalo estándar",
    "Entrega en horario de oficina"
]

def anonymize_data():
    print("Cargando hojas de Excel...")
    detallado = pd.read_excel(EXCEL_PATH, sheet_name='Detallado')
    comprobantes = pd.read_excel(EXCEL_PATH, sheet_name='Comprobantes')

    doc_col_det = [c for c in detallado.columns if 'mero Documento' in c][0]
    name_col_det = [c for c in detallado.columns if 'Nombre Cliente' in c][0]
    doc_col_comp = [c for c in comprobantes.columns if 'mero Documento' in c][0]
    name_col_comp = [c for c in comprobantes.columns if 'Nombre Cliente' in c][0]

    # Convertir explícitamente a tipo object/string para evitar conflicto con float
    detallado[doc_col_det] = detallado[doc_col_det].astype(object)
    detallado[name_col_det] = detallado[name_col_det].astype(object)
    comprobantes[doc_col_comp] = comprobantes[doc_col_comp].astype(object)
    comprobantes[name_col_comp] = comprobantes[name_col_comp].astype(object)

    for col in detallado.columns:
        if any(w in col.lower() for w in ['email', 'fono', 'telefono', 'tel', 'direcci', 'diecci', 'observac']):
            detallado[col] = detallado[col].astype(object)

    for col in comprobantes.columns:
        if any(w in col.lower() for w in ['email', 'fono', 'telefono', 'tel', 'direcci', 'diecci', 'observac']):
            comprobantes[col] = comprobantes[col].astype(object)

    all_dnis = set(detallado[doc_col_det].dropna().astype(str).str.replace('.0', '').str.strip().tolist())
    all_dnis.update(comprobantes[doc_col_comp].dropna().astype(str).str.replace('.0', '').str.strip().tolist())

    dni_mapping = {}
    base_dni = 71000000

    for idx, real_dni in enumerate(sorted(all_dnis)):
        if not real_dni or real_dni.lower() == 'nan':
            continue
        fake_dni = str(base_dni + idx * 7 + random.randint(1, 5)).zfill(8)
        fake_nombre = f"{random.choice(NOMBRES)} {random.choice(APELLIDOS)}"
        first_name = fake_nombre.split()[0].lower()
        last_name = fake_nombre.split()[2].lower()
        fake_email = f"{first_name}.{last_name}.{fake_dni[-4:]}@kipulux-client.pe"
        fake_phone = f"9{random.randint(10000000, 99999999)}"
        fake_dir = random.choice(DIRECCIONES)

        dni_mapping[real_dni] = {
            'dni': fake_dni,
            'nombre': fake_nombre,
            'email': fake_email,
            'phone': fake_phone,
            'direccion': fake_dir
        }

    print(f"Total clientes mapeados con identidades sintéticas: {len(dni_mapping)}")

    def sanitize_df(df, doc_col, name_col):
        for idx in range(len(df)):
            val = df.iloc[idx][doc_col]
            if pd.isna(val):
                continue
            key = str(val).replace('.0', '').strip()
            if key in dni_mapping:
                meta = dni_mapping[key]
                df.iloc[idx, df.columns.get_loc(doc_col)] = meta['dni']
                df.iloc[idx, df.columns.get_loc(name_col)] = meta['nombre']
                
                for col in df.columns:
                    col_lower = col.lower()
                    if 'email' in col_lower:
                        df.iloc[idx, df.columns.get_loc(col)] = meta['email']
                    elif any(w in col_lower for w in ['fono', 'telefono', 'tel']):
                        df.iloc[idx, df.columns.get_loc(col)] = meta['phone']
                    elif any(w in col_lower for w in ['direcci', 'diecci']):
                        df.iloc[idx, df.columns.get_loc(col)] = meta['direccion']
                    elif 'observac' in col_lower and not pd.isna(df.iloc[idx][col]):
                        df.iloc[idx, df.columns.get_loc(col)] = random.choice(OBSERVACIONES_SINTETICAS)
        return df

    detallado_anon = sanitize_df(detallado, doc_col_det, name_col_det)
    comprobantes_anon = sanitize_df(comprobantes, doc_col_comp, name_col_comp)

    with pd.ExcelWriter(EXCEL_PATH, engine='openpyxl') as writer:
        comprobantes_anon.to_excel(writer, sheet_name='Comprobantes', index=False)
        detallado_anon.to_excel(writer, sheet_name='Detallado', index=False)
    print("Excel 'Ventas GRUPO ALDA 2022.xlsx' reemplazado con data sintética.")

    print("Regenerando compras.json...")
    df_det = detallado_anon
    df_det[doc_col_det] = df_det[doc_col_det].fillna('').astype(str).str.strip().str.replace('.0', '')
    df_det[doc_col_det] = df_det[doc_col_det].apply(lambda x: x.zfill(8) if x and x.lower() != 'nan' else x)

    grouped = df_det.groupby(doc_col_det)
    compras_sinteticas = {}

    for dni, group in grouped:
        if not dni or dni.lower() == 'nan':
            continue
        records = group.to_dict(orient='records')
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
        compras_sinteticas[dni] = cleaned_records

    with open(COMPRAS_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(compras_sinteticas, f, ensure_ascii=False, indent=2)

    print(f"Archivo 'compras.json' actualizado con {len(compras_sinteticas)} clientes sintéticos.")

if __name__ == '__main__':
    anonymize_data()
