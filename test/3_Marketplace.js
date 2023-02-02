const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { default: add } = require("@openzeppelin/cli/lib/scripts/add");
const { expect } = require("chai");
const { parseUnits, formatEther, parseEther } = require("ethers/lib/utils");

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
    it("Transferir a propriedade do market para o addr1 (que passa a ser o novo owner).", async function () {
      const { hardhatToken, hardhatMarketplace, addr1 } = await loadFixture(
        deployMarketplaceFixture
      );
      await hardhatMarketplace.transferOwnership(addr1.address);
      expect(await hardhatMarketplace.owner()).to.equal(addr1.address);
    });
  });

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
  // ------- TESTE COM AS FUNÇÕES BÁSICAS DO MARKET-----------------------
  describe("Testes com a função createMarketItem()", function () {
    it("Cria um item e confere se ele foi criado.", async function () {
      const { hardhatNFT, hardhatMarketplace, owner } = await loadFixture(
        deployMarketplaceFixture
      );
      await hardhatNFT.safeMint(owner.address, "CIDIMAGE", "CIDMETA");
      await hardhatNFT.approve(hardhatMarketplace.address, 0);
      await hardhatMarketplace.createMarketItem(
        hardhatNFT.address,
        0,
        parseUnits("0.001", "ether")
      );
      const activeItems = await hardhatMarketplace.fetchActiveItems();
      expect(activeItems.length).to.equal(1);
    });
    it("Cria um item e confere se ele foi transferido para o market.", async function () {
      const { hardhatNFT, hardhatMarketplace, owner } = await loadFixture(
        deployMarketplaceFixture
      );
      await hardhatNFT.safeMint(owner.address, "CIDIMAGE", "CIDMETA");
      await hardhatNFT.approve(hardhatMarketplace.address, 0);
      await hardhatMarketplace.createMarketItem(
        hardhatNFT.address,
        0,
        parseUnits("0.001", "ether")
      );
      expect(await hardhatNFT.ownerOf(0)).to.equal(hardhatMarketplace.address);
    });
    it("Verifica se o item criado possui o seller com o address do sender.", async function () {
      const { hardhatNFT, hardhatMarketplace, owner } = await loadFixture(
        deployMarketplaceFixture
      );
      await hardhatNFT.safeMint(owner.address, "CIDIMAGE", "CIDMETA");
      await hardhatNFT.approve(hardhatMarketplace.address, 0);
      await hardhatMarketplace.createMarketItem(
        hardhatNFT.address,
        0,
        parseUnits("0.001", "ether")
      );
      const activeItems = await hardhatMarketplace.fetchActiveItems();
      expect(activeItems[0].seller).to.equal(owner.address);
    });
    it("Verifica se o item criado possui o buyer com o address 0x0.", async function () {
      const { hardhatNFT, hardhatMarketplace, owner } = await loadFixture(
        deployMarketplaceFixture
      );
      await hardhatNFT.safeMint(owner.address, "CIDIMAGE", "CIDMETA");
      await hardhatNFT.approve(hardhatMarketplace.address, 0);
      await hardhatMarketplace.createMarketItem(
        hardhatNFT.address,
        0,
        parseUnits("0.001", "ether")
      );
      const activeItems = await hardhatMarketplace.fetchActiveItems();
      expect(activeItems[0].buyer).to.equal(ethers.constants.AddressZero);
    });
    it("Verifica se o item criado possui state = 0 (Created).", async function () {
      const { hardhatNFT, hardhatMarketplace, owner } = await loadFixture(
        deployMarketplaceFixture
      );
      await hardhatNFT.safeMint(owner.address, "CIDIMAGE", "CIDMETA");
      await hardhatNFT.approve(hardhatMarketplace.address, 0);
      await hardhatMarketplace.createMarketItem(
        hardhatNFT.address,
        0,
        parseUnits("0.001", "ether")
      );
      const activeItems = await hardhatMarketplace.fetchActiveItems();
      expect(activeItems[0].state).to.equal(0);
    });
    it("O item não pode ser criado com price igual a 0.", async function () {
      const { hardhatNFT, hardhatMarketplace, owner } = await loadFixture(
        deployMarketplaceFixture
      );
      await hardhatNFT.safeMint(owner.address, "CIDIMAGE", "CIDMETA");
      await hardhatNFT.approve(hardhatMarketplace.address, 0);

      await expect(
        hardhatMarketplace.createMarketItem(
          hardhatNFT.address,
          0,
          parseUnits("0", "ether")
        )
      ).to.be.revertedWith("Price must be at least 1 wei");
    });
    it("O item não pode ser criado com um listingFee menor que o valor setado.", async function () {
      const { hardhatNFT, hardhatMarketplace, owner } = await loadFixture(
        deployMarketplaceFixture
      );
      await hardhatNFT.safeMint(owner.address, "CIDIMAGE", "CIDMETA");
      await hardhatNFT.approve(hardhatMarketplace.address, 0);
      await hardhatMarketplace.setListingFee(parseUnits("0.001", "ether"));

      await expect(
        hardhatMarketplace.createMarketItem(
          hardhatNFT.address,
          0,
          parseUnits("0.001", "ether")
        )
      ).to.be.revertedWith("Fee must be equal to listing fee");
    });
    it("O item não pode ser criado se o sender não for o dono do NFT.", async function () {
      const { hardhatNFT, hardhatMarketplace, owner, addr1 } =
        await loadFixture(deployMarketplaceFixture);
      await hardhatNFT.safeMint(owner.address, "CIDIMAGE", "CIDMETA");
      await hardhatNFT.approve(hardhatMarketplace.address, 0);

      await expect(
        hardhatMarketplace
          .connect(addr1)
          .createMarketItem(hardhatNFT.address, 0, parseUnits("0.001", "ether"))
      ).to.be.revertedWith("must be the owner");
    });
  });

  describe("Testes com a função deleteMarketItem()", function () {
    it("Cria 5 MarketItems e deleta um item. Deve existir 4 itens no market.", async function () {
      const { hardhatNFT, hardhatMarketplace } = await loadFixture(
        deployMarketplaceWith5NFTsOnMarketFixture
      );
      //Deleta um item.
      await hardhatMarketplace.deleteMarketItem(3);
      //O market agora precisa ter 4 items.
      const newItemsOnMarket = await hardhatMarketplace.fetchActiveItems();
      expect(newItemsOnMarket.length).to.equal(4);
    });
    it("Cria 5 itens no market e deleta um item. O market deve não possuir mais esse item.", async function () {
      const { hardhatNFT, hardhatMarketplace } = await loadFixture(
        deployMarketplaceWith5NFTsOnMarketFixture
      );
      //Confere que o market possui 5 items.
      const itemsOnMarket = await hardhatMarketplace.fetchActiveItems();
      //Deleta o item com id igual a 3.
      await hardhatMarketplace.deleteMarketItem(3);
      //O market agora não deve possuir o item com id igual a 3.
      const newItemsOnMarket = await hardhatMarketplace.fetchActiveItems();
      expect(newItemsOnMarket).not.include(itemsOnMarket[3]);
    });
    it("O item deletado não deve ser retornado ao chamar a função fetchMyCreatedItems (devido ao state =2).", async function () {
      const { hardhatNFT, hardhatMarketplace, owner } = await loadFixture(
        deployMarketplaceFixture
      );
      await hardhatNFT.safeMint(owner.address, "CIDIMAGE", "CIDMETA");
      await hardhatNFT.approve(hardhatMarketplace.address, 0);
      await hardhatMarketplace.createMarketItem(
        hardhatNFT.address,
        0,
        parseUnits("0.001", "ether")
      );
      //Deleta um item.
      await hardhatMarketplace.deleteMarketItem(0);
      const createdItems = await hardhatMarketplace.fetchMyCreatedItems();
      expect(createdItems).to.be.empty;
    });
    it("A operação não deve acontecer se o id no market não existe.", async function () {
      const { hardhatNFT, hardhatMarketplace, owner } = await loadFixture(
        deployMarketplaceFixture
      );
      await hardhatNFT.safeMint(owner.address, "CIDIMAGE", "CIDMETA");
      await hardhatNFT.approve(hardhatMarketplace.address, 0);
      await hardhatMarketplace.createMarketItem(
        hardhatNFT.address,
        0,
        parseUnits("0.001", "ether")
      );
      //Deleta um item.
      await expect(hardhatMarketplace.deleteMarketItem(1)).to.be.revertedWith(
        "id must < item count"
      );
    });
    it("A operação não deve acontecer se o item não está no market.", async function () {
      const { hardhatNFT, hardhatMarketplace, owner } = await loadFixture(
        deployMarketplaceFixture
      );
      await hardhatNFT.safeMint(owner.address, "CIDIMAGE", "CIDMETA");
      await hardhatNFT.approve(hardhatMarketplace.address, 0);
      await hardhatMarketplace.createMarketItem(
        hardhatNFT.address,
        0,
        parseUnits("0.001", "ether")
      );
      //Deleta o item, logo ele não esta mais no market.
      await hardhatMarketplace.deleteMarketItem(0);
      //Tenta deletar ele novamente sendo que ele não está mais no market.
      await expect(hardhatMarketplace.deleteMarketItem(0)).to.be.revertedWith(
        "item must be on market"
      );
    });
    it("A operação não deve acontecer se sender não for o owner do NFT.", async function () {
      const { hardhatNFT, hardhatMarketplace, owner, addr1 } =
        await loadFixture(deployMarketplaceFixture);
      await hardhatNFT.safeMint(owner.address, "CIDIMAGE", "CIDMETA");
      await hardhatNFT.approve(hardhatMarketplace.address, 0);
      await hardhatMarketplace.createMarketItem(
        hardhatNFT.address,
        0,
        parseUnits("0.001", "ether")
      );

      //Tenta deletar ele com outro usuário
      await expect(
        hardhatMarketplace.connect(addr1).deleteMarketItem(0)
      ).to.be.revertedWith("sender must be the owner");
    });
  });

  describe("Testes com a função createMarketSale()", function () {
    it("O item comprado deve ser transferido do vendedor para o comprador", async function () {
      const { hardhatToken, hardhatNFT, hardhatMarketplace, addr1, owner } =
        await loadFixture(deployMarketplaceFixture);
      //Cria um market item.
      await hardhatNFT.safeMint(owner.address, "CIDIMAGE", "CIDMETA");
      await hardhatNFT.approve(hardhatMarketplace.address, 0);
      await hardhatMarketplace.createMarketItem(
        hardhatNFT.address,
        0,
        parseUnits("0.001", "ether")
      );

      //Compra ele com o addr1
      await hardhatMarketplace
        .connect(addr1)
        .createMarketSale(hardhatNFT.address, 0, {
          value: ethers.utils.parseEther("0.001"),
        });
      //Confere se ele agora é do addr1.
      expect(await hardhatNFT.ownerOf(0)).to.equal(addr1.address);
    });
    it("O saldo do vendedor deve ser acrescido do valor da venda", async function () {
      const { hardhatToken, hardhatNFT, hardhatMarketplace, addr1, owner } =
        await loadFixture(deployMarketplaceFixture);

      const price = "0.001";
      const balanceOfOwner = await hardhatToken.balanceOf(owner.address);
      const total = balanceOfOwner.add(parseEther(price));

      //Cria um market item com o owner.
      await hardhatNFT.safeMint(owner.address, "CIDIMAGE", "CIDMETA");
      await hardhatNFT.approve(hardhatMarketplace.address, 0);
      await hardhatMarketplace.createMarketItem(
        hardhatNFT.address,
        0,
        parseUnits(price, "ether")
      );

      //Comprao item com o addr1
      await hardhatMarketplace
        .connect(addr1)
        .createMarketSale(hardhatNFT.address, 0, {
          value: parseEther(price),
        });

      const newBalance = await hardhatToken.balanceOf(owner.address);
      expect(newBalance).to.equal(total);
    });
    it("O valor da compra deve ser debitado do saldo do comprador", async function () {
      const { hardhatToken, hardhatNFT, hardhatMarketplace, addr1, owner } =
        await loadFixture(deployMarketplaceFixture);

      const price = "0.001";
      const balanceOfAddr1 = await hardhatToken.balanceOf(addr1.address);
      const total = balanceOfAddr1.sub(parseEther(price));

      //Cria um market item com o owner.
      await hardhatNFT.safeMint(owner.address, "CIDIMAGE", "CIDMETA");
      await hardhatNFT.approve(hardhatMarketplace.address, 0);
      await hardhatMarketplace.createMarketItem(
        hardhatNFT.address,
        0,
        parseUnits(price, "ether")
      );

      //Comprao item com o addr1
      await hardhatMarketplace
        .connect(addr1)
        .createMarketSale(hardhatNFT.address, 0, {
          value: parseEther(price),
        });

      const newBalance = await hardhatToken.balanceOf(addr1.address);
      expect(newBalance).to.equal(total);
    });
    it("O a venda deve ser recusada se o valor for diferente do price", async function () {
      const { hardhatToken, hardhatNFT, hardhatMarketplace, addr1, owner } =
        await loadFixture(deployMarketplaceFixture);
      //Cria um market item.
      await hardhatNFT.safeMint(owner.address, "CIDIMAGE", "CIDMETA");
      await hardhatNFT.approve(hardhatMarketplace.address, 0);
      await hardhatMarketplace.createMarketItem(
        hardhatNFT.address,
        0,
        parseUnits("0.001", "ether")
      );

      //A compra tem que ser recusada

      await expect(
        hardhatMarketplace
          .connect(addr1)
          .createMarketSale(hardhatNFT.address, 0, {
            value: ethers.utils.parseEther("0.002"),
          })
      ).to.be.revertedWith("Please submit the asking price");
    });
    it("O item vendido deve ter o state = 1 (Released)", async function () {
      const { hardhatToken, hardhatNFT, hardhatMarketplace, addr1, owner } =
        await loadFixture(deployMarketplaceFixture);

      const price = "0.001";

      //Cria um market item com o owner.
      await hardhatNFT.safeMint(owner.address, "CIDIMAGE", "CIDMETA");
      await hardhatNFT.approve(hardhatMarketplace.address, 0);
      await hardhatMarketplace.createMarketItem(
        hardhatNFT.address,
        0,
        parseUnits(price, "ether")
      );

      //Comprao item com o addr1
      await hardhatMarketplace
        .connect(addr1)
        .createMarketSale(hardhatNFT.address, 0, {
          value: parseEther(price),
        });

      const myCreated = await hardhatMarketplace.fetchMyCreatedItems();
      expect(myCreated[0].state).to.equal(1);
    });
    it("O item vendido deve ter o price igual o price da venda", async function () {
      const { hardhatToken, hardhatNFT, hardhatMarketplace, addr1, owner } =
        await loadFixture(deployMarketplaceFixture);

      const price = "0.001";

      //Cria um market item com o owner.
      await hardhatNFT.safeMint(owner.address, "CIDIMAGE", "CIDMETA");
      await hardhatNFT.approve(hardhatMarketplace.address, 0);
      await hardhatMarketplace.createMarketItem(
        hardhatNFT.address,
        0,
        parseUnits(price, "ether")
      );

      //Comprao item com o addr1
      await hardhatMarketplace
        .connect(addr1)
        .createMarketSale(hardhatNFT.address, 0, {
          value: parseEther(price),
        });

      const myCreated = await hardhatMarketplace.fetchMyCreatedItems();
      expect(myCreated[0].price).to.equal(parseEther(price));
    });
  });

  describe("Testes com a função fetchActiveItems()", function () {
    it("Os items retornados pelo fetchActiveItems devem possuir state = Stated.Created.", async function () {
      const { hardhatNFT, hardhatMarketplace } = await loadFixture(
        deployMarketplaceWith5NFTsOnMarketFixture
      );
      //Confere que possui 5 items no market
      const itemsOnMarket = await hardhatMarketplace.fetchActiveItems();
      itemsOnMarket.forEach((item) => expect(item.state).to.equal(0));
    });

    it("Cria 5 MarketItems. A função fetchActiveItems deve retornar 5.", async function () {
      const { hardhatNFT, hardhatMarketplace } = await loadFixture(
        deployMarketplaceWith5NFTsOnMarketFixture
      );
      //Confere que possui 5 items no market
      const itemsOnMarket = await hardhatMarketplace.fetchActiveItems();
      expect(itemsOnMarket.length).to.equal(5);
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

  describe("Testes com a função fetchMyPurchasedItems()", function () {
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

  describe("Testes com a função fetchMyCreatedItems()", function () {
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

      expect(myCreatedItems.length).to.equal(5);
      expect(myCreatedItems[0].state).to.equal(0);
      expect(myCreatedItems[1].state).to.equal(0);
      expect(myCreatedItems[2].state).to.equal(1);
      expect(myCreatedItems[3].state).to.equal(1);
      expect(myCreatedItems[4].state).to.equal(0);
    });
  });
});
