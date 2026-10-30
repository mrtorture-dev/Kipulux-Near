use near_sdk::json_types::Base64VecU8;
use near_sdk::near;
use near_sdk::AccountId;

/// Identificador canónico del Token NFT (ej. "KIPU-CUERO-001")
pub type TokenId = String;

/// Máquina de Estados del Ciclo de Vida de la Prenda (Patrón State - Disoft)
#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum EstadoPrenda {
    ORIGINADO,
    CUSTODIA,
    VENDIDO,
}

impl Default for EstadoPrenda {
    fn default() -> Self {
        EstadoPrenda::ORIGINADO
    }
}

/// Metadatos Estructurados del Token según estándar NEP-177
#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, Default, PartialEq)]
pub struct TokenMetadata {
    pub title: Option<String>,
    pub description: Option<String>,
    pub media: Option<String>,
    pub media_hash: Option<Base64VecU8>,
    pub copies: Option<u64>,
    pub issued_at: Option<String>,
    pub expires_at: Option<String>,
    pub starts_at: Option<String>,
    pub updated_at: Option<String>,
    pub extra: Option<String>,
    pub reference: Option<String>,
    pub reference_hash: Option<Base64VecU8>,
}

/// Metadatos Globales del Contrato según estándar NEP-177
#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct NFTContractMetadata {
    pub spec: String,
    pub name: String,
    pub symbol: String,
    pub icon: Option<String>,
    pub base_uri: Option<String>,
    pub reference: Option<String>,
    pub reference_hash: Option<Base64VecU8>,
}

/// Información interna de posesión de un Token
#[near(serializers = [borsh])]
#[derive(Clone, Debug)]
pub struct Token {
    pub owner_id: AccountId,
    pub approved_account_ids: std::collections::HashMap<AccountId, u64>,
    pub next_approval_id: u64,
}

/// DTO enriquecido para consumo en clientes (Web SPA, App Flutter y Explorador)
#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct JsonToken {
    pub token_id: TokenId,
    pub owner_id: AccountId,
    pub metadata: TokenMetadata,
    pub approved_account_ids: std::collections::HashMap<AccountId, u64>,
}

/// DTO integral del Pasaporte Digital Kipulux para consulta atómica
#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct PasaporteCompleto {
    pub token_id: TokenId,
    pub owner_id: AccountId,
    pub estado: EstadoPrenda,
    pub metadata: TokenMetadata,
    pub hash_sunat: Option<String>,
    pub numero_boleta: Option<String>,
    pub custodio_actual: AccountId,
}
