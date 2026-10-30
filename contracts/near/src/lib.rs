use near_sdk::collections::{LazyOption, LookupMap, UnorderedMap};
use near_sdk::json_types::U128;
use near_sdk::{
    env, near, require, AccountId, BorshStorageKey, NearToken, PanicOnDefault, Promise,
};

mod events;
mod types;

use events::*;
pub use types::*;

#[near]
#[derive(BorshStorageKey)]
pub enum StorageKey {
    TokensById,
    TokenMetadataById,
    EstadoPrendaById,
    HashSunatById,
    BoletaById,
    ContractMetadata,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct KipuluxContract {
    pub owner_id: AccountId,
    pub tokens_by_id: LookupMap<TokenId, Token>,
    pub token_metadata_by_id: UnorderedMap<TokenId, TokenMetadata>,
    pub estado_prenda_by_id: LookupMap<TokenId, EstadoPrenda>,
    pub hash_sunat_by_id: LookupMap<TokenId, String>,
    pub boleta_by_id: LookupMap<TokenId, String>,
    pub metadata: LazyOption<NFTContractMetadata>,
}

#[near]
impl KipuluxContract {
    /// Inicializa el contrato con metadatos por defecto para Kipulux
    #[init]
    pub fn new_default_meta(owner_id: AccountId) -> Self {
        Self::new(
            owner_id,
            NFTContractMetadata {
                spec: "nft-1.0.0".to_string(),
                name: "Kipulux Trazabilidad Cuero".to_string(),
                symbol: "KIPU".to_string(),
                icon: Some("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iIzBFNzQ5MCIgZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01ek0yIDE3bDEwIDUgMTAtNS0xMC01LTEwIDV6Ii8+PC9zdmc+".to_string()),
                base_uri: Some("https://ipfs.io/ipfs/".to_string()),
                reference: None,
                reference_hash: None,
            },
        )
    }

    /// Inicialización parametrizada (RF-01)
    #[init]
    pub fn new(owner_id: AccountId, metadata: NFTContractMetadata) -> Self {
        require!(!env::state_exists(), "Kipulux: Contract is already initialized");
        Self {
            owner_id,
            tokens_by_id: LookupMap::new(StorageKey::TokensById),
            token_metadata_by_id: UnorderedMap::new(StorageKey::TokenMetadataById),
            estado_prenda_by_id: LookupMap::new(StorageKey::EstadoPrendaById),
            hash_sunat_by_id: LookupMap::new(StorageKey::HashSunatById),
            boleta_by_id: LookupMap::new(StorageKey::BoletaById),
            metadata: LazyOption::new(StorageKey::ContractMetadata, Some(&metadata)),
        }
    }

    // =========================================================================
    // MÉTODOS MUTABLES / TRANSACCIONALES
    // =========================================================================

    /// RF-02 / RF-06: Minteo Autorizado de Pasaporte Digital con Storage Staking
    /// Exclusivo para la cuenta Relayer / Administrador (`owner_id`)
    #[payable]
    pub fn mint_authorized(
        &mut self,
        token_id: TokenId,
        receiver_id: AccountId,
        token_metadata: TokenMetadata,
    ) -> JsonToken {
        self.assert_owner();
        require!(
            self.tokens_by_id.get(&token_id).is_none(),
            "Kipulux: Token ya existe en la red"
        );

        let initial_storage_usage = env::storage_usage();

        // Registrar tenencia del token
        let token = Token {
            owner_id: receiver_id.clone(),
            approved_account_ids: std::collections::HashMap::new(),
            next_approval_id: 0,
        };
        self.tokens_by_id.insert(&token_id, &token);
        self.token_metadata_by_id.insert(&token_id, &token_metadata);

        // Estado inicial de manufactura en taller artesano (RF-03)
        self.estado_prenda_by_id.insert(&token_id, &EstadoPrenda::ORIGINADO);

        // Gestión de Storage Staking (RF-06): Reembolso de excedente de depósito
        let required_storage_in_bytes = env::storage_usage().saturating_sub(initial_storage_usage);
        self.check_or_refund_storage(required_storage_in_bytes);

        // Emisión de evento normativo NEP-297 (RF-13)
        EventLog {
            standard: "nep171".to_string(),
            version: "1.0.0".to_string(),
            event: EventLogVariant::NftMint(vec![NftMintData {
                owner_id: receiver_id.clone(),
                token_ids: vec![token_id.clone()],
                memo: Some(format!("Prenda Kipulux originada: {}", token_id)),
            }]),
        }
        .emit();

        EventLog {
            standard: "kipulux".to_string(),
            version: "1.0.0".to_string(),
            event: EventLogVariant::CustodiaActualizada(vec![CustodiaData {
                token_id: token_id.clone(),
                nuevo_estado: "ORIGINADO".to_string(),
                custodio: receiver_id.clone(),
            }]),
        }
        .emit();

        JsonToken {
            token_id,
            owner_id: receiver_id,
            metadata: token_metadata,
            approved_account_ids: std::collections::HashMap::new(),
        }
    }

