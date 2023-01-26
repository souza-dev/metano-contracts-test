const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect, should } = require("chai");
const { BigNumber } = require("ethers");

describe("NFT contract", function () {
  async function deployTokenFixture() {
    const NFT = await ethers.getContractFactory("METANONFT");
    const [owner, addr1, addr2] = await ethers.getSigners();
    const hardhatNFT = await NFT.deploy();
    await hardhatNFT.deployed();
    return { NFT, hardhatNFT, owner, addr1, addr2 };
  }

  async function safeMintFakeNFTFixture() {
    const { NFT, hardhatNFT, owner, addr1, addr2 } = await loadFixture(
      deployTokenFixture
    );
    await hardhatNFT.safeMint(owner.address, "CIDIMAGE", "CIDMETA");
    return { NFT, hardhatNFT, owner, addr1, addr2 };
  }

  async function safeMint3NFTsFixture() {
    const { NFT, hardhatNFT, owner, addr1, addr2 } = await loadFixture(
      deployTokenFixture
    );
    for (let i = 0; i < 3; i++) {
      await hardhatNFT.safeMint(owner.address, "CIDIMAGE" + i, "CIDMETA" + i);
    }
    return { NFT, hardhatNFT, owner, addr1, addr2 };
  }

  describe("Deployment", function () {
    it("Verificar se foi setado o verdadeiro owner", async function () {
      const { hardhatNFT, owner } = await loadFixture(deployTokenFixture);
      const result = await hardhatNFT.owner();
      expect(result).to.equal(owner.address);
    });
    it("A função name() deve retornar METANONFT", async function () {
      const { hardhatNFT } = await loadFixture(deployTokenFixture);
      const name = await hardhatNFT.name();
      expect(name).to.equal("METANONFT");
    });
    it("A função symbol() deve retornar MNFT", async function () {
      const { hardhatNFT } = await loadFixture(deployTokenFixture);
      const name = await hardhatNFT.symbol();
      expect(name).to.equal("MNFT");
    });
  });

  describe("Setups", function () {
    it("Deve fazer o mint do NFT e verificar o tokenURI e tokenMetadaDataURI", async function () {
      const { hardhatNFT } = await loadFixture(safeMintFakeNFTFixture);
      const tokenURI = await hardhatNFT.tokenURI(0);
      const tokenMetadataURI = await hardhatNFT.tokenMetadataURI(0);
      expect(tokenURI).to.equal("https://ipfs.io/ipfs/CIDIMAGE");
      expect(tokenMetadataURI).to.equal("https://ipfs.io/ipfs/CIDMETA");
    });
    it("Funcionamento da função burn()", async function () {
      const { hardhatNFT } = await loadFixture(safeMintFakeNFTFixture);
      const totalSupply1 = await hardhatNFT.totalSupply();
      expect(totalSupply1).to.equal(1);
      await hardhatNFT.burn(0);
      const totalSupply2 = await hardhatNFT.totalSupply();
      expect(totalSupply2).to.equal(0);
    });
    it("Setar nova base URI", async function () {
      const newbase = "https://newbase/";
      const { hardhatNFT } = await loadFixture(safeMintFakeNFTFixture);
      await hardhatNFT.setNewBase(newbase);
      const tokenURI = await hardhatNFT.tokenURI(0);
      expect(tokenURI).to.equal(newbase + "CIDIMAGE");
    });
    it("Setar nova base METADA", async function () {
      const newbase = "https://newbase/";
      const { hardhatNFT } = await loadFixture(safeMintFakeNFTFixture);
      await hardhatNFT.setNewMetadataBase(newbase);
      const tokenMetadaURI = await hardhatNFT.tokenMetadataURI(0);
      expect(tokenMetadaURI).to.equal(newbase + "CIDMETA");
    });
    it("NFTOwned deve retorar os NFTs que o owner possui.", async function () {
      const { hardhatNFT, addr1, owner } = await loadFixture(
        safeMintFakeNFTFixture
      );
      const owned = await hardhatNFT.NFTowned(owner.address);
      expect(owned.length).to.equal(1);
    });
    it("Teste da função tokenByIndex", async function () {
      //Retorna o id do token pelo index (posição).
      //Criar 3 tokens e dar burn no segundo.
      //O index tem que retornar um token diferente de antes do burn.
      const { hardhatNFT } = await loadFixture(safeMint3NFTsFixture);
      const tokenId = await hardhatNFT.tokenByIndex(1);
      await hardhatNFT.burn(1);
      const tokenId2 = await hardhatNFT.tokenByIndex(1);
      expect(tokenId).to.not.equal(tokenId2);
    });
  });

  describe("Operações referentes ao uso do NFT no market", function () {
    it("Retornar 0x0 pra um NFT não aprovado para nenhum address (market)", async function () {
      const { hardhatNFT } = await loadFixture(safeMintFakeNFTFixture);
      const result = await hardhatNFT.getApproved(0);
      expect(result).to.equal(ethers.constants.AddressZero);
    });
    it("Approvar o nft para um address (market)", async function () {
      const { hardhatNFT, addr1 } = await loadFixture(safeMintFakeNFTFixture);
      await hardhatNFT.approve(addr1.address, 0);
      const result = await hardhatNFT.getApproved(0);
      expect(result).to.equal(addr1.address);
    });
    it("Deve retornar falso quando chamado o isApprovedForAll", async function () {
      const { hardhatNFT, addr1, owner } = await loadFixture(
        safeMintFakeNFTFixture
      );
      const approved = await hardhatNFT.isApprovedForAll(
        owner.address,
        addr1.address
      );
      expect(approved).to.equal(false);
    });
    it("Deve retornar verdadeiro quando chamado o isApprovedForAll", async function () {
      const { hardhatNFT, addr1, owner } = await loadFixture(
        safeMintFakeNFTFixture
      );
      await hardhatNFT.setApprovalForAll(addr1.address, true);
      const approved = await hardhatNFT.isApprovedForAll(
        owner.address,
        addr1.address
      );
      expect(approved).to.equal(true);
    });
    it("ownerOf", async function () {
      const { hardhatNFT, addr1, owner } = await loadFixture(
        safeMintFakeNFTFixture
      );
      const result = await hardhatNFT.ownerOf(0);
      expect(result).to.equal(owner.address);
    });
  });

  describe("Transactions", function () {
    it("Transferência do NFT entre contas (transferFrom()", async function () {
      //Faz o mint de 3 NFTs para o owner
      const { hardhatNFT, addr1, owner } = await loadFixture(
        safeMint3NFTsFixture
      );
      //Confere se o owner tem 3 NFTs e o addr1 tem 0 NFTs.
      const nftsOfOwner = await hardhatNFT.NFTowned(owner.address);
      const nftsOfAddr1 = await hardhatNFT.NFTowned(addr1.address);
      expect(nftsOfOwner.length).to.equal(3);
      expect(nftsOfAddr1.length).to.equal(0);
      //Transfere o token de id 1 do owner pro addr1
      await hardhatNFT.transferFrom(owner.address, addr1.address, 1);
      //Agora o owner precisa ter 2 nfts e o addre1 ter 1 nft.
      const newNftsOfOwner = await hardhatNFT.NFTowned(owner.address);
      const newNftsOfAddr1 = await hardhatNFT.NFTowned(addr1.address);
      expect(newNftsOfOwner.length).to.equal(2);
      expect(newNftsOfAddr1.length).to.equal(1);
      //Verifica se o dono do NFT 1 é o address do addr1
      const ownerOfNFT1 = await hardhatNFT.ownerOf(1);
      expect(ownerOfNFT1).to.equal(addr1.address);
    });

    it("Falhar se a tentar transferir o NFT para um conta inexistente", async function () {
      const { hardhatNFT, addr1, owner } = await loadFixture(
        safeMint3NFTsFixture
      );
      //Tenta transfir o nft para um conta que não existe
      // const result = await hardhatNFT.transferFrom(owner.address, "2", 1);
      // console.log(result);
      // expect(result).to.be.revertedWith("network does not suppor");
    });
    it("Transferir a propriedade do NFT (transferOwnership)", async function () {});
  });

  describe("Funções", function () {
    it("rennounceOwnership", function () {});

    it("safeTransferFrom", function () {});

    it("transferFrom", function () {});
    it("transferOwnership", function () {});
    it("balanceOf", function () {});

    it("supportInterface", function () {});

    it("tokenOfOwnerByIndex", async function () {
      //Returns a token ID owned by owner at a given index of its token list.
      //Use along with balanceOf to enumerate all of owner's tokens.
    });

    it("totalSupply", async function () {});
  });
});
