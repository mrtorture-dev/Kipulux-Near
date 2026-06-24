import json
import sys
import os

JSON_PATH = os.path.join(os.path.dirname(__file__), 'compras.json')

def buscar_dni(dni):
    try:
        with open(JSON_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        return f"Error leyendo el archivo JSON: {e}"

    if dni not in data:
        return "No se encontraron compras para ese DNI."

    compras = data[dni]
    validas = [
        p for p in compras 
        if "envio" not in str(p.get("Item", "")).lower() 
        and "envío" not in str(p.get("Item", "")).lower()
        and "descuento" not in str(p.get("Item", "")).lower()
    ]

    if not validas:
        return "No se encontraron compras válidas (excluyendo envíos/descuentos)."

    nombre = validas[0].get('Nombre Cliente', 'Cliente')
    res = []
    res.append(f"Compras de {nombre}:")
    for idx, p in enumerate(validas, 1):
        item = p.get('Item', 'Producto sin nombre')
        moneda = p.get('Moneda', 'PEN')
        precio = p.get('Precio Unitario', 0)
        cantidad = p.get('Cantidad', 1)
        res.append(f"{idx}. {item} | Cantidad: {cantidad} | Precio Unitario: {moneda} {precio}")
        if "billetera" in item.lower() and "negro" in item.lower():
            res.append(f"Imagen del producto: https://alda.com.pe/wp-content/uploads/2025/07/Billetera-caballero_Mesa-de-trabajo-1-copia-18.png")

    return "\n".join(res)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python buscar_compras.py <DNI>")
    else:
        print(buscar_dni(sys.argv[1]))