    /// RF-03: Actualización explícita del estado de custodia
    #[payable]
    pub fn actualizar_custodia(&mut self, token_id: TokenId, nuevo_estado: EstadoPrenda) {
        self.assert_owner();
        let token = self.tokens_by_id.get(&token_id)
            .expect("Kipulux: Prenda inexistente");

        self.estado_prenda_by_id.insert(&token_id, &nuevo_estado);

        let estado_str = match nuevo_estado {
            EstadoPrenda::ORIGINADO => "ORIGINADO",
            EstadoPrenda::CUSTODIA => "CUSTODIA",
            EstadoPrenda::VENDIDO => "VENDIDO",
        };

        self.refund_excess_deposit();

        EventLog {
            standard: "kipulux".to_string(),
            version: "1.0.0".to_string(),
            event: EventLogVariant::CustodiaActualizada(vec![CustodiaData {
                token_id: token_id.clone(),
                nuevo_estado: estado_str.to_string(),
                custodio: token.owner_id,
            }]),
        }
        .emit();
    }

    /// RF-04: Transferencia de custodia logística B2B (Taller Artesanal -> Tienda)
    #[payable]
    pub fn transferir_custodia(&mut self, token_id: TokenId, nueva_tienda: AccountId) {
        self.assert_owner();
        let mut token = self.tokens_by_id.get(&token_id)
            .expect("Kipulux: Prenda inexistente");

        let old_owner = token.owner_id.clone();
        token.owner_id = nueva_tienda.clone();
        self.tokens_by_id.insert(&token_id, &token);

        // Mutar estado a CUSTODIA (RF-03)
        self.estado_prenda_by_id.insert(&token_id, &EstadoPrenda::CUSTODIA);

        // Reembolso yoctoNEAR estándar
        self.refund_excess_deposit();

        // Eventos
        EventLog {
            standard: "nep171".to_string(),
            version: "1.0.0".to_string(),
            event: EventLogVariant::NftTransfer(vec![NftTransferData {
                authorized_id: Some(self.owner_id.clone()),
                old_owner_id: old_owner,
                new_owner_id: nueva_tienda.clone(),
                token_ids: vec![token_id.clone()],
                memo: Some(format!("Transferencia de custodia a tienda: {}", nueva_tienda)),
            }]),
        }
        .emit();

        EventLog {
            standard: "kipulux".to_string(),
            version: "1.0.0".to_string(),
            event: EventLogVariant::CustodiaActualizada(vec![CustodiaData {
                token_id: token_id.clone(),
                nuevo_estado: "CUSTODIA".to_string(),
                custodio: nueva_tienda,
            }]),
        }
        .emit();
    }

    /// RF-05: Certificación Fiscal y Registro de Venta B2C (Hash SUNAT)
    /// Registra la boleta electrónica de venta de forma irreversible y entrega el NFT al cliente final
    #[payable]
    pub fn registrar_venta(
        &mut self,
        token_id: TokenId,
        comprador: AccountId,
        hash_sunat: String,
        numero_boleta: String,
    ) {
        self.assert_owner();
        require!(!hash_sunat.trim().is_empty(), "Kipulux: El hash SUNAT no puede ser vacio");
        require!(!numero_boleta.trim().is_empty(), "Kipulux: El numero de boleta es requerido");

        // Regla de Inmutabilidad Fiscal: No se puede sobreescribir una venta ya sellada
        require!(
            self.hash_sunat_by_id.get(&token_id).is_none(),
            "Kipulux: Inmutabilidad fiscal violada. Esta prenda ya cuenta con comprobante registrado"
        );

        let initial_storage_usage = env::storage_usage();

        let mut token = self.tokens_by_id.get(&token_id)
            .expect("Kipulux: Prenda inexistente");

        let old_owner = token.owner_id.clone();
        token.owner_id = comprador.clone();
        self.tokens_by_id.insert(&token_id, &token);

        // Mutar estado a VENDIDO
        self.estado_prenda_by_id.insert(&token_id, &EstadoPrenda::VENDIDO);
        self.hash_sunat_by_id.insert(&token_id, &hash_sunat);
        self.boleta_by_id.insert(&token_id, &numero_boleta);

        let required_storage = env::storage_usage().saturating_sub(initial_storage_usage);
        self.check_or_refund_storage(required_storage);

        // Eventos
        EventLog {
            standard: "nep171".to_string(),
            version: "1.0.0".to_string(),
            event: EventLogVariant::NftTransfer(vec![NftTransferData {
                authorized_id: Some(self.owner_id.clone()),
                old_owner_id: old_owner,
                new_owner_id: comprador.clone(),
                token_ids: vec![token_id.clone()],
                memo: Some(format!("Venta B2C boleta {}", numero_boleta)),
            }]),
        }
        .emit();

        EventLog {
            standard: "kipulux".to_string(),
            version: "1.0.0".to_string(),
            event: EventLogVariant::VentaRegistrada(vec![VentaData {
                token_id: token_id.clone(),
                comprador,
                hash_sunat,
                numero_boleta,
            }]),
        }
        .emit();
    }

