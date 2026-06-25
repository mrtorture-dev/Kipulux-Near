// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title KipuluxTrazabilidad
 * @dev Contrato inteligente Corporativo para la trazabilidad y certificación de cuero en Perú.
 * Implementa el estándar ERC-721 para la propiedad de los productos y la trazabilidad de su ciclo de vida.
 */
contract KipuluxTrazabilidad is ERC721URIStorage, Ownable {
    
    // Contador interno para los IDs de tokens
    uint256 private _tokenIdCounter;

    // Máquina de estados del producto
    enum EstadoPrenda { ORIGINADO, CUSTODIA, VENDIDO }

    // Mapeos de auditoría y trazabilidad
    mapping(uint256 => EstadoPrenda) public estadoToken;
    mapping(uint256 => bytes32) public Hash_Comprobante_Pago; // SHA-256 de la boleta XML de la SUNAT

    // Eventos de auditoría para indexación externa (Subgraphs / Relayers)
    event CertificadoOriginado(uint256 indexed tokenId, string tokenURI, address indexed taller);
    event CustodiaActualizada(uint256 indexed tokenId, EstadoPrenda nuevoEstado);
    event VentaRegistrada(uint256 indexed tokenId, address indexed comprador, bytes32 Hash_Comprobante_Pago, string hashBoletaTexto);

    /**
     * @dev Constructor de KipuluxTrazabilidad.
     * @param initialOwner Dirección de la billetera del Relayer corporativo que administrará el sistema.
     */
    constructor(address initialOwner) 
        ERC721("Kipulux Trazabilidad Cuero", "KIPU") 
        Ownable(initialOwner) 
    {
        _tokenIdCounter = 0;
    }

    /**
     * @dev Mintea un nuevo certificado NFT de origen para una prenda.
     * Restringido únicamente al Relayer corporativo (VAULT_PRIVATE_KEY) a través de onlyOwner.
     * @param to Dirección destino que recibirá el NFT (ej. la Bóveda Corporativa o el Artesano).
     * @param tokenURI_ CID IPFS de metadatos estructurados.
     * @return El ID de token asignado.
     */
    function mintAuthorized(address to, string memory tokenURI_) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        _tokenIdCounter++;
        uint256 newTokenId = _tokenIdCounter;

        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI_);
        
        estadoToken[newTokenId] = EstadoPrenda.ORIGINADO;

        emit CertificadoOriginado(newTokenId, tokenURI_, to);
        return newTokenId;
    }

    /**
     * @dev Actualiza el estado de la prenda a CUSTODIA (en tienda/despacho).
     * @param tokenId ID del NFT de la prenda.
     */
    function actualizarCustodia(uint256 tokenId) 
        external 
        onlyOwner 
    {
        require(_ownerOf(tokenId) != address(0), "Kipulux: Token inexistente");
        estadoToken[tokenId] = EstadoPrenda.CUSTODIA;

        emit CustodiaActualizada(tokenId, EstadoPrenda.CUSTODIA);
    }

    /**
     * @dev Transfiere la custodia del NFT de la prenda del artesano a la tienda.
     * @param tokenId ID del NFT de la prenda.
     * @param tienda Dirección de la wallet de la tienda destino.
     */
    function transferirCustodia(uint256 tokenId, address tienda) 
        external 
        onlyOwner 
    {
        address actualOwner = ownerOf(tokenId);
        require(actualOwner != address(0), "Kipulux: Token inexistente");
        require(tienda != address(0), "Kipulux: Direccion de tienda invalida");
        
        estadoToken[tokenId] = EstadoPrenda.CUSTODIA;
        
        // Transferencia directa de la wallet del artesano a la tienda
        _safeTransfer(actualOwner, tienda, tokenId, "");
        
        emit CustodiaActualizada(tokenId, EstadoPrenda.CUSTODIA);
    }

    /**
     * @dev Registra la venta del producto. Almacena el hash SHA-256 de la boleta SUNAT,
     * cambia el estado a VENDIDO y transfiere el NFT de la prenda al comprador final.
     * @param tokenId ID del NFT del producto.
     * @param comprador Dirección de la wallet del comprador (billetera invisible o externa).
     * @param Hash_Comprobante_Pago_ Hash SHA-256 de 32 bytes del XML de la boleta SUNAT.
     */
    function registrarVenta(
        uint256 tokenId, 
        address comprador, 
        bytes32 Hash_Comprobante_Pago_
    ) 
        external 
        onlyOwner 
    {
        address actualOwner = ownerOf(tokenId);
        require(actualOwner != address(0), "Kipulux: Token inexistente");
        require(comprador != address(0), "Kipulux: Direccion de comprador invalida");
        require(Hash_Comprobante_Pago_ != bytes32(0), "Kipulux: Hash de SUNAT invalido");

        estadoToken[tokenId] = EstadoPrenda.VENDIDO;
        Hash_Comprobante_Pago[tokenId] = Hash_Comprobante_Pago_;

        // Transferir el NFT de la prenda al comprador
        _safeTransfer(actualOwner, comprador, tokenId, "");

        emit VentaRegistrada(tokenId, comprador, Hash_Comprobante_Pago_, "");
    }
}
