const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");

describe("NFT contract", function () {
  async function deployTokenFixture() {
    const NFT = await ethers.getContractFactory("METANONFT");
    const [owner, addr1, addr2] = await ethers.getSigners();

    const hardhatNFT = await NFT.deploy();

    await hardhatNFT.deployed();

    // Fixtures can return anything you consider useful for your tests
    return { NFT, hardhatNFT, owner, addr1, addr2 };
  }

  describe("Deployent", function () {
    it("Verificar se foi setado o verdadeiro owner", function () {});
  });

  describe("Setups", function () {
    it("Transferência do NFT entre contas", function () {});
    it("Setar nova base URI", function () {});
    it("Setar nova base METADA", function () {});
  });

  describe("Transactions", function () {
    it("Transferência do NFT entre contas (safeTransferFrom()", function () {});
    it("Transferência do NFT entre contas overload (safeTransferFrom()", function () {});
    it("Emitir event de transferência", function () {});
    it("Falhar se a conta a receber o NFT não existe", function () {});
    it("Transferir a propriedade do NFT (transferOwnership)", function () {});
  });

  it("Deve fazer o mint do NFT e verificar o tokenURI", async function () {
    const { hardhatNFT, owner } = await loadFixture(deployTokenFixture);

    const mint = await hardhatNFT.safeMint(
      owner.address,
      "CIDIMAGE",
      "CIDMETA"
    );
    const tokenURI = await hardhatNFT.tokenURI(0);
    expect(tokenURI).to.equal("https://ipfs.io/ipfs/CIDIMAGE");
  });
});
