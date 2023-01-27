const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { default: add } = require("@openzeppelin/cli/lib/scripts/add");
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

    //O fetchActiveItems filtra os items pelo state = Stated.Created, buyer = address(0) e aprovados pro market.
    describe("Funcionamento da função fetchActiveItems", function () {
      it("Os items retornados pelo fetchActiveItems devem possuir state = Stated.Created.", async function () {
        const { hardhatNFT, hardhatMarketplace } = await loadFixture(
          deployMarketplaceWith5NFTsOnMarketFixture
        );
        //Confere que possui 5 items no market
        const itemsOnMarket = await hardhatMarketplace.fetchActiveItems();
        itemsOnMarket.forEach((item) => expect(item.state).to.equal(0));
      });
      it("Os items retornados pelo fetchActiveItems devem possuir buyer = address(0).", async function () {
        const { hardhatNFT, hardhatMarketplace } = await loadFixture(
          deployMarketplaceWith5NFTsOnMarketFixture
        );
        //Confere que possui 5 items no market
        const itemsOnMarket = await hardhatMarketplace.fetchActiveItems();
        itemsOnMarket.forEach((item) =>
          expect(item.buyer).to.equal(
            "0x0000000000000000000000000000000000000000"
          )
        );
      });
      // it("Os items retornados pelo fetchActiveItems devem retornar o address do market ao chamar a função getApproved().", async function () {
      //   const { hardhatNFT, hardhatMarketplace } = await loadFixture(
      //     deployMarketplaceWith5NFTsOnMarketFixture
      //   );
      //   //Confere que possui 5 items no market
      //   const itemsOnMarket = await hardhatMarketplace.fetchActiveItems();
      //   itemsOnMarket.forEach((item) => console.log(item.id));
      // });

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
      it("Compra item no market usando o addr1 e confere se o fetchMyPurchasedItems retorna o item comprado.", async function () {
        const { addr1, hardhatNFT, hardhatMarketplace } = await loadFixture(
          deployMarketplaceWith5NFTsOnMarketFixture
        );
        //Conecta com o addr1 e compra o item 3.
        await hardhatMarketplace
          .connect(addr1)
          .createMarketSale(hardhatNFT.address, 3, {
            value: ethers.utils.parseEther("0.001"),
          });

        const itemPurchased = await hardhatMarketplace
          .connect(addr1)
          .fetchMyPurchasedItems();
        expect(itemPurchased[0].id).to.equal(3);
      });
      it("Compra item no market usando o addr1 e confere se o fetchMyPurchasedItems retorna o item com buyer ==  addr1.address.", async function () {
        const { addr1, hardhatNFT, hardhatMarketplace } = await loadFixture(
          deployMarketplaceWith5NFTsOnMarketFixture
        );
        //Conecta com o addr1 e compra o item 3.
        await hardhatMarketplace
          .connect(addr1)
          .createMarketSale(hardhatNFT.address, 3, {
            value: ethers.utils.parseEther("0.001"),
          });

        const itemPurchased = await hardhatMarketplace
          .connect(addr1)
          .fetchMyPurchasedItems();
        expect(itemPurchased[0].buyer).to.equal(addr1.address);
      });
      it("Compra item no market usando o addr1 e confere se o fetchMyPurchasedItems retorna o item com seller = owner.address.", async function () {
        const { owner, addr1, hardhatNFT, hardhatMarketplace } =
          await loadFixture(deployMarketplaceWith5NFTsOnMarketFixture);
        //Conecta com o addr1 e compra o item 3.
        await hardhatMarketplace
          .connect(addr1)
          .createMarketSale(hardhatNFT.address, 3, {
            value: ethers.utils.parseEther("0.001"),
          });

        const itemPurchased = await hardhatMarketplace
          .connect(addr1)
          .fetchMyPurchasedItems();
        expect(itemPurchased[0].seller).to.equal(owner.address);
      });
    });

    describe("Funcionamento da função fetchMyCreatedItems.", function () {
      it("Cria 5 MarketItems. A função fetchMyCreatedItems deve retornar 5 items.", async function () {
        const { addr1, hardhatNFT, hardhatMarketplace } = await loadFixture(
          deployMarketplaceWith5NFTsOnMarketFixture
        );
        const myCreatedItems = await hardhatMarketplace.fetchMyCreatedItems();
        expect(myCreatedItems.length).to.equal(5);
      });
      it("Cria 5 MarketItems. A função fetchMyCreatedItems deve retornar 5 items com state = 0 (Created).", async function () {
        const { addr1, hardhatNFT, hardhatMarketplace } = await loadFixture(
          deployMarketplaceWith5NFTsOnMarketFixture
        );
        const myCreatedItems = await hardhatMarketplace.fetchMyCreatedItems();
        myCreatedItems.forEach((item) => expect(item.state).to.equal(0));
      });
      it("Cria 5 items e deleta 2. A função fetchMyCreatedItems deve retornar 3 items com state = 0 (Created)", async function () {
        const { addr1, hardhatNFT, hardhatMarketplace } = await loadFixture(
          deployMarketplaceWith5NFTsOnMarketFixture
        );

        await hardhatMarketplace.deleteMarketItem(2);
        await hardhatMarketplace.deleteMarketItem(3);
        const myCreatedItems = await hardhatMarketplace.fetchMyCreatedItems();
        expect(myCreatedItems.length).to.equal(3);
        myCreatedItems.forEach((item) => expect(item.state).to.equal(0));
      });
      it("Cria 5 items e realisa 2 compras. A função fetchMyCreatedItems deve retornar 3 items com state = 0 (Created) e 2 items com o state = 1 (Release)", async function () {
        const { addr1, hardhatNFT, hardhatMarketplace } = await loadFixture(
          deployMarketplaceWith5NFTsOnMarketFixture
        );
        await hardhatMarketplace
          .connect(addr1)
          .createMarketSale(hardhatNFT.address, 2, {
            value: ethers.utils.parseEther("0.001"),
          });
        await hardhatMarketplace
          .connect(addr1)
          .createMarketSale(hardhatNFT.address, 3, {
            value: ethers.utils.parseEther("0.001"),
          });

        const myCreatedItems = await hardhatMarketplace.fetchMyCreatedItems();
        //Estranhamente os ids do market não começam no zero.
        //Então o item com id 2 está na posição 1 e com id 3 na posição 2.
        expect(myCreatedItems.length).to.equal(5);
        expect(myCreatedItems[0].state).to.equal(0);
        expect(myCreatedItems[1].state).to.equal(1);
        expect(myCreatedItems[2].state).to.equal(1);
        expect(myCreatedItems[3].state).to.equal(0);
        expect(myCreatedItems[4].state).to.equal(0);
      });
    });

    describe("Funcionamento das transações durante a venda", function () {
      it("O valor do item comprado deve ter sido transferido pro vendedor.", async function () {});
      it("A taxa de venda deve ter sido transferida pro owner do market.", async function () {});
    });
  });
});