    // =========================================================================
    // MÉTODOS DE CONSULTA (VIEW FUNCTIONS - GASLESS)
    // =========================================================================

    /// NEP-171: Consulta de token individual
    pub fn nft_token(&self, token_id: TokenId) -> Option<JsonToken> {
        if let Some(token) = self.tokens_by_id.get(&token_id) {
            let metadata = self.token_metadata_by_id.get(&token_id).unwrap_or_default();
            Some(JsonToken {
                token_id,
                owner_id: token.owner_id,
                metadata,
                approved_account_ids: token.approved_account_ids,
            })
        } else {
            None
        }
    }

    /// NEP-177: Consulta de metadatos globales de la colección
    pub fn nft_metadata(&self) -> NFTContractMetadata {
        self.metadata.get().expect("Kipulux: Metadatos no inicializados")
    }

    /// RF-03: Consulta pública del estado de ciclo de vida
    pub fn obtener_estado_prenda(&self, token_id: TokenId) -> Option<EstadoPrenda> {
        self.estado_prenda_by_id.get(&token_id)
    }

    /// RF-05: Consulta del hash fiscal SUNAT de la prenda
    pub fn obtener_hash_sunat(&self, token_id: TokenId) -> Option<String> {
        self.hash_sunat_by_id.get(&token_id)
    }

    /// Consulta atómica integral del Pasaporte Digital para clientes y frontend
    pub fn obtener_pasaporte_completo(&self, token_id: TokenId) -> Option<PasaporteCompleto> {
        if let Some(token) = self.tokens_by_id.get(&token_id) {
            let metadata = self.token_metadata_by_id.get(&token_id).unwrap_or_default();
            let estado = self.estado_prenda_by_id.get(&token_id).unwrap_or(EstadoPrenda::ORIGINADO);
            let hash_sunat = self.hash_sunat_by_id.get(&token_id);
            let numero_boleta = self.boleta_by_id.get(&token_id);

            Some(PasaporteCompleto {
                token_id,
                owner_id: token.owner_id.clone(),
                estado,
                metadata,
                hash_sunat,
                numero_boleta,
                custodio_actual: token.owner_id,
            })
        } else {
            None
        }
    }

    /// Paginación NEP-171 para exploradores
    pub fn nft_tokens(&self, from_index: Option<U128>, limit: Option<u64>) -> Vec<JsonToken> {
        let start_index: u128 = from_index.map(From::from).unwrap_or(0);
        let limit = limit.unwrap_or(50).min(100) as usize;

        self.token_metadata_by_id
            .keys()
            .skip(start_index as usize)
            .take(limit)
            .filter_map(|token_id| self.nft_token(token_id))
            .collect()
    }

    pub fn nft_total_supply(&self) -> U128 {
        U128::from(self.token_metadata_by_id.len() as u128)
    }

    // =========================================================================
    // SEGURIDAD, RBAC & STORAGE STAKING HELPERS
    // =========================================================================

    fn assert_owner(&self) {
        require!(
            env::predecessor_account_id() == self.owner_id,
            "Kipulux: Accion restringida al Relayer/Owner corporativo"
        );
    }

    fn check_or_refund_storage(&self, storage_used: u64) {
        if storage_used == 0 {
            self.refund_excess_deposit();
            return;
        }

        let required_cost = env::storage_byte_cost().as_yoctonear() * (storage_used as u128);
        let attached_deposit = env::attached_deposit().as_yoctonear();

        if attached_deposit > required_cost {
            let refund = attached_deposit - required_cost;
            let _ = Promise::new(env::predecessor_account_id()).transfer(NearToken::from_yoctonear(refund));
        } else {
            // Verificar que el balance de la cuenta del contrato cubra el staking total acumulado
            let total_storage_cost = env::storage_byte_cost().as_yoctonear() * (env::storage_usage() as u128);
            let account_balance = env::account_balance().as_yoctonear();
            require!(
                account_balance >= total_storage_cost,
                format!(
                    "Kipulux: Saldo del contrato insuficiente para storage staking. Requerido: {} yoctoNEAR",
                    total_storage_cost
                )
            );
        }
    }

    fn refund_excess_deposit(&self) {
        let attached = env::attached_deposit().as_yoctonear();
        if attached > 1 {
            let _ = Promise::new(env::predecessor_account_id()).transfer(NearToken::from_yoctonear(attached - 1));
        }
    }
}
