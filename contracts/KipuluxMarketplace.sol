// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IKipuluxTrazabilidad {
    function ownerOf(uint256 tokenId) external view returns (address);
    function transferFrom(address from, address to, uint256 tokenId) external;
}

/**
 * @title KipuluxMarketplace
 * @dev Contrato de Escrow descentralizado para el mercado secundario de prendas Kipulux.
 */
contract KipuluxMarketplace {
    IKipuluxTrazabilidad public trazabilidad;
    
    // Billeteras para distribución de fees
    address public platformWallet;

    // Estructura de un anuncio (Listing)
    struct Listing {
        address seller;
        address originalStore; // La tienda B2B original para royalties
        uint256 price;
        bool isActive;
    }

    // tokenId => Listing
    mapping(uint256 => Listing) public listings;

    // Configuración de comisiones (en basis points, 100 = 1%)
    uint256 public platformFeePercentage = 250; // 2.5%
    uint256 public storeRoyaltyPercentage = 500; // 5.0%

    // Eventos
    event TokenListed(uint256 indexed tokenId, address indexed seller, address indexed originalStore, uint256 price);
    event TokenSold(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price);
    event TokenDelisted(uint256 indexed tokenId, address indexed seller);

    constructor(address _trazabilidadAddress, address _platformWallet) {
        require(_trazabilidadAddress != address(0), "Direccion invalida");
        require(_platformWallet != address(0), "Direccion invalida");
        trazabilidad = IKipuluxTrazabilidad(_trazabilidadAddress);
        platformWallet = _platformWallet;
    }

    /**
     * @dev Pone un NFT a la venta en el Marketplace.
     * El seller debe haber llamado a `approve(marketplaceAddress, tokenId)` en el contrato de Trazabilidad.
     */
    function listToken(uint256 tokenId, uint256 price, address originalStore) external {
        require(trazabilidad.ownerOf(tokenId) == msg.sender, "KipuMarket: No eres el propietario del token");
        require(price > 0, "KipuMarket: El precio debe ser mayor a 0");
        require(originalStore != address(0), "KipuMarket: Tienda original invalida");

        listings[tokenId] = Listing({
            seller: msg.sender,
            originalStore: originalStore,
            price: price,
            isActive: true
        });

        emit TokenListed(tokenId, msg.sender, originalStore, price);
    }

    /**
     * @dev Cancela la venta de un NFT.
     */
    function cancelListing(uint256 tokenId) external {
        Listing memory listing = listings[tokenId];
        require(listing.isActive, "KipuMarket: Token no esta a la venta");
        require(listing.seller == msg.sender, "KipuMarket: No eres el vendedor");

        delete listings[tokenId];
        emit TokenDelisted(tokenId, msg.sender);
    }

    /**
     * @dev Compra un NFT usando la criptomoneda nativa (SYS/ETH) como Escrow.
     */
    function buyToken(uint256 tokenId) external payable {
        Listing memory listing = listings[tokenId];
        require(listing.isActive, "KipuMarket: Token no esta a la venta");
        require(msg.value >= listing.price, "KipuMarket: Fondos insuficientes");

        // 1. Eliminar listing para prevenir reentrancy
        delete listings[tokenId];

        // 2. Calcular distribución de fondos
        uint256 platformFee = (listing.price * platformFeePercentage) / 10000;
        uint256 storeRoyalty = (listing.price * storeRoyaltyPercentage) / 10000;
        uint256 sellerAmount = listing.price - platformFee - storeRoyalty;

        // 3. Transferir el NFT del vendedor al comprador
        trazabilidad.transferFrom(listing.seller, msg.sender, tokenId);

        // 4. Distribuir fondos
        payable(platformWallet).transfer(platformFee);
        payable(listing.originalStore).transfer(storeRoyalty);
        payable(listing.seller).transfer(sellerAmount);

        // 5. Reembolsar exceso si enviaron de más
        if (msg.value > listing.price) {
            payable(msg.sender).transfer(msg.value - listing.price);
        }

        emit TokenSold(tokenId, msg.sender, listing.seller, listing.price);
    }
}
