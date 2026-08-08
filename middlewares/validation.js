const { z } = require('zod');

// ==========================================
// 1. ESQUEMA ESTRICTO PARA MOCK-LOGIN
// ==========================================
const loginSchema = z.object({
    identifier: z.string()
        .min(1, { message: 'El parámetro identifier es obligatorio y no puede estar vacío.' }),
    password: z.string()
        .min(1, { message: 'El parámetro password es obligatorio y no puede estar vacío.' })
}).strict({ message: 'No se permiten campos adicionales en el payload de login.' });

// ==========================================
// 2. ESQUEMA ESTRICTO PARA REGISTRO DE VENTA
// ==========================================
const ventaSchema = z.object({
    SKU_Producto_Final: z.string()
        .min(1, { message: 'El SKU_Producto_Final es obligatorio y no puede estar vacío.' })
        .regex(/^[a-zA-Z0-9-]+$/, { message: 'El SKU_Producto_Final debe ser un string alfanumérico (letras, números y guiones).' }),
    DNI_O_RUC_Comprador: z.string()
        .min(1, { message: 'El DNI_O_RUC_Comprador es obligatorio y no puede estar vacío.' })
        .regex(/^\d+$/, { message: 'El DNI_O_RUC_Comprador debe contener únicamente caracteres numéricos.' })
        .refine(val => val.length === 8 || val.length === 11, {
            message: 'El DNI_O_RUC_Comprador debe tener exactamente 8 caracteres (DNI) u 11 caracteres (RUC).'
        }),
    Nro_Comprobante_Pago: z.string()
        .min(1, { message: 'El Nro_Comprobante_Pago es obligatorio y no puede estar vacío.' })
        .regex(/^[BF][A-Z0-9]{3}-\d+$/, { message: 'El Nro_Comprobante_Pago debe cumplir con el formato de boleta/factura electrónica (ej: B001-00029384).' }),
    wallet_address_comprador: z.string()
        .regex(/^0x[0-9a-fA-F]{40}$/, { message: 'La wallet debe ser un formato EVM válido que inicie con 0x y contenga caracteres hexadecimales.' })
        .optional()
        .or(z.literal('')),
    xml_boleta: z.string()
        .min(1, { message: 'El xml_boleta es obligatorio y no puede estar vacío.' })
        .refine(val => val.trim().startsWith('<') && val.trim().includes('>'), {
            message: 'El xml_boleta debe tener una estructura XML obligatoria válida (iniciar con "<" y contener ">").'
        })
        .optional(),

    monto_total: z.number()
        .positive({ message: 'El monto_total debe ser un número positivo.' })
        .optional(),

    Hash_Comprobante_Pago: z.string()
        .length(66, { message: 'El Hash_Comprobante_Pago debe tener exactamente 66 caracteres de longitud.' })
        .regex(/^0x[0-9a-fA-F]{64}$/, { message: 'El Hash_Comprobante_Pago debe ser un formato de hash SHA-256 EVM válido que empiece con 0x.' })
        .optional(),

    id_tienda: z.string().optional()
}).strict({ message: 'No se permiten campos adicionales en el payload de registro de venta.' });

// ==========================================
// 3. MIDDLEWARE DE VALIDACIÓN PARA EXPRESS
// ==========================================
/**
 * Intercepta el cuerpo de la petición y lo valida contra un esquema Zod.
 * Retorna HTTP 400 Bad Request si la validación falla antes de procesar backend.
 * @param {z.ZodObject} schema Esquema Zod a validar
 */
const validateBody = (schema) => {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                error: 'Bad Request. Falla en validación de datos (Spec-Driven Validation).',
                details: (result.error.issues || []).map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }
        // Sobrescribir req.body con los datos sanitizados por Zod
        req.body = result.data;
        next();
    };
};

const crearProductoSchema = z.object({
    SKU_Producto_Final: z.string()
        .min(1, { message: 'El SKU_Producto_Final es obligatorio.' })
        .regex(/^[a-zA-Z0-9-]+$/, { message: 'El SKU_Producto_Final debe ser un string alfanumérico.' }),
    ID_Lote_Cuero_Utilizado: z.string()
        .min(1, { message: 'El ID_Lote_Cuero_Utilizado es obligatorio.' }),
    Foto_Producto: z.string().optional(),
    PDF_Certificado_Previo: z.string().optional(),
    Descripcion: z.string().optional(),
    Coleccion: z.string().optional(),
    Color: z.string().optional()
}).strict({ message: 'No se permiten campos adicionales en el payload de creación.' });

const registrarArtesanoSchema = z.object({
    RUC_Fabricante: z.string()
        .length(11, { message: 'El RUC_Fabricante debe tener exactamente 11 caracteres.' })
        .regex(/^\d+$/, { message: 'El RUC_Fabricante debe contener únicamente dígitos.' }),
    nombre_taller: z.string()
        .min(3, { message: 'El nombre del taller debe tener al menos 3 caracteres.' }),
    email: z.string()
        .email({ message: 'Debe ingresar un email con formato válido.' }),
    ubigeo: z.string()
        .length(6, { message: 'El ubigeo debe tener exactamente 6 caracteres.' })
        .regex(/^\d+$/, { message: 'El ubigeo debe contener únicamente dígitos.' })
}).strict({ message: 'No se permiten campos adicionales en el payload de registro de artesano.' });

const registrarClienteSchema = z.object({
    DNI_O_RUC_Comprador: z.string()
        .min(1, { message: 'El DNI_O_RUC_Comprador es obligatorio.' })
        .regex(/^\d+$/, { message: 'El DNI_O_RUC_Comprador debe contener únicamente caracteres numéricos.' })
        .refine(val => val.length === 8 || val.length === 11, {
            message: 'El DNI_O_RUC_Comprador debe tener exactamente 8 caracteres (DNI) u 11 caracteres (RUC).'
        }),
    nombre_completo: z.string()
        .min(3, { message: 'El nombre completo debe tener al menos 3 caracteres.' }),
    wallet_address: z.string()
        .length(42, { message: 'La dirección de wallet debe tener exactamente 42 caracteres de longitud.' })
        .regex(/^0x[0-9a-fA-F]{40}$/, { message: 'La wallet debe ser un formato EVM válido que inicie con 0x y contenga caracteres hexadecimales.' }),
    username: z.string()
        .min(3, { message: 'El username debe tener al menos 3 caracteres.' }),
    email: z.string()
        .email({ message: 'Debe ingresar un email con formato válido.' }),
    password: z.string()
        .min(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
}).strict({ message: 'No se permiten campos adicionales en el registro de cliente.' });

const transferenciaTiendaSchema = z.object({
    SKU_Producto_Final: z.string()
        .min(1, { message: 'El SKU_Producto_Final es obligatorio.' })
        .regex(/^[a-zA-Z0-9-]+$/, { message: 'El SKU_Producto_Final debe ser un string alfanumérico.' }),
    RUC_Tienda_Destino: z.string()
        .length(11, { message: 'El RUC_Tienda_Destino debe tener exactamente 11 caracteres.' })
        .regex(/^\d+$/, { message: 'El RUC_Tienda_Destino debe contener únicamente dígitos.' })
}).strict({ message: 'No se permiten campos adicionales en la transferencia.' });

module.exports = {
    validateBody,
    loginSchema,
    ventaSchema,
    crearProductoSchema,
    registrarArtesanoSchema,
    registrarClienteSchema,
    transferenciaTiendaSchema
};
