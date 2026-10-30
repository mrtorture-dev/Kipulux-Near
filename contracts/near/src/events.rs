use near_sdk::env;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::AccountId;

/// Formato canónico de eventos NEAR según estándar NEP-297 (Event Format Specification)
#[derive(Serialize, Deserialize, Debug)]
#[serde(crate = "near_sdk::serde")]
#[serde(tag = "event", content = "data")]
#[serde(rename_all = "snake_case")]
pub enum EventLogVariant {
    NftMint(Vec<NftMintData>),
    NftTransfer(Vec<NftTransferData>),
    CustodiaActualizada(Vec<CustodiaData>),
    VentaRegistrada(Vec<VentaData>),
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct EventLog {
    pub standard: String,
    pub version: String,
    #[serde(flatten)]
    pub event: EventLogVariant,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct NftMintData {
    pub owner_id: AccountId,
    pub token_ids: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memo: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct NftTransferData {
    pub authorized_id: Option<AccountId>,
    pub old_owner_id: AccountId,
    pub new_owner_id: AccountId,
    pub token_ids: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memo: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct CustodiaData {
    pub token_id: String,
    pub nuevo_estado: String,
    pub custodio: AccountId,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct VentaData {
    pub token_id: String,
    pub comprador: AccountId,
    pub hash_sunat: String,
    pub numero_boleta: String,
}

impl EventLog {
    /// Emite el evento a los logs de la blockchain con el prefijo normativo EVENT_JSON:
    pub fn emit(&self) {
        let json = near_sdk::serde_json::to_string(self)
            .expect("Error al serializar evento NEP-297");
        env::log_str(&format!("EVENT_JSON:{}", json));
    }
}
