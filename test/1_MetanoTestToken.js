const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { parseUnits, formatEther } = require("ethers/lib/utils");

describe("MetanoTestToken contract", function () {
  async function deployTokenFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("MetanoTestToken");
    const hardhatToken = await Token.deploy();
    await hardhatToken.deployed();
    return { hardhatToken, owner, addr1, addr2 };
  }

  describe("Deployment", function () {
    it("Faz o deploy do token e confere o address do owner", async function () {
      const { hardhatToken, owner } = await loadFixture(deployTokenFixture);
      expect(await hardhatToken.owner()).to.equal(owner.address);
    });
    it("Transfere 1000 tokens do owner pro addr1. Função transfer().", async function () {
      const { hardhatToken, owner, addr1 } = await loadFixture(
        deployTokenFixture
      );
      const balance = formatEther(await hardhatToken.balanceOf(owner.address));
      const ammount = parseUnits("1000", "ether");
      await hardhatToken.transfer(addr1.address, ammount);
      const newBal = formatEther(await hardhatToken.balanceOf(owner.address));
      const addr1Bal = formatEther(await hardhatToken.balanceOf(addr1.address));

      expect(parseInt(newBal)).to.equal(balance - 1000);
      expect(addr1Bal).to.equal("1000.0");
    });
    it("Aprova um allowance pro owner poder transferir fundos do addr1.", async function () {
      const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );
      const ammount = parseUnits("200000", "ether");
      //Confere o allowance do addr1 para o owner que deve ser 0.
      const allowance = await hardhatToken.allowance(
        addr1.address,
        owner.address
      );
      expect(allowance).to.equal(0);
      //Conecta no addr1 e permite o allowance pro owner.
      await hardhatToken.connect(addr1).approve(owner.address, ammount);
      const newAllowance = await hardhatToken.allowance(
        addr1.address,
        owner.address
      );
      expect(newAllowance).to.equal(ammount);
    });
    it("Transfere de um conta addr1 para uma addr2 através da função transferFrom chamada pelo owner", async function () {
      const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
        deployTokenFixture
      );
      //transfer do owner pro addr1
      const ammountToAddr1 = parseUnits("1000", "ether");
      await hardhatToken.transfer(addr1.address, ammountToAddr1);
      //Seta o allowance pro owner poder transferir do addr1.
      const ammount = parseUnits("500.0", "ether");
      await hardhatToken.connect(addr1).approve(owner.address, ammount);
      //transferFrom do addr1 pro addr2
      const ammount2 = parseUnits("500", "ether");
      await hardhatToken.transferFrom(addr1.address, addr2.address, ammount2);
      expect(await hardhatToken.balanceOf(addr2.address)).to.equal(ammount2);
    });
  });
});
