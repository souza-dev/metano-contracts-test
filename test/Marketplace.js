const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { parseUnits } = require("ethers/lib/utils");

describe("Marketplace contract", function () {
  //Faz o deploy do contrato do Marketplace.
  async function deployMarketplaceFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    //Faz deploy do contrato do Token
    const Token = await ethers.getContractFactory("MetanoTestToken");
    const hardhatToken = await Token.deploy();
    await hardhatToken.deployed();
    //Faz deploy do contrato do NFT
    const NFT = await ethers.getContractFactory("METANONFT");
    const hardhatNFT = await NFT.deploy();
    await hardhatNFT.deployed();
    //Faz deploy do contrato do Market usando o address do Token como parâmetro.
    const Marketplace = await ethers.getContractFactory("NFTMarket");
    const hardhatMarketplace = await Marketplace.deploy(hardhatToken.address);
    await hardhatMarketplace.deployed();
    //Autoriza o market a utilizar o Token com o valor máximo proposto pelo Diego.
    await hardhatToken.approve(hardhatMarketplace.address, 115792);
    return { hardhatNFT, hardhatMarketplace, owner, addr1, addr2 };
  }

  async function deployMarketplaceWith5NFTsOnMarketFixture() {
    const { hardhatNFT, hardhatMarketplace, owner, addr1, addr2 } =
      await loadFixture(deployMarketplaceFixture);

    //Faz o mint de 5 NFTs para o owner.
    for (let i = 0; i < 5; i++) {
      await hardhatNFT.safeMint(owner.address, "CIDIMAGE" + i, "CIDMETA" + i);
    }
    //Cria 5 items no market.
    for (let i = 0; i < 5; i++) {
      await hardhatNFT.approve(hardhatMarketplace.address, i);
      await hardhatMarketplace.createMarketItem(
        hardhatNFT.address,
        i,
        parseUnits("0.001", "ether")
      );
    }
    return { hardhatNFT, hardhatMarketplace, owner, addr1, addr2 };
  }

  describe("Deployment e setups", function () {
    it("Fazer o deploy do marketplace e confere o address do owner.", async function () {
      const { hardhatMarketplace, owner } = await loadFixture(
        deployMarketplaceFixture
      );
      const result = await hardhatMarketplace.owner();
      expect(result).to.equal(owner.address);
    });
    it("O getListingPrice deve retornar 0.", async function () {
      const { hardhatMarketplace, owner } = await loadFixture(
        deployMarketplaceFixture
      );
      const result = await hardhatMarketplace.getListingPrice();
      expect(result).to.equal(0);
    });
    it("Setar o listingPrice para 5000 (função setListingFee()) e conferir se o getListingPrice retorna o valor setado.", async function () {
      const { hardhatMarketplace, owner } = await loadFixture(
        deployMarketplaceFixture
      );
      await hardhatMarketplace.setListingFee(5000);
      const result = await hardhatMarketplace.getListingPrice();
      expect(result).to.equal(5000);
    });
    it("Setar o tokenAddress e conferir se foi setado.", async function () {
      const { hardhatToken, hardhatMarketplace, owner } = await loadFixture(
        deployMarketplaceFixture
      );
      await hardhatMarketplace.setTokenAddress(hardhatToken.address);
      expect(
        "Não exite função para conferir o token setado pelo setTokenAddress"
      ).to.equal("");
    });
  });
  describe("Operações dentro do market", function () {
    describe("Todas as funções de fetch devem retornar um array vazio em um deploy novo.", function () {
      it("Confere o fetchMyNFTs de um nova conta e dever retornar um array vazio", async function () {
        const { hardhatMarketplace, owner } = await loadFixture(
          deployMarketplaceFixture
        );
        const result = await hardhatMarketplace.fetchMyNFTs();
        expect(result).to.be.empty;
      });
      it("Confere o fetchItemsCreated de um nova conta e dever retornar um array vazio", async function () {
        const { hardhatMarketplace, owner } = await loadFixture(
          deployMarketplaceFixture
        );
        const result = await hardhatMarketplace.fetchItemsCreated();
        expect(result).to.be.empty;
      });
      it("Confere o fetchMarketItems de um nova conta e dever retornar um array vazio", async function () {
        const { hardhatMarketplace, owner } = await loadFixture(
          deployMarketplaceFixture
        );
        const result = await hardhatMarketplace.fetchMarketItems();
        expect(result).to.be.empty;
      });

      describe("Funcionamento da função fetchMarketItems", function () {
        it("Cria 5 MarketItems e deleta um item. A função fetchMarketItems deve retornar 4 items.", async function () {
          const { hardhatNFT, hardhatMarketplace } = await loadFixture(
            deployMarketplaceWith5NFTsOnMarketFixture
          );
          const itemsOnMarket = await hardhatMarketplace.fetchMarketItems();
          expect(itemsOnMarket.length).to.equal(5);
          await hardhatMarketplace.deleteMarketItem(3);
          expect(itemsOnMarket.length).to.equal(4);
        });
        it("Cria 5 MarketItems e deleta um item. A função fetchMarketItems deve retornar um array que não possui o item deletado.", async function () {
          const { hardhatNFT, hardhatMarketplace } = await loadFixture(
            deployMarketplaceWith5NFTsOnMarketFixture
          );
          const itemsOnMarket = await hardhatMarketplace.fetchMarketItems();
          expect(itemsOnMarket.length).to.equal(5);
          await hardhatMarketplace.deleteMarketItem(3);
          const itemsOnMarket2 = await hardhatMarketplace.fetchMarketItems();
          expect(itemsOnMarket2).not.include(itemsOnMarket[3]);
        });
        it("Cria 5 MarketItems, realiza uma venda. A função fetchMarketItems deve retornar 4 items.", async function () {
          const { hardhatNFT, hardhatMarketplace, addr1 } = await loadFixture(
            deployMarketplaceWith5NFTsOnMarketFixture
          );
          const itemsOnMarket = await hardhatMarketplace.fetchMarketItems();
          expect(itemsOnMarket.length).to.equal(5);

          await hardhatMarketplace
            .connect(addr1)
            .createMarketSale(hardhatNFT.address, 3);
          expect(itemsOnMarket.length).to.equal(4);
        });
      });
    });

    describe("Funcionamento da função fetchItemsCreated", function () {
      it("Cria 5 MarketItems e confere o funcionamento da função fetchItemsCreated.", async function () {
        const { hardhatNFT, hardhatMarketplace } = loadFixture(
          deployMarketplaceWith5NFTsOnMarketFixture
        );

        for (let i = 0; i < 5; i++) {
          await hardhatNFT.approve(hardhatMarketplace.address, i);
          await hardhatMarketplace.createMarketItem(
            hardhatNFT.address,
            i,
            parseUnits("0.001", "ether")
          );
        }
      });
      it("Cria 5 MarketItems e deleta 2 e confere o funcionamento da função fetchItemsCreated.", async function () {});
      it("Cria 5 MarketItems e deleta 2 e confere o funcionamento da função fetchItemsCreated.", async function () {});
      it("Cria 5 MarketItems, realiza uma venda e confere o funcionamento da função fetchItemsCreated.", async function () {});
    });

    describe("Funcionamento da função fetchMyNFTs.", function () {
      it("Cria 5 MarketItems e confere o funcionamento da função fetchMyNFTs.", async function () {
        //Não entendi ainda o funcionamento dessa função. Me parece que ela faz o mesmo
        //que o NFTOwned do contrato do NFT. Porém essa aqui sempre esta retornando vazio.
      });
      it("Cria 5 MarketItems e deleta 2 e confere o funcionamento da função fetchMyNFTs.", async function () {});
      it("Cria 5 MarketItems e deleta 2 e confere o funcionamento da função fetchMyNFTs.", async function () {});
      it("Cria 5 MarketItems, realiza uma venda e confere o funcionamento da função fetchMyNFTs.", async function () {});
    });
  });
});
