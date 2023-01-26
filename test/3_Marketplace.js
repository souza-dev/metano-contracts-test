const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { parseUnits, formatEther } = require("ethers/lib/utils");

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
    const Marketplace = await ethers.getContractFactory("MyMarketplace");
    const hardhatMarketplace = await Marketplace.deploy(hardhatToken.address);
    await hardhatMarketplace.deployed();

    //Transfere 3000 tokens do owner pro addr1 e pro addr2
    const ammount = parseUnits("3000", "ether");
    await hardhatToken.transfer(addr1.address, ammount);
    await hardhatToken.transfer(addr2.address, ammount);
    //Autoriza o market a utilizar todos os tokens do addr1 e addr2 para a venda.
    await hardhatToken
      .connect(addr1)
      .approve(hardhatMarketplace.address, ammount);
    await hardhatToken
      .connect(addr2)
      .approve(hardhatMarketplace.address, ammount);

    return {
      hardhatToken,
      hardhatNFT,
      hardhatMarketplace,
      owner,
      addr1,
      addr2,
    };
  }

  async function deployMarketplaceWith5NFTsOnMarketFixture() {
    const {
      hardhatToken,
      hardhatNFT,
      hardhatMarketplace,
      owner,
      addr1,
      addr2,
    } = await loadFixture(deployMarketplaceFixture);

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
    return {
      hardhatToken,
      hardhatNFT,
      hardhatMarketplace,
      owner,
      addr1,
      addr2,
    };
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
      const result = await hardhatMarketplace.getListingFee();
      expect(result).to.equal(0);
    });
    it("Setar o listingPrice para 5000 (função setListingFee()) e conferir se o getListingPrice retorna o valor setado.", async function () {
      const { hardhatMarketplace, owner } = await loadFixture(
        deployMarketplaceFixture
      );
      await hardhatMarketplace.setListingFee(5000);
      const result = await hardhatMarketplace.getListingFee();
      expect(result).to.equal(5000);
    });
    it("Setar o tokenAddress e conferir se foi setado corretamente.", async function () {
      const { hardhatToken, hardhatMarketplace, addr1 } = await loadFixture(
        deployMarketplaceFixture
      );
      await hardhatMarketplace.setTokenAddress(addr1.address);
      expect(await hardhatMarketplace.getTokenAddress()).to.equal(
        addr1.address
      );
    });
  });
  describe("Operações dentro do market", function () {
    describe("Todas as funções de fetch devem retornar um array vazio em um deploy novo.", function () {
      it("Confere o fetchActiveItems() de um nova conta e dever retornar um array vazio", async function () {
        const { hardhatMarketplace, owner } = await loadFixture(
          deployMarketplaceFixture
        );
        const result = await hardhatMarketplace.fetchActiveItems();
        expect(result).to.be.empty;
      });
      it("Confere o fetchMyPurchasedItems de um nova conta e dever retornar um array vazio", async function () {
        const { hardhatMarketplace, owner } = await loadFixture(
          deployMarketplaceFixture
        );
        const result = await hardhatMarketplace.fetchMyPurchasedItems();
        expect(result).to.be.empty;
      });
      it("Confere o fetchMyCreatedItems de um nova conta e dever retornar um array vazio", async function () {
        const { hardhatMarketplace, owner } = await loadFixture(
          deployMarketplaceFixture
        );
        const result = await hardhatMarketplace.fetchMyCreatedItems();
        expect(result).to.be.empty;
      });
    });

    describe("Funcionamento da função fetchActiveItems", function () {
      it("Cria 5 MarketItems e deleta um item. A função fetchActiveItems deve retornar 5.", async function () {
        const { hardhatNFT, hardhatMarketplace } = await loadFixture(
          deployMarketplaceWith5NFTsOnMarketFixture
        );
        //Confere que possui 5 items no market
        const itemsOnMarket = await hardhatMarketplace.fetchActiveItems();
        expect(itemsOnMarket.length).to.equal(5);
      });

      it("Cria 5 MarketItems e deleta um item. A função fetchActiveItems deve retornar 4.", async function () {
        const { hardhatNFT, hardhatMarketplace } = await loadFixture(
          deployMarketplaceWith5NFTsOnMarketFixture
        );
        //Confere que possui 5 items no market
        const itemsOnMarket = await hardhatMarketplace.fetchActiveItems();
        expect(itemsOnMarket.length).to.equal(5);
        //Deleta um item.
        await hardhatMarketplace.deleteMarketItem(3);
        //O market agora precisa ter 4 items.
        const newItemsOnMarket = await hardhatMarketplace.fetchActiveItems();
        expect(newItemsOnMarket.length).to.equal(4);
      });
      it("Cria 5 MarketItems e deleta um item. A função fetchMarketItems deve retornar um array que não possui o item deletado.", async function () {
        const { hardhatNFT, hardhatMarketplace } = await loadFixture(
          deployMarketplaceWith5NFTsOnMarketFixture
        );
        //Confere que o market possui 5 items.
        const itemsOnMarket = await hardhatMarketplace.fetchActiveItems();
        expect(itemsOnMarket.length).to.equal(5);
        //Deleta o item com id igual a 3.
        await hardhatMarketplace.deleteMarketItem(3);
        //O market agora não deve possuir o item com id igual a 3.
        const newItemsOnMarket = await hardhatMarketplace.fetchActiveItems();
        expect(newItemsOnMarket).not.include(itemsOnMarket[3]);
      });
      it("Cria 5 MarketItems, realiza uma venda. A função fetchMarketItems deve retornar 4 items.", async function () {
        const { hardhatToken, hardhatNFT, hardhatMarketplace, addr1, owner } =
          await loadFixture(deployMarketplaceWith5NFTsOnMarketFixture);
        //Confere que o market possui 5 items.
        const itemsOnMarket = await hardhatMarketplace.fetchActiveItems();
        expect(itemsOnMarket.length).to.equal(5);
        //Conecta com o addr1 e compra o item 3.
        await hardhatMarketplace
          .connect(addr1)
          .createMarketSale(hardhatNFT.address, 3, {
            value: ethers.utils.parseEther("0.001"),
          });
        //O market agora deve possuir 4 items.
        const newItemsOnMarket = await hardhatMarketplace.fetchActiveItems();
        expect(newItemsOnMarket.length).to.equal(4);
      });
      it("Cria 5 MarketItems, realiza uma venda. A função fetchMarketItems deve retornar um array que não possui o item vendido.", async function () {
        const { hardhatToken, hardhatNFT, hardhatMarketplace, addr1, owner } =
          await loadFixture(deployMarketplaceWith5NFTsOnMarketFixture);
        //Confere que o market possui 5 items.
        const itemsOnMarket = await hardhatMarketplace.fetchActiveItems();
        expect(itemsOnMarket.length).to.equal(5);
        //Conecta com o addr1 e compra o item 3.
        await hardhatMarketplace
          .connect(addr1)
          .createMarketSale(hardhatNFT.address, 3, {
            value: ethers.utils.parseEther("0.001"),
          });
        //O market agora não deve possuir o item com id igual a 3.
        const newItemsOnMarket = await hardhatMarketplace.fetchActiveItems();
        expect(newItemsOnMarket).not.include(itemsOnMarket[3]);
      });
    });

    describe("Funcionamento da função fetchMyPurchasedItems", function () {
      it("Cria 5 MarketItems. A função fetchItemsCreated deve retornar 5 items.", async function () {
        const { hardhatNFT, hardhatMarketplace } = await loadFixture(
          deployMarketplaceWith5NFTsOnMarketFixture
        );
        expect(await hardhatMarketplace.fetchItemsCreated()).to.equal(5);
      });
      it("Cria 5 MarketItems e remove um item. A função fetchItemsCreated deve retornar 5 items.", async function () {
        const { hardhatNFT, hardhatMarketplace } = await loadFixture(
          deployMarketplaceWith5NFTsOnMarketFixture
        );
        expect(await hardhatMarketplace.fetchItemsCreated()).to.equal(5);
      });
      it("Cria 5 MarketItems e deleta 2 e confere o funcionamento da função fetchItemsCreated.", async function () {});
      it("Cria 5 MarketItems e deleta 2 e confere o funcionamento da função fetchItemsCreated.", async function () {});
      it("Cria 5 MarketItems, realiza uma venda e confere o funcionamento da função fetchItemsCreated.", async function () {});
    });

    describe("Funcionamento da função fetchMyCreatedItems.", function () {
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
