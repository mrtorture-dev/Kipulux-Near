use near_sdk::collections::{LazyOption, LookupMap, UnorderedMap, UnorderedSet};
use near_sdk::json_types::U128;
use near_sdk::{
    env, near, require, AccountId, BorshStorageKey, NearToken, PanicOnDefault, Promise,
};
use std::collections::HashMap;

mod events;
mod types;

use events::*;
pub use types::*;

const PASSPORT_SUBACCOUNT_INITIAL_BALANCE: NearToken = NearToken::from_millinear(10); // 0.01 NEAR
const PASSPORT_SUBACCOUNT_MIN_DEPOSIT: NearToken = NearToken::from_millinear(20); // 0.02 NEAR

#[near]
#[derive(BorshStorageKey)]
pub enum StorageKey {
    TokensById,
    TokenMetadataById,
    TokensPerOwner,
    TokensPerOwnerSet { account_hash: Vec<u8> },
    PassportAccountById,
    EstadoPrendaById,
    HashSunatById,
    BoletaById,
    EscrowListings,
    ContractMetadata,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct KipuluxContract {
    pub owner_id: AccountId,
    pub brand_account_id: AccountId,
    pub default_royalty_bps: u16,
    pub tokens_by_id: LookupMap<TokenId, Token>,
    pub token_metadata_by_id: UnorderedMap<TokenId, TokenMetadata>,
    pub tokens_per_owner: LookupMap<AccountId, UnorderedSet<TokenId>>,
    pub passport_account_by_id: LookupMap<TokenId, AccountId>,
    pub estado_prenda_by_id: LookupMap<TokenId, EstadoPrenda>,
    pub hash_sunat_by_id: LookupMap<TokenId, String>,
    pub boleta_by_id: LookupMap<TokenId, String>,
    pub escrow_listings: LookupMap<TokenId, EscrowListing>,
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
            brand_account_id: owner_id.clone(),
            default_royalty_bps: 1000, // 10% regalía por defecto para la marca
            owner_id,
            tokens_by_id: LookupMap::new(StorageKey::TokensById),
            token_metadata_by_id: UnorderedMap::new(StorageKey::TokenMetadataById),
            tokens_per_owner: LookupMap::new(StorageKey::TokensPerOwner),
            passport_account_by_id: LookupMap::new(StorageKey::PassportAccountById),
            estado_prenda_by_id: LookupMap::new(StorageKey::EstadoPrendaById),
            hash_sunat_by_id: LookupMap::new(StorageKey::HashSunatById),
            boleta_by_id: LookupMap::new(StorageKey::BoletaById),
            escrow_listings: LookupMap::new(StorageKey::EscrowListings),
            metadata: LazyOption::new(StorageKey::ContractMetadata, Some(&metadata)),
        }
    }

    // =========================================================================
    // CONFIGURACIÓN DE REGALÍAS (NEP-199)
    // =========================================================================

    pub fn set_royalty_config(&mut self, brand_account_id: AccountId, royalty_bps: u16) {
        self.assert_owner();
        require!(royalty_bps <= 5000, "Kipulux: La regalia maxima permitida es 50% (5000 bps)");
        self.brand_account_id = brand_account_id;
        self.default_royalty_bps = royalty_bps;
    }

    // =========================================================================
    // MÉTODOS MUTABLES / TRANSACCIONALES
    // =========================================================================

    /// RF-02 / RF-06: Minteo Autorizado de Pasaporte Digital NEP-171 ligado a su propia subcuenta NEAR
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

        // Registrar tenencia del token NEP-171
        let token = Token {
            owner_id: receiver_id.clone(),
            approved_account_ids: HashMap::new(),
            next_approval_id: 0,
        };
        self.tokens_by_id.insert(&token_id, &token);
        self.token_metadata_by_id.insert(&token_id, &token_metadata);
        self.internal_add_token_to_owner(&receiver_id, &token_id);

        // Derivar y ligar cuenta NEAR dedicada al pasaporte (<slug>.<contrato>)
        let passport_account_id = self.derive_passport_account(&token_id);
        self.passport_account_by_id.insert(&token_id, &passport_account_id);

        // Si el depósito adjunto alcanza (>= 0.02 NEAR), crear la subcuenta on-chain automáticamente
        let mut subaccount_funding_yocto: u128 = 0;
        if env::attached_deposit() >= PASSPORT_SUBACCOUNT_MIN_DEPOSIT {
            subaccount_funding_yocto = PASSPORT_SUBACCOUNT_INITIAL_BALANCE.as_yoctonear();
            let _ = Promise::new(passport_account_id.clone())
                .create_account()
                .transfer(PASSPORT_SUBACCOUNT_INITIAL_BALANCE);
        }

        // Estado inicial de manufactura en taller artesano (RF-03)
        self.estado_prenda_by_id.insert(&token_id, &EstadoPrenda::ORIGINADO);

        // Gestión de Storage Staking (RF-06): Reembolso de excedente de depósito
        let required_storage_in_bytes = env::storage_usage().saturating_sub(initial_storage_usage);
        self.check_or_refund_storage_with_extra(required_storage_in_bytes, subaccount_funding_yocto);

        // Emisión de evento normativo NEP-297 (RF-13)
        EventLog {
            standard: "nep171".to_string(),
            version: "1.0.0".to_string(),
            event: EventLogVariant::NftMint(vec![NftMintData {
                owner_id: receiver_id.clone(),
                token_ids: vec![token_id.clone()],
                memo: Some(format!(
                    "Prenda Kipulux originada: {} (cuenta: {})",
                    token_id, passport_account_id
                )),
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
            approved_account_ids: HashMap::new(),
        }
    }

    /// Estándar NEP-171: Transferencia directa de NFT por su propietario o cuenta aprobada
    #[payable]
    pub fn nft_transfer(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        approval_id: Option<u64>,
        memo: Option<String>,
    ) {
        self.assert_one_yocto();
        require!(
            self.escrow_listings.get(&token_id).is_none(),
            "Kipulux: Token bloqueado en escrow de reventa"
        );

        let sender_id = env::predecessor_account_id();
        let mut token = self
            .tokens_by_id
            .get(&token_id)
            .expect("Kipulux: Token inexistente");

        if sender_id != token.owner_id {
            let stored_approval_id = token
                .approved_account_ids
                .get(&sender_id)
                .expect("Kipulux: No autorizado para transferir este token");
            if let Some(enforced_id) = approval_id {
                require!(
                    *stored_approval_id == enforced_id,
                    "Kipulux: approval_id no coincide"
                );
            }
        }

        require!(
            token.owner_id != receiver_id,
            "Kipulux: El receptor ya es propietario del token"
        );

        let old_owner = token.owner_id.clone();
        self.internal_transfer_token(&mut token, &token_id, &old_owner, &receiver_id);

        EventLog {
            standard: "nep171".to_string(),
            version: "1.0.0".to_string(),
            event: EventLogVariant::NftTransfer(vec![NftTransferData {
                authorized_id: if sender_id != old_owner {
                    Some(sender_id)
                } else {
                    None
                },
                old_owner_id: old_owner,
                new_owner_id: receiver_id,
                token_ids: vec![token_id],
                memo,
            }]),
        }
        .emit();
    }

    /// RF-03: Actualización explícita del estado de custodia
    #[payable]
    pub fn actualizar_custodia(&mut self, token_id: TokenId, nuevo_estado: EstadoPrenda) {
        self.assert_owner();
        let token = self
            .tokens_by_id
            .get(&token_id)
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
                token_id,
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
        require!(
            self.escrow_listings.get(&token_id).is_none(),
            "Kipulux: Token bloqueado en escrow de reventa"
        );
        let mut token = self
            .tokens_by_id
            .get(&token_id)
            .expect("Kipulux: Prenda inexistente");

        let old_owner = token.owner_id.clone();
        self.internal_transfer_token(&mut token, &token_id, &old_owner, &nueva_tienda);

        // Mutar estado a CUSTODIA (RF-03)
        self.estado_prenda_by_id
            .insert(&token_id, &EstadoPrenda::CUSTODIA);

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
                token_id,
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
        require!(
            !hash_sunat.trim().is_empty(),
            "Kipulux: El hash SUNAT no puede ser vacio"
        );
        require!(
            !numero_boleta.trim().is_empty(),
            "Kipulux: El numero de boleta es requerido"
        );

        // Regla de Inmutabilidad Fiscal: No se puede sobreescribir una venta ya sellada
        require!(
            self.hash_sunat_by_id.get(&token_id).is_none(),
            "Kipulux: Inmutabilidad fiscal violada. Esta prenda ya cuenta con comprobante registrado"
        );

        let initial_storage_usage = env::storage_usage();

        let mut token = self
            .tokens_by_id
            .get(&token_id)
            .expect("Kipulux: Prenda inexistente");

        let old_owner = token.owner_id.clone();
        self.internal_transfer_token(&mut token, &token_id, &old_owner, &comprador);

        // Mutar estado a VENDIDO
        self.estado_prenda_by_id
            .insert(&token_id, &EstadoPrenda::VENDIDO);
        self.hash_sunat_by_id.insert(&token_id, &hash_sunat);
        self.boleta_by_id.insert(&token_id, &numero_boleta);

        let required_storage = env::storage_usage().saturating_sub(initial_storage_usage);
        self.check_or_refund_storage_with_extra(required_storage, 0);

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
                token_id,
                comprador,
                hash_sunat,
                numero_boleta,
            }]),
        }
        .emit();
    }

    // =========================================================================
    // ESCROW DE REVENTA SECUNDARIA CON REGALÍA AUTOMÁTICA A LA MARCA (NEP-199)
    // =========================================================================

    /// Bloquea el NFT en el contrato (Escrow) y lo lista para reventa secundaria
    #[payable]
    pub fn listar_reventa_escrow(&mut self, token_id: TokenId, precio_yocto: U128) {
        require!(
            precio_yocto.0 > 0,
            "Kipulux Escrow: El precio de reventa debe ser mayor a 0"
        );
        require!(
            self.escrow_listings.get(&token_id).is_none(),
            "Kipulux Escrow: El token ya se encuentra listado en escrow"
        );

        let caller = env::predecessor_account_id();
        let mut token = self
            .tokens_by_id
            .get(&token_id)
            .expect("Kipulux Escrow: Prenda inexistente");

        require!(
            caller == token.owner_id || caller == self.owner_id,
            "Kipulux Escrow: Solo el propietario o el relayer autorizado puede listar en escrow"
        );

        let seller_id = token.owner_id.clone();
        let escrow_account = env::current_account_id();

        // Custodia del NFT pasa al contrato inteligente (Escrow)
        self.internal_transfer_token(&mut token, &token_id, &seller_id, &escrow_account);

        let listing = EscrowListing {
            seller_id: seller_id.clone(),
            price: precio_yocto,
            royalty_bps: self.default_royalty_bps,
            brand_account_id: self.brand_account_id.clone(),
        };
        self.escrow_listings.insert(&token_id, &listing);

        self.refund_excess_deposit();

        EventLog {
            standard: "kipulux".to_string(),
            version: "1.0.0".to_string(),
            event: EventLogVariant::EscrowListado(vec![EscrowListadoData {
                token_id,
                seller_id,
                price_yocto: precio_yocto.0.to_string(),
                royalty_bps: listing.royalty_bps,
                brand_account_id: listing.brand_account_id,
            }]),
        }
        .emit();
    }

    /// Liquida el Escrow atómicamente: cobra el depósito NEAR, transfiere la regalía a la marca,
    /// paga el saldo neto al vendedor y transfiere el NFT al comprador
    #[payable]
    pub fn comprar_reventa_escrow(&mut self, token_id: TokenId, comprador: Option<AccountId>) {
        let listing = self
            .escrow_listings
            .get(&token_id)
            .expect("Kipulux Escrow: Este token no esta listado para reventa");

        let attached = env::attached_deposit().as_yoctonear();
        require!(
            attached >= listing.price.0,
            "Kipulux Escrow: Deposito NEAR insuficiente para cubrir el precio de reventa"
        );

        let buyer_id = comprador.unwrap_or_else(env::predecessor_account_id);
        let royalty_amount = (listing.price.0 * (listing.royalty_bps as u128)) / 10_000;
        let seller_payout = listing.price.0 - royalty_amount;
        let excess = attached - listing.price.0;

        // 1. Pago automático de regalía a la marca
        if royalty_amount > 0 {
            let _ = Promise::new(listing.brand_account_id.clone())
                .transfer(NearToken::from_yoctonear(royalty_amount));
        }

        // 2. Pago neto al vendedor anterior
        if seller_payout > 0 {
            let _ = Promise::new(listing.seller_id.clone())
                .transfer(NearToken::from_yoctonear(seller_payout));
        }

        // 3. Reembolso de excedente si depositó de más
        if excess > 0 {
            let _ = Promise::new(env::predecessor_account_id())
                .transfer(NearToken::from_yoctonear(excess));
        }

        // 4. Liberar NFT del Escrow hacia el comprador
        let mut token = self
            .tokens_by_id
            .get(&token_id)
            .expect("Kipulux Escrow: Prenda inexistente");
        let escrow_account = env::current_account_id();
        self.internal_transfer_token(&mut token, &token_id, &escrow_account, &buyer_id);
        self.escrow_listings.remove(&token_id);
        self.estado_prenda_by_id
            .insert(&token_id, &EstadoPrenda::VENDIDO);

        EventLog {
            standard: "nep171".to_string(),
            version: "1.0.0".to_string(),
            event: EventLogVariant::NftTransfer(vec![NftTransferData {
                authorized_id: Some(escrow_account),
                old_owner_id: listing.seller_id.clone(),
                new_owner_id: buyer_id.clone(),
                token_ids: vec![token_id.clone()],
                memo: Some(format!(
                    "Reventa Escrow: regalia {} yoctoNEAR a {}",
                    royalty_amount, listing.brand_account_id
                )),
            }]),
        }
        .emit();

        EventLog {
            standard: "kipulux".to_string(),
            version: "1.0.0".to_string(),
            event: EventLogVariant::ReventaEscrowLiquidada(vec![ReventaEscrowData {
                token_id,
                seller_id: listing.seller_id,
                buyer_id,
                brand_account_id: listing.brand_account_id,
                price_yocto: listing.price.0.to_string(),
                royalty_yocto: royalty_amount.to_string(),
                seller_payout_yocto: seller_payout.to_string(),
            }]),
        }
        .emit();
    }

    /// Cancela el listado en Escrow y devuelve el NFT al vendedor original
    #[payable]
    pub fn cancelar_reventa_escrow(&mut self, token_id: TokenId) {
        let listing = self
            .escrow_listings
            .get(&token_id)
            .expect("Kipulux Escrow: Este token no esta listado");

        let caller = env::predecessor_account_id();
        require!(
            caller == listing.seller_id || caller == self.owner_id,
            "Kipulux Escrow: Solo el vendedor o relayer puede cancelar"
        );

        let mut token = self
            .tokens_by_id
            .get(&token_id)
            .expect("Kipulux Escrow: Prenda inexistente");
        let escrow_account = env::current_account_id();
        self.internal_transfer_token(&mut token, &token_id, &escrow_account, &listing.seller_id);
        self.escrow_listings.remove(&token_id);

        self.refund_excess_deposit();
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
        self.metadata
            .get()
            .expect("Kipulux: Metadatos no inicializados")
    }

    /// NEP-199: Cálculo oficial de distribución de regalías
    pub fn nft_payout(
        &self,
        token_id: TokenId,
        balance: U128,
        max_len_payout: Option<u32>,
    ) -> Payout {
        let token = self
            .tokens_by_id
            .get(&token_id)
            .expect("Kipulux: Token inexistente");
        let max_len = max_len_payout.unwrap_or(10);
        require!(max_len >= 2, "Kipulux: max_len_payout debe ser al menos 2");

        let total = balance.0;
        let royalty = (total * (self.default_royalty_bps as u128)) / 10_000;
        let seller_amount = total - royalty;

        let mut payout = HashMap::new();
        if self.brand_account_id == token.owner_id {
            payout.insert(token.owner_id, U128::from(total));
        } else {
            if seller_amount > 0 {
                payout.insert(token.owner_id, U128::from(seller_amount));
            }
            if royalty > 0 {
                payout.insert(self.brand_account_id.clone(), U128::from(royalty));
            }
        }
        Payout { payout }
    }

    /// NEP-171 Enumeration: Tokens de un propietario específico
    pub fn nft_tokens_for_owner(
        &self,
        account_id: AccountId,
        from_index: Option<U128>,
        limit: Option<u64>,
    ) -> Vec<JsonToken> {
        let Some(tokens_set) = self.tokens_per_owner.get(&account_id) else {
            return vec![];
        };
        let start_index: usize = from_index.map(|i| i.0 as usize).unwrap_or(0);
        let limit = limit.unwrap_or(50).min(100) as usize;

        tokens_set
            .iter()
            .skip(start_index)
            .take(limit)
            .filter_map(|token_id| self.nft_token(token_id))
            .collect()
    }

    /// NEP-171 Enumeration: Cantidad de tokens de un propietario
    pub fn nft_supply_for_owner(&self, account_id: AccountId) -> U128 {
        self.tokens_per_owner
            .get(&account_id)
            .map(|set| U128::from(set.len() as u128))
            .unwrap_or(U128::from(0))
    }

    /// Consulta la cuenta NEAR dedicada ligada al pasaporte
    pub fn obtener_cuenta_pasaporte(&self, token_id: TokenId) -> Option<AccountId> {
        self.passport_account_by_id.get(&token_id)
    }

    /// Consulta el listado de Escrow activo para un token
    pub fn obtener_escrow(&self, token_id: TokenId) -> Option<EscrowListing> {
        self.escrow_listings.get(&token_id)
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
            let estado = self
                .estado_prenda_by_id
                .get(&token_id)
                .unwrap_or(EstadoPrenda::ORIGINADO);
            let hash_sunat = self.hash_sunat_by_id.get(&token_id);
            let numero_boleta = self.boleta_by_id.get(&token_id);
            let passport_account_id = self.passport_account_by_id.get(&token_id);

            Some(PasaporteCompleto {
                token_id,
                owner_id: token.owner_id.clone(),
                passport_account_id,
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
    // HELPERS INTERNOS, RBAC & STORAGE STAKING
    // =========================================================================

    fn derive_passport_account(&self, token_id: &str) -> AccountId {
        let contract_id = env::current_account_id().to_string();
        let max_prefix_len = 64usize.saturating_sub(contract_id.len() + 1);
        let mut slug: String = token_id
            .to_lowercase()
            .chars()
            .map(|c| {
                if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                    c
                } else {
                    '-'
                }
            })
            .collect();
        if slug.is_empty() {
            slug = "pasaporte".to_string();
        }
        if slug.len() > max_prefix_len && max_prefix_len > 0 {
            slug.truncate(max_prefix_len);
        }
        let slug = slug.trim_matches(|c| c == '-' || c == '_');
        let full = format!("{}.{}", slug, contract_id);
        full.parse::<AccountId>()
            .expect("Kipulux: No se pudo derivar una cuenta NEAR valida para el pasaporte")
    }

    fn internal_transfer_token(
        &mut self,
        token: &mut Token,
        token_id: &TokenId,
        old_owner: &AccountId,
        new_owner: &AccountId,
    ) {
        self.internal_remove_token_from_owner(old_owner, token_id);
        self.internal_add_token_to_owner(new_owner, token_id);
        token.owner_id = new_owner.clone();
        token.approved_account_ids.clear();
        self.tokens_by_id.insert(token_id, token);
    }

    fn internal_add_token_to_owner(&mut self, account_id: &AccountId, token_id: &TokenId) {
        let mut tokens_set = self.tokens_per_owner.get(account_id).unwrap_or_else(|| {
            UnorderedSet::new(StorageKey::TokensPerOwnerSet {
                account_hash: env::sha256(account_id.as_bytes()),
            })
        });
        tokens_set.insert(token_id);
        self.tokens_per_owner.insert(account_id, &tokens_set);
    }

    fn internal_remove_token_from_owner(&mut self, account_id: &AccountId, token_id: &TokenId) {
        if let Some(mut tokens_set) = self.tokens_per_owner.get(account_id) {
            tokens_set.remove(token_id);
            if tokens_set.is_empty() {
                self.tokens_per_owner.remove(account_id);
            } else {
                self.tokens_per_owner.insert(account_id, &tokens_set);
            }
        }
    }

    fn assert_owner(&self) {
        require!(
            env::predecessor_account_id() == self.owner_id,
            "Kipulux: Accion restringida al Relayer/Owner corporativo"
        );
    }

    fn assert_one_yocto(&self) {
        require!(
            env::attached_deposit().as_yoctonear() == 1,
            "Kipulux: Se requiere adjuntar exactamente 1 yoctoNEAR"
        );
    }

    fn check_or_refund_storage_with_extra(&self, storage_used: u64, extra_spent_yocto: u128) {
        let required_cost =
            env::storage_byte_cost().as_yoctonear() * (storage_used as u128) + extra_spent_yocto;
        let attached_deposit = env::attached_deposit().as_yoctonear();

        if attached_deposit > required_cost {
            let refund = attached_deposit - required_cost;
            let _ = Promise::new(env::predecessor_account_id())
                .transfer(NearToken::from_yoctonear(refund));
        } else {
            let total_storage_cost =
                env::storage_byte_cost().as_yoctonear() * (env::storage_usage() as u128);
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
            let _ = Promise::new(env::predecessor_account_id())
                .transfer(NearToken::from_yoctonear(attached - 1));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::testing_env;

    fn get_context(predecessor: AccountId, deposit: NearToken) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder
            .current_account_id("kipulux.testnet".parse().unwrap())
            .predecessor_account_id(predecessor)
            .attached_deposit(deposit);
        builder
    }

    #[test]
    fn test_mint_links_passport_account_and_nep171_transfer() {
        let owner: AccountId = accounts(0);
        let artesano: AccountId = accounts(1);
        let comprador: AccountId = accounts(2);

        testing_env!(get_context(owner.clone(), NearToken::from_near(1)).build());
        let mut contract = KipuluxContract::new_default_meta(owner.clone());

        let token = contract.mint_authorized(
            "KIPU-CUERO-001".to_string(),
            artesano.clone(),
            TokenMetadata::default(),
        );
        assert_eq!(token.owner_id, artesano);
        assert_eq!(
            contract.obtener_cuenta_pasaporte("KIPU-CUERO-001".to_string()),
            Some("kipu-cuero-001.kipulux.testnet".parse().unwrap())
        );
        assert_eq!(contract.nft_supply_for_owner(artesano.clone()).0, 1);

        // Transferencia NEP-171 directa por el propietario con 1 yoctoNEAR
        testing_env!(get_context(artesano.clone(), NearToken::from_yoctonear(1)).build());
        contract.nft_transfer(
            comprador.clone(),
            "KIPU-CUERO-001".to_string(),
            None,
            Some("Traspaso directo".to_string()),
        );
        assert_eq!(
            contract.nft_token("KIPU-CUERO-001".to_string()).unwrap().owner_id,
            comprador
        );
        assert_eq!(contract.nft_supply_for_owner(artesano).0, 0);
        assert_eq!(contract.nft_supply_for_owner(comprador).0, 1);
    }

    #[test]
    fn test_escrow_resale_pays_brand_royalty_automatically() {
        let owner: AccountId = accounts(0);
        let brand: AccountId = "alda.testnet".parse().unwrap();
        let seller: AccountId = accounts(1);
        let buyer: AccountId = accounts(2);

        testing_env!(get_context(owner.clone(), NearToken::from_near(1)).build());
        let mut contract = KipuluxContract::new_default_meta(owner.clone());
        contract.set_royalty_config(brand.clone(), 1000); // 10%

        contract.mint_authorized(
            "KIPU-CUERO-777".to_string(),
            seller.clone(),
            TokenMetadata::default(),
        );

        let price = NearToken::from_near(2).as_yoctonear();

        // Verificar NEP-199 nft_payout
        let payout = contract.nft_payout("KIPU-CUERO-777".to_string(), U128::from(price), None);
        assert_eq!(payout.payout.get(&brand).unwrap().0, price / 10);
        assert_eq!(payout.payout.get(&seller).unwrap().0, (price * 9) / 10);

        // Listar en Escrow
        testing_env!(get_context(seller.clone(), NearToken::from_yoctonear(1)).build());
        contract.listar_reventa_escrow("KIPU-CUERO-777".to_string(), U128::from(price));
        assert!(contract.obtener_escrow("KIPU-CUERO-777".to_string()).is_some());
        assert_eq!(
            contract.nft_token("KIPU-CUERO-777".to_string()).unwrap().owner_id,
            "kipulux.testnet".parse::<AccountId>().unwrap()
        );

        // Comprar desde Escrow con depósito completo
        testing_env!(get_context(buyer.clone(), NearToken::from_near(2)).build());
        contract.comprar_reventa_escrow("KIPU-CUERO-777".to_string(), None);

        assert!(contract.obtener_escrow("KIPU-CUERO-777".to_string()).is_none());
        assert_eq!(
            contract.nft_token("KIPU-CUERO-777".to_string()).unwrap().owner_id,
            buyer
        );
    }
}
