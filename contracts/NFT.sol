// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

abstract contract MetanoERC721 is ERC721 {
    function _metadataBaseURI() internal view virtual returns (string memory) {
        return "";
    }
}

abstract contract MetanoERC721URIStorage is MetanoERC721, ERC721URIStorage {
    using Strings for uint256;

    // Optional mapping for token URIs
    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => string) private _tokenMetadataURIs;

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        _requireMinted(tokenId);

        string memory _tokenURI = _tokenURIs[tokenId];
        string memory base = _baseURI();

        // If there is no base URI, return the token URI.
        if (bytes(base).length == 0) {
            return _tokenURI;
        }
        // If both are set, concatenate the baseURI and tokenURI (via abi.encodePacked).
        if (bytes(_tokenURI).length > 0) {
            return string(abi.encodePacked(base, _tokenURI));
        }

        return super.tokenURI(tokenId);
    }

    function tokenMetadataURI(uint256 tokenId)
        public
        view
        virtual
        returns (string memory)
    {
        _requireMinted(tokenId);

        string memory _tokenMetadataURI = _tokenMetadataURIs[tokenId];
        string memory base = _metadataBaseURI();

        // If there is no base URI, return the token URI.
        if (bytes(base).length == 0) {
            return _tokenMetadataURI;
        }
        // If both are set, concatenate the baseURI and tokenURI (via abi.encodePacked).
        if (bytes(_tokenMetadataURI).length > 0) {
            return string(abi.encodePacked(base, _tokenMetadataURI));
        }

        return super.tokenURI(tokenId);
    }

    function _setTokenURI(uint256 tokenId, string memory _tokenURI)
        internal
        virtual
        override
    {
        require(
            _exists(tokenId),
            "ERC721URIStorage: URI set of nonexistent token"
        );
        _tokenURIs[tokenId] = _tokenURI;
    }

    function _setTokenMetadataURI(uint256 tokenId, string memory _tokenURI)
        internal
        virtual
    {
        require(
            _exists(tokenId),
            "ERC721URIStorage: URI set of nonexistent token"
        );
        _tokenMetadataURIs[tokenId] = _tokenURI;
    }

    function _burn(uint256 tokenId)
        internal
        virtual
        override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);

        if (bytes(_tokenURIs[tokenId]).length != 0) {
            delete _tokenURIs[tokenId];
        }
    }
}

/// @custom:security-contact developers@metano.org
contract METANONFT is
    MetanoERC721,
    ERC721Enumerable,
    MetanoERC721URIStorage,
    ERC721Burnable,
    Ownable
{
    using Counters for Counters.Counter;
    string baseURI = "https://ipfs.io/ipfs/";
    string metadataBaseURI = "https://ipfs.io/ipfs/";
    Counters.Counter private _tokenIdCounter;

    constructor() ERC721("METANONFT", "MNFT") {}

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function _metadataBaseURI() internal view override returns (string memory) {
        return metadataBaseURI;
    }

    function safeMint(
        address to,
        string memory uri,
        string memory metadatauri
    ) public onlyOwner {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _setTokenMetadataURI(tokenId, metadatauri);
    }

    // The following functions are overrides required by Solidity.

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721, MetanoERC721URIStorage)
    {
        super._burn(tokenId);
    }

    function NFTowned(address owner) external view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);

        uint256[] memory tokensId = new uint256[](tokenCount);
        for (uint256 i; i < tokenCount; i++) {
            tokensId[i] = tokenOfOwnerByIndex(owner, i);
        }
        return tokensId;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, MetanoERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function tokenMetadataURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        return super.tokenMetadataURI(tokenId);
    }

    function setNewBase(string memory uri) public onlyOwner {
        baseURI = uri;
    }

    function setNewMetadataBase(string memory uri) public onlyOwner {
        metadataBaseURI = uri;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
